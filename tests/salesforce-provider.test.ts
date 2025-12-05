/**
 * SalesforceCommerceProvider tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalesforceCommerceProvider } from '../src/providers/salesforce-commerce-provider.js';
import { CartItem, ExternalProviderContextExpiredError } from '../src/models/index.js';

describe('SalesforceCommerceProvider', () => {
  let provider: SalesforceCommerceProvider;

  beforeEach(() => {
    provider = new SalesforceCommerceProvider(1000); // 1 second expiry for testing
  });

  describe('createCart', () => {
    it('should create a new cart', async () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 999.99,
        },
      ];

      const context = await provider.createCart('user1', items);

      expect(context.contextId).toBeDefined();
      expect(context.cartId).toBeDefined();
      expect(context.provider).toBe('salesforce');
      expect(context.isExpired).toBe(false);
      expect(context.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('context expiry', () => {
    it('should mark context as expired after timeout', async () => {
      const items: CartItem[] = [];
      const context = await provider.createCart('user1', items);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const isValid = await provider.validateContext(context.contextId);
      expect(isValid).toBe(false);
    });

    it('should throw error when accessing expired context', async () => {
      const items: CartItem[] = [];
      const context = await provider.createCart('user1', items);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await expect(provider.getCart(context.contextId)).rejects.toThrow(
        ExternalProviderContextExpiredError
      );
    });

    it('should allow manual context expiry', async () => {
      const items: CartItem[] = [];
      const context = await provider.createCart('user1', items);

      provider.expireContext(context.contextId);

      await expect(provider.getCart(context.contextId)).rejects.toThrow(
        ExternalProviderContextExpiredError
      );
    });
  });

  describe('cart operations', () => {
    it('should add item to cart', async () => {
      const context = await provider.createCart('user1', []);

      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await provider.addItem(context.contextId, item);

      const cart = await provider.getCart(context.contextId);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toEqual(item);
    });

    it('should remove item from cart', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const context = await provider.createCart('user1', [item]);

      await provider.removeItem(context.contextId, 'prod1');

      const cart = await provider.getCart(context.contextId);
      expect(cart.items).toHaveLength(0);
    });

    it('should be idempotent when adding same item', async () => {
      const context = await provider.createCart('user1', []);

      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone 15',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      await provider.addItem(context.contextId, item);
      await provider.addItem(context.contextId, { ...item, quantity: 2 });

      const cart = await provider.getCart(context.contextId);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });
  });

  describe('checkout', () => {
    it('should checkout cart successfully', async () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 999.99,
        },
      ];

      const context = await provider.createCart('user1', items);

      const result = await provider.checkout(context.contextId);

      expect(result.orderId).toBeDefined();
      expect(result.userId).toBe('user1');
      expect(result.status).toBe('completed');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBeGreaterThan(999.99); // Should include tax
    });

    it('should clean up cart after checkout', async () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 999.99,
        },
      ];

      const context = await provider.createCart('user1', items);
      await provider.checkout(context.contextId);

      // Cart should no longer exist
      await expect(provider.getCart(context.contextId)).rejects.toThrow(
        ExternalProviderContextExpiredError
      );
    });

    it('should return failed result for empty cart checkout', async () => {
      const context = await provider.createCart('user1', []);

      const result = await provider.checkout(context.contextId);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle checkout errors gracefully', async () => {
      const context = await provider.createCart('user1', [
        {
          productId: 'prod1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 999.99,
        },
      ]);

      // Manually expire the context to cause an error
      provider.expireContext(context.contextId);

      // Should return failed result instead of throwing
      const result = await provider.checkout(context.contextId);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('validateContext', () => {
    it('should return false for non-existent context', async () => {
      const isValid = await provider.validateContext('nonexistent_context');
      expect(isValid).toBe(false);
    });

    it('should return false and clean up expired context', async () => {
      const context = await provider.createCart('user1', []);
      
      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const isValid = await provider.validateContext(context.contextId);
      expect(isValid).toBe(false);
      
      // Context should be cleaned up
      await expect(provider.getCart(context.contextId)).rejects.toThrow(
        ExternalProviderContextExpiredError
      );
    });
  });

  describe('testing utilities', () => {
    it('should return cart count', async () => {
      expect(provider.getCartCount()).toBe(0);

      await provider.createCart('user1', []);
      expect(provider.getCartCount()).toBe(1);

      await provider.createCart('user2', []);
      expect(provider.getCartCount()).toBe(2);
    });

    it('should clear all carts', async () => {
      await provider.createCart('user1', []);
      await provider.createCart('user2', []);

      expect(provider.getCartCount()).toBe(2);

      provider.clearAll();

      expect(provider.getCartCount()).toBe(0);
    });
  });
});
