/**
 * CartCleanupService tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CartCleanupService } from '../../src/services/cart-cleanup.service.js';
import { CartStore, ProviderContextStore } from '../../src/stores/index.js';
import { Cart, CheckoutStatus, ExternalCartContext } from '../../src/models/index.js';

describe('CartCleanupService', () => {
  let cleanupService: CartCleanupService;
  let cartStore: CartStore;
  let contextStore: ProviderContextStore;

  beforeEach(() => {
    cartStore = new CartStore();
    contextStore = new ProviderContextStore();
    cleanupService = new CartCleanupService(cartStore, contextStore);
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanupService.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start cleanup service', () => {
      cleanupService.start();
      expect(cleanupService).toBeDefined();
    });

    it('should not start if already running', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      cleanupService.start();
      cleanupService.start();
      expect(consoleSpy).toHaveBeenCalledWith('Cleanup service already running');
      consoleSpy.mockRestore();
    });

    it('should run cleanup immediately on start', async () => {
      vi.useRealTimers();
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastAccessedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      cleanupService.start();

      // Wait a bit for immediate cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
      
      cleanupService.stop();
      vi.useFakeTimers();
    });
  });

  describe('stop', () => {
    it('should stop cleanup service', () => {
      cleanupService.start();
      cleanupService.stop();
      expect(cleanupService).toBeDefined();
    });

    it('should handle stop when not started', () => {
      expect(() => cleanupService.stop()).not.toThrow();
    });
  });

  describe('cleanupExpiredCarts', () => {
    it('should clean up completed checkouts immediately', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: CheckoutStatus.COMPLETED,
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });

    it('should clean up failed checkouts after 1 hour', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: CheckoutStatus.FAILED,
        checkoutStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });

    it('should not clean up failed checkouts before 1 hour', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: CheckoutStatus.FAILED,
        checkoutStartedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).not.toBeNull();
    });

    it('should mark stuck in_progress checkouts as failed after 5 minutes', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: CheckoutStatus.IN_PROGRESS,
        checkoutStartedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      };

      await cartStore.set('user1', cart);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).not.toBeNull();
      expect(result?.checkoutStatus).toBe(CheckoutStatus.FAILED);
      expect(result?.checkoutError).toBe('Checkout timeout - please retry');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not mark in_progress checkouts as failed before 5 minutes', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: CheckoutStatus.IN_PROGRESS,
        checkoutStartedAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).not.toBeNull();
      expect(result?.checkoutStatus).toBe(CheckoutStatus.IN_PROGRESS);
    });

    it('should clean up old inactive carts', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastAccessedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });

    it('should not clean up recently accessed carts', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(), // Recently accessed
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).not.toBeNull();
    });
  });

  describe('cleanupExpiredContexts', () => {
    it('should clean up expired contexts', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isExpired: true,
      };

      await contextStore.set('user1', context);
      await cleanupService.runCleanup();

      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });

    it('should clean up contexts with past expiry date', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isExpired: false,
      };

      await contextStore.set('user1', context);
      await cleanupService.runCleanup();

      const result = await contextStore.get('user1');
      expect(result).toBeNull();
    });

    it('should not clean up valid contexts', async () => {
      const context: ExternalCartContext = {
        contextId: 'ctx_1',
        cartId: 'cart_1',
        provider: 'salesforce',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
        isExpired: false,
      };

      await contextStore.set('user1', context);
      await cleanupService.runCleanup();

      const result = await contextStore.get('user1');
      expect(result).not.toBeNull();
    });
  });

  describe('runCleanup', () => {
    it('should run cleanup manually', async () => {
      const cart: Cart = {
        id: 'cart_1',
        userId: 'user1',
        items: [],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastAccessedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      await cartStore.set('user1', cart);
      await cleanupService.runCleanup();

      const result = await cartStore.get('user1');
      expect(result).toBeNull();
    });
  });
});
