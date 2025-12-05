/**
 * Cart calculations tests
 */

import { describe, it, expect } from 'vitest';
import { calculateCartTotals, calculateItemSubtotal, roundToTwoDecimals } from '../../src/utils/cart-calculations.js';
import { CartItem } from '../../src/models/index.js';

describe('Cart Calculations', () => {
  describe('calculateCartTotals', () => {
    it('should calculate totals for empty cart', () => {
      const totals = calculateCartTotals([]);

      expect(totals).toEqual({
        subtotal: 0,
        taxes: [],
        totalTax: 0,
        total: 0,
      });
    });

    it('should calculate totals for single item', () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'iPhone',
          type: 'device',
          quantity: 1,
          price: 999.99,
        },
      ];

      const totals = calculateCartTotals(items);

      expect(totals.subtotal).toBe(999.99);
      expect(totals.total).toBe(999.99);
      expect(totals.taxes).toEqual([]);
      expect(totals.totalTax).toBe(0);
    });

    it('should calculate totals for multiple items', () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'iPhone',
          type: 'device',
          quantity: 2,
          price: 999.99,
        },
        {
          productId: 'prod2',
          name: 'Plan',
          type: 'plan',
          quantity: 1,
          price: 79.99,
        },
      ];

      const totals = calculateCartTotals(items);

      expect(totals.subtotal).toBe(2079.97);
      expect(totals.total).toBe(2079.97);
    });

    it('should round to two decimals', () => {
      const items: CartItem[] = [
        {
          productId: 'prod1',
          name: 'Item',
          type: 'device',
          quantity: 3,
          price: 33.333,
        },
      ];

      const totals = calculateCartTotals(items);

      // 33.333 * 3 = 99.999, which rounds to 100.00
      expect(totals.subtotal).toBe(100);
      expect(totals.total).toBe(100);
    });
  });

  describe('calculateItemSubtotal', () => {
    it('should calculate subtotal for item', () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 2,
        price: 999.99,
      };

      const subtotal = calculateItemSubtotal(item);

      expect(subtotal).toBe(1999.98);
    });

    it('should round to two decimals', () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'Item',
        type: 'device',
        quantity: 3,
        price: 33.333,
      };

      const subtotal = calculateItemSubtotal(item);

      // 33.333 * 3 = 99.999, which rounds to 100.00
      expect(subtotal).toBe(100);
    });
  });

  describe('roundToTwoDecimals', () => {
    it('should round to two decimals', () => {
      expect(roundToTwoDecimals(99.999)).toBe(100);
      expect(roundToTwoDecimals(99.994)).toBe(99.99);
      expect(roundToTwoDecimals(99.995)).toBe(100);
      expect(roundToTwoDecimals(100.001)).toBe(100);
      expect(roundToTwoDecimals(0.001)).toBe(0);
      expect(roundToTwoDecimals(0.005)).toBe(0.01);
    });
  });
});
