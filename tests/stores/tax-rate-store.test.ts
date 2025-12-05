/**
 * TaxRateStore tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaxRateStore } from '../../src/stores/tax-rate-store.js';
import { TaxRate, ProductType } from '../../src/models/index.js';

describe('TaxRateStore', () => {
  let taxRateStore: TaxRateStore;

  beforeEach(() => {
    taxRateStore = new TaxRateStore();
  });

  describe('getRatesByJurisdiction', () => {
    it('should return empty array for unknown jurisdiction', async () => {
      const rates = await taxRateStore.getRatesByJurisdiction('XX-YY');
      expect(rates).toEqual([]);
    });

    it('should return rates for known jurisdiction', async () => {
      const rates = await taxRateStore.getRatesByJurisdiction('CA-ON');
      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0].jurisdiction).toBe('CA-ON');
    });
  });

  describe('getRatesAtDate', () => {
    it('should return only active rates at given date', async () => {
      const futureDate = new Date('2030-01-01');
      const rates = await taxRateStore.getRatesAtDate('CA-ON', futureDate);
      
      // Should only return rates effective before or on the date
      rates.forEach(rate => {
        expect(rate.effectiveFrom <= futureDate).toBe(true);
        if (rate.effectiveTo) {
          expect(rate.effectiveTo >= futureDate).toBe(true);
        }
      });
    });

    it('should return empty array for date before any rates', async () => {
      const pastDate = new Date('2000-01-01');
      const rates = await taxRateStore.getRatesAtDate('CA-ON', pastDate);
      expect(rates).toEqual([]);
    });

    it('should filter out expired rates', async () => {
      // Add a rate that expires in the past
      const expiredRate: TaxRate = {
        id: 'expired_rate',
        jurisdiction: 'CA-TEST',
        name: 'Test Tax',
        rate: 0.1,
        applicableProductTypes: [ProductType.DEVICE],
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: new Date('2021-01-01'),
      };

      await taxRateStore.upsert(expiredRate);

      const currentDate = new Date();
      const rates = await taxRateStore.getRatesAtDate('CA-TEST', currentDate);
      
      // Should not include expired rate
      expect(rates.find(r => r.id === 'expired_rate')).toBeUndefined();
    });
  });

  describe('upsert', () => {
    it('should add new rate', async () => {
      const newRate: TaxRate = {
        id: 'new_rate',
        jurisdiction: 'CA-TEST',
        name: 'Test Tax',
        rate: 0.1,
        applicableProductTypes: [ProductType.DEVICE],
        effectiveFrom: new Date(),
      };

      await taxRateStore.upsert(newRate);
      const rates = await taxRateStore.getRatesByJurisdiction('CA-TEST');
      
      expect(rates.find(r => r.id === 'new_rate')).toBeDefined();
    });

    it('should update existing rate', async () => {
      const rate: TaxRate = {
        id: 'update_rate',
        jurisdiction: 'CA-TEST',
        name: 'Test Tax',
        rate: 0.1,
        applicableProductTypes: [ProductType.DEVICE],
        effectiveFrom: new Date(),
      };

      await taxRateStore.upsert(rate);
      
      const updatedRate: TaxRate = {
        ...rate,
        rate: 0.15,
      };

      await taxRateStore.upsert(updatedRate);
      const rates = await taxRateStore.getRatesByJurisdiction('CA-TEST');
      
      const foundRate = rates.find(r => r.id === 'update_rate');
      expect(foundRate?.rate).toBe(0.15);
      expect(rates.filter(r => r.id === 'update_rate').length).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete rate', async () => {
      const rate: TaxRate = {
        id: 'delete_rate',
        jurisdiction: 'CA-TEST',
        name: 'Test Tax',
        rate: 0.1,
        applicableProductTypes: [ProductType.DEVICE],
        effectiveFrom: new Date(),
      };

      await taxRateStore.upsert(rate);
      await taxRateStore.delete('CA-TEST', 'delete_rate');
      
      const rates = await taxRateStore.getRatesByJurisdiction('CA-TEST');
      expect(rates.find(r => r.id === 'delete_rate')).toBeUndefined();
    });

    it('should handle delete of non-existent rate', async () => {
      await expect(taxRateStore.delete('CA-TEST', 'nonexistent')).resolves.not.toThrow();
    });
  });

  describe('seedInitialRates', () => {
    it('should have seeded rates for Canadian provinces', async () => {
      const provinces = ['CA-ON', 'CA-BC', 'CA-AB', 'CA-QC'];
      
      for (const province of provinces) {
        const rates = await taxRateStore.getRatesByJurisdiction(province);
        expect(rates.length).toBeGreaterThan(0);
      }
    });

    it('should have HST rate for Ontario', async () => {
      const rates = await taxRateStore.getRatesByJurisdiction('CA-ON');
      const hstRate = rates.find(r => r.name === 'HST');
      expect(hstRate).toBeDefined();
      expect(hstRate?.rate).toBe(0.13);
    });

    it('should have GST and PST rates for BC', async () => {
      const rates = await taxRateStore.getRatesByJurisdiction('CA-BC');
      const gstRate = rates.find(r => r.name === 'GST');
      const pstRate = rates.find(r => r.name === 'PST');
      
      expect(gstRate).toBeDefined();
      expect(pstRate).toBeDefined();
      expect(gstRate?.rate).toBe(0.05);
      expect(pstRate?.rate).toBe(0.07);
    });
  });
});
