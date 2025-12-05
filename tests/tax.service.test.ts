/**
 * TaxService unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaxService } from '../src/services/tax.service.js';
import { TaxRateStore } from '../src/stores/tax-rate-store.js';
import { CartItem, TaxContext } from '../src/models/index.js';

describe('TaxService', () => {
  let taxService: TaxService;
  let taxRateStore: TaxRateStore;

  beforeEach(() => {
    taxRateStore = new TaxRateStore();
    taxService = new TaxService(taxRateStore);
  });

  describe('Canadian tax calculations', () => {
    it('should calculate HST correctly for Ontario', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'CA-ON',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(1);
      expect(result.taxes[0].taxName).toBe('HST');
      expect(result.taxes[0].rate).toBe(0.13);
      expect(result.totalTax).toBe(130);
      expect(result.total).toBe(1130);
    });

    it('should calculate GST + PST correctly for BC', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'CA-BC',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(2);

      const gst = result.taxes.find(t => t.taxName === 'GST');
      const pst = result.taxes.find(t => t.taxName === 'PST');

      expect(gst?.rate).toBe(0.05);
      expect(gst?.taxAmount).toBe(50);
      expect(pst?.rate).toBe(0.07);
      expect(pst?.taxAmount).toBe(70);
      expect(result.totalTax).toBe(120);
      expect(result.total).toBe(1120);
    });

    it('should apply PST only to applicable product types in BC', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
        {
          productId: 'plan1',
          name: 'Unlimited Plan',
          type: 'plan',
          quantity: 1,
          price: 100,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'CA-BC',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1100);

      const gst = result.taxes.find(t => t.taxName === 'GST');
      const pst = result.taxes.find(t => t.taxName === 'PST');

      // GST applies to all items
      expect(gst?.taxableAmount).toBe(1100);
      expect(gst?.taxAmount).toBe(55);

      // PST only applies to devices (not plans)
      expect(pst?.taxableAmount).toBe(1000);
      expect(pst?.taxAmount).toBe(70);
    });

    it('should calculate GST only for Alberta', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'CA-AB',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(1);
      expect(result.taxes[0].taxName).toBe('GST');
      expect(result.totalTax).toBe(50);
      expect(result.total).toBe(1050);
    });
  });

  describe('Multiple items', () => {
    it('should calculate tax for multiple items correctly', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 2,
          price: 999.99,
        },
        {
          productId: 'plan1',
          name: 'Unlimited Plan',
          type: 'plan',
          quantity: 1,
          price: 79.99,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'CA-ON',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      const subtotal = (999.99 * 2) + 79.99;
      expect(result.subtotal).toBeCloseTo(subtotal, 2);
      expect(result.totalTax).toBeCloseTo(subtotal * 0.13, 2);
      expect(result.total).toBeCloseTo(subtotal * 1.13, 2);
    });
  });

  describe('Empty cart', () => {
    it('should return zero taxes for empty cart', async () => {
      const items: CartItem[] = [];

      const context: TaxContext = {
        jurisdiction: 'CA-ON',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Unknown jurisdiction', () => {
    it('should return no tax for unknown jurisdiction', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
      ];

      const context: TaxContext = {
        jurisdiction: 'XX-YY',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(1000);
    });
  });
});
