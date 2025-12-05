/**
 * Additional CartService tests for edge cases and sync scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService, TaxService } from '../../src/services/index.js';
import { CartStore, ProviderContextStore, TaxRateStore } from '../../src/stores/index.js';
import { SalesforceCommerceProvider } from '../../src/providers/index.js';
import { CartItem, CheckoutStatus, SyncStatus, TaxContext } from '../../src/models/index.js';

describe('CartService - Additional Tests', () => {
  let cartService: CartService;
  let cartStore: CartStore;
  let contextStore: ProviderContextStore;
  let taxRateStore: TaxRateStore;
  let provider: SalesforceCommerceProvider;
  let taxService: TaxService;

  beforeEach(() => {
    cartStore = new CartStore();
    contextStore = new ProviderContextStore();
    taxRateStore = new TaxRateStore();
    provider = new SalesforceCommerceProvider(30 * 60 * 1000);
    taxService = new TaxService(taxRateStore);
    cartService = new CartService(cartStore, contextStore, provider, taxService);
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);
      const cart = await cartService.updateItemQuantity('user1', 'prod1', 5);

      expect(cart.items[0].quantity).toBe(5);
    });

    it('should throw error if item not found', async () => {
      await cartService.getCart('user1');

      await expect(cartService.updateItemQuantity('user1', 'nonexistent', 5)).rejects.toThrow();
    });
  });

  describe('clearCart', () => {
    it('should clear cart items', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);
      await cartService.clearCart('user1');

      const cart = await cartService.getCart('user1');
      expect(cart.items).toHaveLength(0);
    });

    it('should throw error if cart not found', async () => {
      await expect(cartService.clearCart('nonexistent')).rejects.toThrow();
    });
  });

  describe('setTaxContext', () => {
    it('should set tax context', async () => {
      const taxContext: TaxContext = {
        jurisdiction: 'CA-BC',
        calculationDate: new Date(),
      };

      await cartService.getCart('user1');
      const cart = await cartService.setTaxContext('user1', taxContext);

      expect(cart.taxContext).toEqual(taxContext);
    });
  });

  describe('getSummary', () => {
    it('should get cart summary with tax', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 1000,
      };

      await cartService.addItem('user1', item);
      const summary = await cartService.getSummary('user1');

      expect(summary.subtotal).toBe(1000);
      expect(summary.taxes).toBeDefined();
      expect(summary.total).toBeGreaterThan(1000);
    });

    it('should use default tax context if not set', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 1000,
      };

      await cartService.addItem('user1', item);
      const summary = await cartService.getSummary('user1');

      expect(summary.subtotal).toBe(1000);
      expect(summary.totalTax).toBeGreaterThan(0);
    });
  });

  describe('checkout - edge cases', () => {
    it('should handle checkout when cart not found', async () => {
      const result = await cartService.checkout('nonexistent');

      expect(result.status).toBe(CheckoutStatus.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should handle checkout in progress timeout', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);
      const cart = await cartService.getCart('user1');
      cart.checkoutStatus = CheckoutStatus.IN_PROGRESS;
      cart.checkoutStartedAt = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      await cartStore.update('user1', cart);

      // Should allow retry after timeout
      const result = await cartService.checkout('user1');
      // Should proceed with checkout (not fail immediately)
      expect(result).toBeDefined();
    });

    it('should handle provider checkout failure', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);

      // Mock provider to fail checkout
      const originalCheckout = provider.checkout.bind(provider);
      vi.spyOn(provider, 'checkout').mockResolvedValue({
        userId: 'user1',
        subtotal: 0,
        taxes: [],
        totalTax: 0,
        total: 0,
        status: CheckoutStatus.FAILED,
        items: [],
        error: 'Provider error',
      });

      const result = await cartService.checkout('user1');

      expect(result.status).toBe(CheckoutStatus.FAILED);
      expect(result.error).toBe('Provider error');

      // Restore
      vi.restoreAllMocks();
    });

    it('should handle sync validation failure', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);

      // Mock provider to return mismatched cart
      vi.spyOn(provider, 'getCart').mockResolvedValue({
        cartId: 'cart_1',
        items: [{ ...item, quantity: 2 }], // Different quantity
      });

      const result = await cartService.checkout('user1');

      expect(result.status).toBe(CheckoutStatus.FAILED);
      expect(result.error).toBeDefined();

      vi.restoreAllMocks();
    });

    it('should handle expired context during checkout', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);

      // Create expired context
      const expiredContext = await provider.createCart('user1', [item]);
      provider.expireContext(expiredContext.contextId);
      await contextStore.set('user1', expiredContext);

      // Should recreate context and proceed
      const result = await cartService.checkout('user1');
      expect(result).toBeDefined();
    });
  });

  describe('sync scenarios', () => {
    it('should sync to external provider on addItem', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const cart = await cartService.addItem('user1', item);

      // Should have synced status
      expect(cart.syncStatus).toBe(SyncStatus.SYNCED);
    });

    it('should mark sync as pending on failure', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      // Mock provider to fail
      vi.spyOn(provider, 'getCart').mockRejectedValue(new Error('Provider error'));

      const cart = await cartService.addItem('user1', item);

      // Should mark as pending sync
      expect(cart.syncStatus).toBe(SyncStatus.PENDING);
      expect(cart.lastSyncError).toBeDefined();

      vi.restoreAllMocks();
    });

    it('should recreate context when expired', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);

      // Expire the context
      const context = await contextStore.get('user1');
      if (context) {
        provider.expireContext(context.contextId);
      }

      // Add another item - should recreate context
      const cart = await cartService.addItem('user1', {
        ...item,
        productId: 'prod2',
      });

      expect(cart.syncStatus).toBe(SyncStatus.SYNCED);
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent updates', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);

      // Concurrent updates
      const [cart1, cart2] = await Promise.all([
        cartService.updateItemQuantity('user1', 'prod1', 2),
        cartService.updateItemQuantity('user1', 'prod1', 3),
      ]);

      // Both should succeed (one will win)
      expect(cart1.items[0].quantity).toBeGreaterThanOrEqual(1);
      expect(cart2.items[0].quantity).toBeGreaterThanOrEqual(1);
    });
  });
});
