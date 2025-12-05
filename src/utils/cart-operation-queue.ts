/**
 * CartOperationQueue
 *
 * Implements per-user operation serialization to prevent race conditions.
 * - Operations for the same user are queued and executed sequentially
 * - Different users can execute operations in parallel
 * - Prevents race conditions without global locking
 */

export class CartOperationQueue {
  private queues: Map<string, Promise<any>> = new Map();

  async enqueue<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    // Wait for previous operation to complete
    const previousOp = this.queues.get(userId) || Promise.resolve();

    // Chain new operation
    const currentOp = previousOp
      .then(() => operation())
      .catch((err) => {
        // Log error but don't block queue
        console.error(`Operation failed for user ${userId}:`, err);
        throw err;
      })
      .finally(() => {
        // Clean up if this is the last operation
        if (this.queues.get(userId) === currentOp) {
          this.queues.delete(userId);
        }
      });

    this.queues.set(userId, currentOp);
    return currentOp;
  }

  /**
   * Get the number of active queues (for testing/monitoring)
   */
  getActiveQueues(): number {
    return this.queues.size;
  }

  /**
   * Check if a user has operations in queue (for testing)
   */
  hasQueue(userId: string): boolean {
    return this.queues.has(userId);
  }

  /**
   * Clear all queues (for testing)
   */
  clear(): void {
    this.queues.clear();
  }
}
