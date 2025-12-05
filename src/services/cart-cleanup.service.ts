/**
 * CartCleanupService
 *
 * Background service for cleaning up expired carts and contexts
 * - Runs every 5 minutes
 * - Removes carts inactive > 24 hours
 * - Removes expired provider contexts
 * - Handles stuck checkouts
 */

import { CartStore, ProviderContextStore } from '../stores/index.js';
import { CheckoutStatus } from '../models/index.js';

export class CartCleanupService {
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes
  private intervalId?: NodeJS.Timeout;

  constructor(
    private cartStore: CartStore,
    private contextStore: ProviderContextStore
  ) {}

  /**
   * Start the cleanup service
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Cleanup service already running');
      return;
    }

    console.log('Starting cart cleanup service');
    this.intervalId = setInterval(() => {
      this.cleanupExpiredCarts();
      this.cleanupExpiredContexts();
    }, this.cleanupInterval);

    // Run immediately on start
    this.cleanupExpiredCarts();
    this.cleanupExpiredContexts();
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Stopped cart cleanup service');
    }
  }

  /**
   * Clean up expired carts
   */
  private cleanupExpiredCarts(): void {
    const expiryThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [userId, cart] of this.cartStore.entries()) {
      // Clean up completed checkouts immediately
      if (cart.checkoutStatus === CheckoutStatus.COMPLETED) {
        this.cartStore.delete(userId);
        this.contextStore.delete(userId);
        cleaned++;
        continue;
      }

      // Clean up failed checkouts after 1 hour
      if (cart.checkoutStatus === CheckoutStatus.FAILED) {
        const failedAt = cart.checkoutStartedAt?.getTime() || 0;
        if (Date.now() - failedAt > 60 * 60 * 1000) {
          this.cartStore.delete(userId);
          cleaned++;
          continue;
        }
      }

      // Clean up stuck 'in_progress' checkouts after 5 minutes
      if (cart.checkoutStatus === CheckoutStatus.IN_PROGRESS) {
        const startedAt = cart.checkoutStartedAt?.getTime() || 0;
        if (Date.now() - startedAt > 5 * 60 * 1000) {
          cart.checkoutStatus = CheckoutStatus.FAILED;
          cart.checkoutError = 'Checkout timeout - please retry';
          this.cartStore.update(userId, cart);
          console.warn(`Marked stuck checkout as failed for user ${userId}`);
        }
      }

      // Clean up old inactive carts
      const lastAccessed = cart.lastAccessedAt.getTime();
      if (lastAccessed < expiryThreshold) {
        this.cartStore.delete(userId);
        this.contextStore.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired carts`);
    }
  }

  /**
   * Clean up expired provider contexts
   */
  private cleanupExpiredContexts(): void {
    let cleaned = 0;

    for (const [userId, context] of this.contextStore.entries()) {
      if (context.isExpired || context.expiresAt < new Date()) {
        this.contextStore.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired provider contexts`);
    }
  }

  /**
   * Manual cleanup trigger (for testing/admin)
   */
  async runCleanup(): Promise<void> {
    this.cleanupExpiredCarts();
    this.cleanupExpiredContexts();
  }
}
