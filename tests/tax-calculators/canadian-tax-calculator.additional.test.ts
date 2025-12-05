/**
 * Additional CanadianTaxCalculator tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CanadianTaxCalculator } from '../../src/services/tax-calculators/canadian-tax-calculator.js';
import { TaxRateStore } from '../../src/stores/tax-rate-store.js';
import { CartItem, TaxContext } from '../../src/models/index.js';

describe('CanadianTaxCalculator - Additional Tests', () => {
  let calculator: CanadianTaxCalculator;
  let taxRateStore: TaxRateStore;

  beforeEach(() => {
    taxRateStore = new TaxRateStore();
    calculator = new CanadianTaxCalculator('CA-ON', taxRateStore);
  });

  describe('calculate with no rates', () => {
    it('should return zero tax when no rates configured', async () => {
      // Create a calculator for a jurisdiction with no rates
      const calculatorNoRates = new CanadianTaxCalculator('CA-XX', taxRateStore);

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
        jurisdiction: 'CA-XX',
        calculationDate: new Date(),
      };

      const result = await calculatorNoRates.calculate(items, context);

      expect(result.subtotal).toBe(1000);
      expect(result.taxes).toHaveLength(0);
      expect(result.totalTax).toBe(0);
      expect(result.total).toBe(1000);
    });
  });
});
