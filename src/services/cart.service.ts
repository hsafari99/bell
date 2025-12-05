/**
 * CartService
 *
 * Core business logic for cart operations with:
 * - Concurrency control (per-user operation queue)
 * - External provider synchronization
 * - Checkout idempotency
 * - Automatic context recreation
 */

import {
  Cart,
  CartItem,
  CheckoutResult,
  ExternalCartContext,
  CartNotFoundError,
  ItemNotFoundError,
  CheckoutError,
  TaxContext,
  CartTotals,
  SyncStatus,
  CheckoutStatus,
} from '../models/index.js';
import {
  ErrorMessages,
  ErrorCode,
  ProviderConstants,
} from '../models/error-constants.js';
import { CartStore, ProviderContextStore } from '../stores/index.js';
import { CommerceProviderInterface } from '../providers/index.js';
import { CartOperationQueue, validateCartItem, validateQuantityUpdate } from '../utils/index.js';
import { TaxService } from './tax.service.js';

export class CartService {
  private operationQueue: CartOperationQueue;

  constructor(
    private cartStore: CartStore,
    private contextStore: ProviderContextStore,
    private provider: CommerceProviderInterface,
    private taxService: TaxService
  ) {
    this.operationQueue = new CartOperationQueue();
  }

  /**
   * Get or create cart for a user
   */
  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartStore.get(userId);

    if (!cart) {
      cart = this.createNewCart(userId);
      await this.cartStore.set(userId, cart);
    } else {
      // Update last accessed timestamp
      cart.lastAccessedAt = new Date();
      await this.cartStore.update(userId, cart);
    }

