/**
 * ProviderContextStore tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderContextStore } from '../../src/stores/provider-context-store.js';
import { ExternalCartContext } from '../../src/models/index.js';

describe('ProviderContextStore', () => {
  let contextStore: ProviderContextStore;

  beforeEach(() => {
    contextStore = new ProviderContextStore();
  });

  describe('get', () => {
    it('should return null for non-existent context', async () => {
      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });

    it('should return context if exists and valid', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
        isExpired: false,
      };

      await contextStore.set('user1', context);
      const result = await contextStore.get('user1');

      expect(result).toEqual(context);
    });

    it('should return null for expired context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isExpired: true,
      };

      await contextStore.set('user1', context);
      const result = await contextStore.get('user1');

      expect(result).toBeNull();
    });

    it('should auto-delete expired context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isExpired: false,
      };

      await contextStore.set('user1', context);
      await contextStore.get('user1'); // This should trigger cleanup

      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context);
      const result = await contextStore.get('user1');

      expect(result).toEqual(context);
    });
  });

  describe('delete', () => {
    it('should delete context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context);
      await contextStore.delete('user1');

      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });

    it('should handle delete of non-existent context', async () => {
      await expect(contextStore.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return false for non-existent context', async () => {
      const result = await contextStore.exists('user1');
      expect(result).toBe(false);
    });

    it('should return true for existing valid context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context);
      const result = await contextStore.exists('user1');

      expect(result).toBe(true);
    });

    it('should return false for expired context', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        isExpired: true,
      };

      await contextStore.set('user1', context);
      const result = await contextStore.exists('user1');

      expect(result).toBe(false);
    });
  });

  describe('entries', () => {
    it('should return iterator over all contexts', async () => {
      const context1: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      const context2: ExternalCartContext = {
        contextId: 'ctx_2',
        cartId: 'cart_2',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context1);
      await contextStore.set('user2', context2);

      const entries = Array.from(contextStore.entries());
      expect(entries).toHaveLength(2);
      expect(entries.map(([userId]) => userId)).toContain('user1');
      expect(entries.map(([userId]) => userId)).toContain('user2');
    });
  });

  describe('size', () => {
    it('should return 0 for empty store', () => {
      expect(contextStore.size()).toBe(0);
    });

    it('should return correct size', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context);
      expect(contextStore.size()).toBe(1);

      await contextStore.set('user2', { ...context, contextId: 'ctx_2', cartId: 'cart_2' });
      expect(contextStore.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all contexts', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        isExpired: false,
      };

      await contextStore.set('user1', context);
      contextStore.clear();

      expect(contextStore.size()).toBe(0);
      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });
  });
});
