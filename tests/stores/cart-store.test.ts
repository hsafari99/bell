/**
 * CartStore tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CartStore } from '../../src/stores/cart-store.js';
import { Cart } from '../../src/models/index.js';

describe('CartStore', () => {
  let cartStore: CartStore;

  beforeEach(() => {
    cartStore = new CartStore();
  });

  describe('get', () => {
    it('should return null for non-existent cart', async () => {
      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });

    it('should return cart if exists', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      const result = await cartStore.get('user1');

      expect(result).toEqual(cart);
    });
  });

  describe('set', () => {
    it('should store cart', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      const result = await cartStore.get('user1');

      expect(result).toEqual(cart);
    });
  });

  describe('update', () => {
    it('should update existing cart', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastAccessedAt: new Date('2024-01-01'),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);

      const updatedCart: Cart = {
        ...cart,
        items: [{ productId: 'prod1', name: 'iPhone', type: 'device', quantity: 1, price: 999.99 }],
      };

      await cartStore.update('user1', updatedCart);
      const result = await cartStore.get('user1');

      expect(result?.items).toHaveLength(1);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.lastAccessedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('should delete cart', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      await cartStore.delete('user1');

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });

    it('should handle delete of non-existent cart', async () => {
      await expect(cartStore.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return false for non-existent cart', async () => {
      const result = await cartStore.exists('user1');
      expect(result).toBe(false);
    });

    it('should return true for existing cart', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      const result = await cartStore.exists('user1');

      expect(result).toBe(true);
    });
  });

  describe('entries', () => {
    it('should return iterator over all carts', async () => {
      const cart1: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      const cart2: Cart = {
        id: 'cart_2',
        userId: 'user2',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart1);
      await cartStore.set('user2', cart2);

      const entries = Array.from(cartStore.entries());
      expect(entries).toHaveLength(2);
      expect(entries.map(([userId]) => userId)).toContain('user1');
      expect(entries.map(([userId]) => userId)).toContain('user2');
    });
  });

  describe('size', () => {
    it('should return 0 for empty store', () => {
      expect(cartStore.size()).toBe(0);
    });

    it('should return correct size', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      expect(cartStore.size()).toBe(1);

      await cartStore.set('user2', { ...cart, id: 'cart_2', userId: 'user2' });
      expect(cartStore.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all carts', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      cartStore.clear();

      expect(cartStore.size()).toBe(0);
      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });
  });
});