    return cart;
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, item: CartItem): Promise<Cart> {
    return this.operationQueue.enqueue(userId, async () => {
      validateCartItem(item);

      const cart = await this.getCart(userId);

      // Check if item already exists, update quantity if so
      const existingIndex = cart.items.findIndex((i) => i.productId === item.productId);

      if (existingIndex >= 0) {
        cart.items[existingIndex] = item;
      } else {
        cart.items.push(item);
      }

      await this.cartStore.update(userId, cart);

      // Sync to external provider (best effort)
      await this.syncToExternalProvider(cart);

      return cart;
    });
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<Cart> {
    return this.operationQueue.enqueue(userId, async () => {
      validateQuantityUpdate(quantity);

      const cart = await this.getCart(userId);
      const itemIndex = cart.items.findIndex((i) => i.productId === productId);

      if (itemIndex < 0) {
        throw new ItemNotFoundError(productId);
      }

      cart.items[itemIndex].quantity = quantity;
      await this.cartStore.update(userId, cart);

      // Sync to external provider (best effort)
      await this.syncToExternalProvider(cart);

      return cart;
    });
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, productId: string): Promise<Cart> {
    return this.operationQueue.enqueue(userId, async () => {
      const cart = await this.getCart(userId);
      const itemIndex = cart.items.findIndex((i) => i.productId === productId);

      if (itemIndex < 0) {
        throw new ItemNotFoundError(productId);
      }

      cart.items.splice(itemIndex, 1);
      await this.cartStore.update(userId, cart);

      // Sync to external provider (best effort)
      await this.syncToExternalProvider(cart);

      return cart;
    });
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId: string): Promise<void> {
    return this.operationQueue.enqueue(userId, async () => {
      const cart = await this.cartStore.get(userId);

      if (!cart) {
        throw new CartNotFoundError();
      }

      cart.items = [];
      await this.cartStore.update(userId, cart);

      // Clear external context
      await this.contextStore.delete(userId);
    });
  }

  /**
   * Set tax context for cart
   */
  async setTaxContext(userId: string, taxContext: TaxContext): Promise<Cart> {
    return this.operationQueue.enqueue(userId, async () => {
      const cart = await this.getCart(userId);
      cart.taxContext = taxContext;
      await this.cartStore.update(userId, cart);
      return cart;
    });
  }

  /**
   * Get cart summary with tax calculations
   */
  async getSummary(userId: string): Promise<CartTotals> {
    const cart = await this.getCart(userId);

    // Use cart's tax context or default
    const taxContext = cart.taxContext || this.getDefaultTaxContext();

    // Calculate tax
    const taxResult = await this.taxService.calculateTax(cart.items, taxContext);

    return {
      subtotal: taxResult.subtotal,
      taxes: taxResult.taxes,
      totalTax: taxResult.totalTax,
      total: taxResult.total,
    };
  }

  /**
   * Checkout with idempotency - returns result instead of throwing
   */
  async checkout(userId: string): Promise<CheckoutResult> {
    return this.operationQueue.enqueue(userId, async () => {
      const cart = await this.cartStore.get(userId);

      if (!cart) {
        return {
          userId,
          subtotal: 0,
          taxes: [],
          totalTax: 0,
          total: 0,
          status: CheckoutStatus.FAILED,
          items: [],
          error: ErrorMessages[ErrorCode.CART_NOT_FOUND],
        };
      }

      // Idempotency guard: check if already completed
      if (cart.checkoutStatus === CheckoutStatus.COMPLETED) {
        if (cart.checkoutResult) {
          // Return cached result
          return cart.checkoutResult;
        }
        return {
          userId,
          subtotal: 0,
          taxes: [],
          totalTax: 0,
          total: 0,
          status: CheckoutStatus.FAILED,
          items: cart.items,
          error: ErrorMessages.CART_ALREADY_CHECKED_OUT,
        };
      }

      // Check if checkout in progress
      if (cart.checkoutStatus === CheckoutStatus.IN_PROGRESS) {
        const elapsed = cart.checkoutStartedAt
          ? Date.now() - cart.checkoutStartedAt.getTime()
          : Infinity;

        if (elapsed < 60000) {
          // 1 minute timeout
          return {
            userId,
            subtotal: 0,
            taxes: [],
            totalTax: 0,
            total: 0,
            status: CheckoutStatus.FAILED,
            items: cart.items,
            error: ErrorMessages.CHECKOUT_IN_PROGRESS,
          };
        }
        // Allow retry if stuck for > 1 minute
        console.warn(`Checkout timeout for user ${userId}, allowing retry`);
      }

      // Validate cart not empty
      if (cart.items.length === 0) {
        return {
          userId,
          subtotal: 0,
          taxes: [],
          totalTax: 0,
          total: 0,
          status: CheckoutStatus.FAILED,
          items: [],
          error: ErrorMessages[ErrorCode.EMPTY_CART],
        };
      }

      try {
        // STEP 1: Mark as in_progress BEFORE external call (critical for idempotency)
        cart.checkoutStatus = CheckoutStatus.IN_PROGRESS;
        cart.checkoutStartedAt = new Date();
        await this.cartStore.update(userId, cart);

        // STEP 2: Calculate tax
        const taxContext = cart.taxContext || this.getDefaultTaxContext();
        const taxResult = await this.taxService.calculateTax(cart.items, taxContext);

        // STEP 3: Force full resync before checkout
        const context = await this.createAndSyncContext(userId, cart);

        // STEP 4: Verify sync succeeded
        const externalCart = await this.provider.getCart(context.contextId);
        this.validateCartMatch(cart, externalCart.items);

        // STEP 5: Proceed with checkout in external provider
        const providerResult = await this.provider.checkout(context.contextId);

        // STEP 6: Check if provider checkout failed
        if (providerResult.status === CheckoutStatus.FAILED) {
          // Mark cart as failed
          cart.checkoutStatus = CheckoutStatus.FAILED;
          cart.checkoutError = providerResult.error || ErrorMessages.PROVIDER_CHECKOUT_FAILED;
          await this.cartStore.update(userId, cart);

          // Return failed result with tax calculation
          return {
            userId,
            subtotal: taxResult.subtotal,
            taxes: taxResult.taxes,
            totalTax: taxResult.totalTax,
            total: taxResult.total,
            status: CheckoutStatus.FAILED,
            items: cart.items,
            error: providerResult.error || ErrorMessages.PROVIDER_CHECKOUT_FAILED,
          };
        }

        // STEP 7: Build final successful result with tax breakdown
        const result: CheckoutResult = {
          orderId: providerResult.orderId,
          userId: providerResult.userId,
          subtotal: taxResult.subtotal,
          taxes: taxResult.taxes,
          totalTax: taxResult.totalTax,
          total: taxResult.total,
          status: CheckoutStatus.COMPLETED,
          items: providerResult.items,
          completedAt: providerResult.completedAt,
        };

        // STEP 8: Mark as completed BEFORE cleanup (critical for idempotency)
        cart.checkoutStatus = CheckoutStatus.COMPLETED;
        cart.checkoutCompletedAt = new Date();
        cart.checkoutResult = result;
        await this.cartStore.update(userId, cart);

        // STEP 9: Clean up (best effort - failure doesn't affect idempotency)
        try {
          await this.cartStore.delete(userId);
          await this.contextStore.delete(userId);
        } catch (cleanupError) {
          console.error(`Cleanup failed for user ${userId}:`, cleanupError);
          // Cleanup will happen via scheduled task
        }

        return result;
      } catch (error) {
        // Rollback checkout status on failure and return failed result
        const errorMessage = error instanceof Error ? error.message : ErrorMessages.UNKNOWN_ERROR;
        cart.checkoutStatus = CheckoutStatus.FAILED;
        cart.checkoutError = errorMessage;
        await this.cartStore.update(userId, cart);

        // Calculate tax for failed result
        const taxContext = cart.taxContext || this.getDefaultTaxContext();
        const taxResult = await this.taxService.calculateTax(cart.items, taxContext);

        return {
          userId,
          subtotal: taxResult.subtotal,
          taxes: taxResult.taxes,
          totalTax: taxResult.totalTax,
          total: taxResult.total,
          status: CheckoutStatus.FAILED,
          items: cart.items,
          error: errorMessage,
        };
      }
    });
  }

  // Private helper methods

  private createNewCart(userId: string): Cart {
    return {
      id: `cart_${Date.now()}_${userId}`,
      userId,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      syncStatus: SyncStatus.SYNCED,
      checkoutStatus: CheckoutStatus.PENDING,
    };
  }

  private async syncToExternalProvider(cart: Cart): Promise<void> {
    try {
      const context = await this.getOrCreateContext(cart.userId, cart);

      // Get current external cart state
      const externalCart = await this.provider.getCart(context.contextId);

      // Calculate diff between local and external
      const itemsToAdd = this.findItemsToAdd(cart.items, externalCart.items);
      const itemsToRemove = this.findItemsToRemove(cart.items, externalCart.items);

      // Apply changes
      for (const item of itemsToRemove) {
        await this.provider.removeItem(context.contextId, item.productId);
      }

      for (const item of itemsToAdd) {
        await this.provider.addItem(context.contextId, item);
      }

      // Mark sync successful
      cart.syncStatus = SyncStatus.SYNCED;
      cart.lastSyncedAt = new Date();
    } catch (error) {
      // On failure, mark cart as needs resync
      cart.syncStatus = SyncStatus.PENDING;
      cart.lastSyncError = error instanceof Error ? error.message : ErrorMessages.UNKNOWN_ERROR;

      console.error(`Sync failed for user ${cart.userId}:`, error);
      // Don't fail the user operation - local state is still updated
      // Retry will happen on next critical operation (checkout)
    }
  }

  private async getOrCreateContext(userId: string, cart: Cart): Promise<ExternalCartContext> {
    let context = await this.contextStore.get(userId);

    if (!context) {
      return this.createAndSyncContext(userId, cart);
    }

    // Validate context
    const isValid = await this.provider.validateContext(context.contextId);
    if (!isValid) {
      return this.createAndSyncContext(userId, cart);
    }

    return context;
  }

  private async createAndSyncContext(userId: string, cart: Cart): Promise<ExternalCartContext> {
    const context = await this.provider.createCart(userId, cart.items);
    await this.contextStore.set(userId, context);
    cart.externalCartId = context.contextId;
    return context;
  }

  private findItemsToAdd(localItems: CartItem[], externalItems: CartItem[]): CartItem[] {
    return localItems.filter(
      (localItem) =>
        !externalItems.find((extItem) => extItem.productId === localItem.productId) ||
        externalItems.find(
          (extItem) =>
            extItem.productId === localItem.productId && extItem.quantity !== localItem.quantity
        )
    );
  }

  private findItemsToRemove(localItems: CartItem[], externalItems: CartItem[]): CartItem[] {
    return externalItems.filter(
      (extItem) => !localItems.find((localItem) => localItem.productId === extItem.productId)
    );
  }

  private validateCartMatch(cart: Cart, externalItems: CartItem[]): void {
    if (cart.items.length !== externalItems.length) {
      throw new CheckoutError(ErrorMessages.CART_SYNC_VALIDATION_FAILED_ITEM_COUNT);
    }

    for (const item of cart.items) {
      const extItem = externalItems.find((e) => e.productId === item.productId);
      if (!extItem || extItem.quantity !== item.quantity) {
        throw new CheckoutError(ErrorMessages.CART_SYNC_VALIDATION_FAILED_ITEM_MISMATCH);
      }
    }
  }

  private getDefaultTaxContext(): TaxContext {
    // Default to Ontario, Canada if no tax context is set
    return {
      jurisdiction: ProviderConstants.DEFAULT_JURISDICTION,
      calculationDate: new Date(),
    };
  }
}
