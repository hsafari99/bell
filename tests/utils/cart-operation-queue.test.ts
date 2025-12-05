/**
 * CartOperationQueue tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartOperationQueue } from '../../src/utils/cart-operation-queue.js';

describe('CartOperationQueue', () => {
  let queue: CartOperationQueue;

  beforeEach(() => {
    queue = new CartOperationQueue();
  });

  describe('enqueue', () => {
    it('should execute operation immediately if no queue exists', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      
      const result = await queue.enqueue('user1', operation);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should queue operations for same user', async () => {
      const order: string[] = [];
      
      const op1 = queue.enqueue('user1', async () => {
        order.push('op1-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        order.push('op1-end');
        return 'op1';
      });

      const op2 = queue.enqueue('user1', async () => {
        order.push('op2-start');
        order.push('op2-end');
        return 'op2';
      });

      const [result1, result2] = await Promise.all([op1, op2]);

      expect(order).toEqual(['op1-start', 'op1-end', 'op2-start', 'op2-end']);
      expect(result1).toBe('op1');
      expect(result2).toBe('op2');
    });

    it('should allow parallel operations for different users', async () => {
      const order: string[] = [];
      
      const op1 = queue.enqueue('user1', async () => {
        order.push('user1-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        order.push('user1-end');
        return 'user1';
      });

      const op2 = queue.enqueue('user2', async () => {
        order.push('user2-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        order.push('user2-end');
        return 'user2';
      });

      const [result1, result2] = await Promise.all([op1, op2]);

      // Operations should run in parallel
      expect(order[0]).toMatch(/user[12]-start/);
      expect(order[1]).toMatch(/user[12]-start/);
      expect(result1).toBe('user1');
      expect(result2).toBe('user2');
    });

    it('should handle operation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      
      await expect(
        queue.enqueue('user1', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should clean up queue after operation completes', async () => {
      await queue.enqueue('user1', async () => 'result');
      
      // Queue should be cleaned up
      expect(queue.hasQueue('user1')).toBe(false);
    });

    it('should handle multiple sequential operations', async () => {
      const results: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const result = await queue.enqueue('user1', async () => {
          results.push(`op${i}`);
          return `result${i}`;
        });
        expect(result).toBe(`result${i}`);
      }

      expect(results).toEqual(['op0', 'op1', 'op2', 'op3', 'op4']);
    });
  });

  describe('getActiveQueues', () => {
    it('should return 0 when no queues', () => {
      expect(queue.getActiveQueues()).toBe(0);
    });

    it('should return number of active queues', async () => {
      const promise = queue.enqueue('user1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      // Queue should be active while operation is running
      expect(queue.getActiveQueues()).toBe(1);
      
      await promise;
      // Queue should be cleaned up after
      expect(queue.getActiveQueues()).toBe(0);
    });

    it('should count multiple user queues', async () => {
      const promise1 = queue.enqueue('user1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result1';
      });

      const promise2 = queue.enqueue('user2', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result2';
      });

      expect(queue.getActiveQueues()).toBe(2);
      
      await Promise.all([promise1, promise2]);
      expect(queue.getActiveQueues()).toBe(0);
    });
  });

  describe('hasQueue', () => {
    it('should return false when no queue exists', () => {
      expect(queue.hasQueue('user1')).toBe(false);
    });

    it('should return true when queue exists', async () => {
      const promise = queue.enqueue('user1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      expect(queue.hasQueue('user1')).toBe(true);
      
      await promise;
      expect(queue.hasQueue('user1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all queues', async () => {
      const promise1 = queue.enqueue('user1', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result1';
      });

      const promise2 = queue.enqueue('user2', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result2';
      });

      queue.clear();

      expect(queue.getActiveQueues()).toBe(0);
      expect(queue.hasQueue('user1')).toBe(false);
      expect(queue.hasQueue('user2')).toBe(false);

      // Operations should still complete
      await Promise.all([promise1, promise2]);
    });
  });
});
