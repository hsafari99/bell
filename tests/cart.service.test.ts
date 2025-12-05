/**
 * CartService unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CartService, TaxService } from '../src/services/index.js';
import { CartStore, ProviderContextStore, TaxRateStore } from '../src/stores/index.js';
import { SalesforceCommerceProvider } from '../src/providers/index.js';
import { CartItem, CheckoutStatus } from '../src/models/index.js';

describe('CartService', () => {
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
    provider = new SalesforceCommerceProvider(30 * 60 * 1000); // 30 min expiry
    taxService = new TaxService(taxRateStore);
    cartService = new CartService(cartStore, contextStore, provider, taxService);
  });

  describe('getCart', () => {
    it('should create a new cart if none exists', async () => {
      const cart = await cartService.getCart('user1');

      expect(cart).toBeDefined();
      expect(cart.userId).toBe('user1');
      expect(cart.items).toEqual([]);
      expect(cart.checkoutStatus).toBe('pending');
    });

    it('should return existing cart', async () => {
      const cart1 = await cartService.getCart('user1');
      const cart2 = await cartService.getCart('user1');

      expect(cart1.id).toBe(cart2.id);
    });
  });

  describe('addItem', () => {
    it('should add item to cart', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const cart = await cartService.addItem('user1', item);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toEqual(item);
    });

    it('should update quantity if item already exists', async () => {
      const item1: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const item2: CartItem = {
        ...item1,
        quantity: 2,
      };

      await cartService.addItem('user1', item1);
      const cart = await cartService.addItem('user1', item2);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });

    it('should validate item data', async () => {
      const invalidItem: any = {
        productId: '',
        name: 'Test',
        type: 'invalid',
        quantity: -1,
        price: -100,
      };

      await expect(cartService.addItem('user1', invalidItem)).rejects.toThrow();
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);
      const cart = await cartService.removeItem('user1', 'prod1');

      expect(cart.items).toHaveLength(0);
    });

    it('should throw error if item not found', async () => {
      await cartService.getCart('user1');

      await expect(cartService.removeItem('user1', 'nonexistent')).rejects.toThrow(
        'Item not found in cart'
      );
    });
  });

  describe('checkout', () => {
    beforeEach(async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await cartService.addItem('user1', item);
    });

    it('should complete checkout successfully', async () => {
      const result = await cartService.checkout('user1');

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.userId).toBe('user1');
      expect(result.status).toBe(CheckoutStatus.COMPLETED);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should return failed result for empty cart', async () => {
      await cartService.clearCart('user1');

      const result = await cartService.checkout('user1');

      expect(result.status).toBe(CheckoutStatus.FAILED);
      expect(result.error).toContain('empty cart');
    });

    it('should prevent duplicate checkout (idempotency)', async () => {
      // First checkout
      const result1 = await cartService.checkout('user1');
      expect(result1.status).toBe(CheckoutStatus.COMPLETED);

      // Try to checkout again - cart should be deleted after successful checkout
      const result2 = await cartService.checkout('user1');
      expect(result2.status).toBe(CheckoutStatus.FAILED);
      expect(result2.error).toContain('Cart not found');
    });

    it('should handle concurrent checkout requests', async () => {
      // Simulate double-click
      const checkout1 = cartService.checkout('user1');
      const checkout2 = cartService.checkout('user1');

      const [result1, result2] = await Promise.all([checkout1, checkout2]);

      // One should succeed, one should fail or return same result
      const completedResults = [result1, result2].filter(r => r.status === CheckoutStatus.COMPLETED);
      const failedResults = [result1, result2].filter(r => r.status === CheckoutStatus.FAILED);

      // At least one should succeed
      expect(completedResults.length).toBeGreaterThanOrEqual(1);

      // If both completed, they should return the same order ID (idempotent)
      if (completedResults.length === 2) {
        expect(completedResults[0].orderId).toBe(completedResults[1].orderId);
      }

      // If one failed, it should be because checkout is in progress or cart not found
      if (failedResults.length > 0) {
        expect(failedResults[0].error).toMatch(/in progress|not found/i);
      }
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent operations for same user', async () => {
      const item1: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const item2: CartItem = {
        productId: 'prod2',
        name: 'Plan',
        type: 'plan',
        quantity: 1,
        price: 79.99,
      };

      // Add items concurrently
      await Promise.all([
        cartService.addItem('user1', item1),
        cartService.addItem('user1', item2),
      ]);

      const cart = await cartService.getCart('user1');
      expect(cart.items).toHaveLength(2);
    });

    it('should handle concurrent operations for different users', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      // Add items for different users concurrently
      await Promise.all([
        cartService.addItem('user1', item),
        cartService.addItem('user2', item),
        cartService.addItem('user3', item),
      ]);

      const cart1 = await cartService.getCart('user1');
      const cart2 = await cartService.getCart('user2');
      const cart3 = await cartService.getCart('user3');

      expect(cart1.items).toHaveLength(1);
      expect(cart2.items).toHaveLength(1);
      expect(cart3.items).toHaveLength(1);
    });
  });
});
