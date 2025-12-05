/**
 * Salesforce Commerce Provider (Test Double)
 * Simulates Salesforce B2C Commerce Cloud cart API behavior
 */

import { CommerceProviderInterface } from './commerce-provider.interface.js';
import {
  CartItem,
  CheckoutResult,
  ExternalCartContext,
  ExternalCart,
  ExternalProviderContextExpiredError,
  CheckoutStatus,
} from '../models/index.js';
import {
  ErrorMessages,
  ErrorCode,
  ProviderConstants,
} from '../models/error-constants.js';

interface SalesforceCart {
  cartId: string;
  contextId: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  expiresAt: Date;
}

export class SalesforceCommerceProvider implements CommerceProviderInterface {
  private carts: Map<string, SalesforceCart> = new Map();
  private contextExpiryMs: number;

  constructor(contextExpiryMs: number = 30 * 60 * 1000) {
    // Default: 30 minutes
    this.contextExpiryMs = contextExpiryMs;
  }

  async createCart(userId: string, items: CartItem[]): Promise<ExternalCartContext> {
    const contextId = this.generateId('ctx');
    const cartId = this.generateId('cart');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.contextExpiryMs);

    const cart: SalesforceCart = {
      cartId,
      contextId,
      userId,
      items: [...items],
      createdAt: now,
      expiresAt,
    };

    this.carts.set(contextId, cart);

    return {
      contextId,
      cartId,
      provider: 'salesforce',
      createdAt: now,
      expiresAt,
      isExpired: false,
    };
  }

  async addItem(contextId: string, item: CartItem): Promise<void> {
    const cart = await this.getCartByContext(contextId);

    // Check if item already exists, update quantity if so (idempotent)
    const existingIndex = cart.items.findIndex((i) => i.productId === item.productId);

    if (existingIndex >= 0) {
      cart.items[existingIndex] = item;
    } else {
      cart.items.push(item);
    }
  }

  async removeItem(contextId: string, productId: string): Promise<void> {
    const cart = await this.getCartByContext(contextId);

    const index = cart.items.findIndex((item) => item.productId === productId);

    // Idempotent: removing non-existent item doesn't error
    if (index >= 0) {
      cart.items.splice(index, 1);
    }
  }

  async getCart(contextId: string): Promise<ExternalCart> {
    const cart = await this.getCartByContext(contextId);

    return {
      cartId: cart.cartId,
      items: [...cart.items],
    };
  }

  async validateContext(contextId: string): Promise<boolean> {
    const cart = this.carts.get(contextId);

    if (!cart) {
      return false;
    }

    if (this.isExpired(cart.expiresAt)) {
      // Clean up expired cart
      this.carts.delete(contextId);
      return false;
    }

    return true;
  }

  async checkout(contextId: string): Promise<CheckoutResult> {
    try {
      const cart = await this.getCartByContext(contextId);

      if (cart.items.length === 0) {
        // Return failed result instead of throwing
        return {
          userId: cart.userId,
          subtotal: 0,
          taxes: [],
          totalTax: 0,
          total: 0,
          status: CheckoutStatus.FAILED,
          items: [],
          error: ErrorMessages[ErrorCode.EMPTY_CART],
        };
      }

      const orderId = this.generateId('order');
      const subtotal = this.calculateTotal(cart.items);

      const result: CheckoutResult = {
        orderId,
        userId: cart.userId,
        subtotal,
        taxes: [], // Tax calculation happens in CartService
        totalTax: 0,
        total: subtotal,
        status: CheckoutStatus.COMPLETED,
        items: [...cart.items],
        completedAt: new Date(),
      };

      // Clean up cart after checkout
      this.carts.delete(contextId);

      return result;
    } catch (error) {
      // Return failed result for any errors
      return {
        userId: ProviderConstants.UNKNOWN_USER_ID,
        subtotal: 0,
        taxes: [],
        totalTax: 0,
        total: 0,
        status: CheckoutStatus.FAILED,
        items: [],
        error:
          error instanceof Error
            ? error.message
            : ErrorMessages[ErrorCode.CHECKOUT_ERROR],
      };
    }
  }

  // Helper methods

  private async getCartByContext(contextId: string): Promise<SalesforceCart> {
    const cart = this.carts.get(contextId);

    if (!cart) {
      throw new ExternalProviderContextExpiredError(contextId);
    }

    if (this.isExpired(cart.expiresAt)) {
      this.carts.delete(contextId);
      throw new ExternalProviderContextExpiredError(contextId);
    }

    return cart;
  }

  private isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  private calculateTotal(items: CartItem[]): number {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.07; // 7% tax rate
    return subtotal + tax;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Testing utility methods

  /**
   * Get current cart count (for testing)
   */
  getCartCount(): number {
    return this.carts.size;
  }

  /**
   * Clear all carts (for testing)
   */
  clearAll(): void {
    this.carts.clear();
  }

  /**
   * Manually expire a context (for testing)
   */
  expireContext(contextId: string): void {
    const cart = this.carts.get(contextId);
    if (cart) {
      cart.expiresAt = new Date(Date.now() - 1000); // Set to past
    }
  }
}
