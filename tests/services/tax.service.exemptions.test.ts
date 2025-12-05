/**
 * TaxService exemption tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaxService } from '../../src/services/tax.service.js';
import { TaxRateStore } from '../../src/stores/tax-rate-store.js';
import { CartItem, TaxContext, TaxExemption } from '../../src/models/index.js';

describe('TaxService - Exemptions', () => {
  let taxService: TaxService;
  let taxRateStore: TaxRateStore;

  beforeEach(() => {
    taxRateStore = new TaxRateStore();
    taxService = new TaxService(taxRateStore);
  });

  describe('isExempt', () => {
    it('should return false for non-exempt customer', async () => {
      const result = await taxService.isExempt('customer1', 'CA-ON');
      expect(result).toBe(false);
    });

    it('should return true for exempt customer', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(true);
    });

    it('should return false for exemption in different jurisdiction', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-BC',
        exemptionType: 'full',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(false);
    });

    it('should return false for expired exemption', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        validTo: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(false);
    });

    it('should return false for exemption not yet valid', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Day after tomorrow
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(false);
    });

    it('should return true for exemption without expiry date', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24),
        // No validTo
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(true);
    });

    it('should return false for partial exemption', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'partial',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(false);
    });
  });

  describe('addExemption', () => {
    it('should add exemption for customer', async () => {
      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      await taxService.addExemption(exemption);
      const result = await taxService.isExempt('customer1', 'CA-ON');

      expect(result).toBe(true);
    });

    it('should support multiple exemptions for same customer', async () => {
      const exemption1: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      const exemption2: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-BC',
        exemptionType: 'full',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      await taxService.addExemption(exemption1);
      await taxService.addExemption(exemption2);

      expect(await taxService.isExempt('customer1', 'CA-ON')).toBe(true);
      expect(await taxService.isExempt('customer1', 'CA-BC')).toBe(true);
    });
  });

  describe('calculateTax with exemptions', () => {
    it('should return zero tax for exempt customer', async () => {
      const items: CartItem[] = [
        {
          productId: 'phone1',
          name: 'iPhone 15',
          type: 'device',
          quantity: 1,
          price: 1000,
        },
      ];

      const exemption: TaxExemption = {
        customerId: 'customer1',
        jurisdiction: 'CA-ON',
        exemptionType: 'full',
        validFrom: new Date(Date.now() - 1000 * 60 * 60 * 24),
        validTo: new Date(Date.now() + 1000 * 60 * 60 * 24),
      };

      await taxService.addExemption(exemption);

      const context: TaxContext = {
        jurisdiction: 'CA-ON',
        customerId: 'customer1',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should calculate tax for non-exempt customer', async () => {
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
        customerId: 'customer1',
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(1);
      expect(result.totalTax).toBeGreaterThan(0);
    });

    it('should calculate tax when no customerId provided', async () => {
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
        // No customerId
        calculationDate: new Date(),
      };

      const result = await taxService.calculateTax(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(1);
      expect(result.totalTax).toBeGreaterThan(0);
    });
  });

  describe('getApplicableRates', () => {
    it('should get applicable rates for jurisdiction', async () => {
      const rates = await taxService.getApplicableRates('CA-ON', new Date());
      expect(rates).toBeDefined();
      expect(Array.isArray(rates)).toBe(true);
    });
  });
});
