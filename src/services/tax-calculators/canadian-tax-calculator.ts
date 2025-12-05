/**
 * CanadianTaxCalculator
 *
 * Handles Canadian tax logic including:
 * - HST (Harmonized Sales Tax) - single combined tax
 * - GST + PST (separate federal and provincial taxes)
 * - GST + QST (Quebec)
 * - Tax stacking rules
 */

import { CartItem, TaxContext, TaxCalculationResult, TaxBreakdown, TaxRate } from '../../models/index.js';
import { TaxCalculator } from './tax-calculator.interface.js';
import { TaxRateStore } from '../../stores/tax-rate-store.js';

export class CanadianTaxCalculator implements TaxCalculator {
  jurisdiction: string;

  constructor(
    jurisdiction: string,
    private taxRateStore: TaxRateStore
  ) {
    this.jurisdiction = jurisdiction;
  }

  async calculate(items: CartItem[], context: TaxContext): Promise<TaxCalculationResult> {
    // Get applicable tax rates for this jurisdiction
    const rates = await this.taxRateStore.getRatesAtDate(
      context.jurisdiction,
      context.calculationDate
    );

    if (rates.length === 0) {
      // No tax rates configured
      const subtotal = this.calculateSubtotal(items);
      return {
        subtotal,
        taxes: [],
        totalTax: 0,
        total: subtotal,
      };
    }

    const subtotal = this.calculateSubtotal(items);
    const taxes: TaxBreakdown[] = [];

    // Check if this is HST jurisdiction (single combined tax)
    const hstRate = rates.find(r => r.name === 'HST');

    if (hstRate) {
      // HST provinces (ON, NS, NB, NL, PE)
      const taxableAmount = this.calculateTaxableAmount(items, hstRate);
      const taxAmount = taxableAmount * hstRate.rate;

      taxes.push({
        jurisdiction: context.jurisdiction,
        taxName: hstRate.name,
        rate: hstRate.rate,
        taxableAmount,
        taxAmount,
      });
    } else {
      // GST + PST/QST provinces
      const gstRate = rates.find(r => r.name === 'GST');
      const pstRate = rates.find(r => r.name === 'PST');
      const qstRate = rates.find(r => r.name === 'QST');

      if (gstRate) {
        const gstTaxableAmount = this.calculateTaxableAmount(items, gstRate);
        const gstTaxAmount = gstTaxableAmount * gstRate.rate;

        taxes.push({
          jurisdiction: context.jurisdiction,
          taxName: gstRate.name,
          rate: gstRate.rate,
          taxableAmount: gstTaxableAmount,
          taxAmount: gstTaxAmount,
        });
      }

      if (pstRate) {
        const pstTaxableAmount = this.calculateTaxableAmount(items, pstRate);
        const pstTaxAmount = pstTaxableAmount * pstRate.rate;

        taxes.push({
          jurisdiction: context.jurisdiction,
          taxName: pstRate.name,
          rate: pstRate.rate,
          taxableAmount: pstTaxableAmount,
          taxAmount: pstTaxAmount,
        });
      }

      if (qstRate) {
        // QST in Quebec is calculated on subtotal + GST (tax stacking)
        const qstTaxableAmount = this.calculateTaxableAmount(items, qstRate);
        const gstTax = taxes.find(t => t.taxName === 'GST');
        const qstBase = qstTaxableAmount + (gstTax?.taxAmount || 0);
        const qstTaxAmount = qstBase * qstRate.rate;

        taxes.push({
          jurisdiction: context.jurisdiction,
          taxName: qstRate.name,
          rate: qstRate.rate,
          taxableAmount: qstBase,
          taxAmount: qstTaxAmount,
        });
      }
    }

    const totalTax = taxes.reduce((sum, t) => sum + t.taxAmount, 0);

    return {
      subtotal,
      taxes,
      totalTax,
      total: subtotal + totalTax,
    };
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  private calculateTaxableAmount(items: CartItem[], rate: TaxRate): number {
    return items
      .filter(item => rate.applicableProductTypes.includes(item.type))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
