/**
 * TaxService
 *
 * Orchestrates tax calculations using jurisdiction-specific calculators.
 * Handles calculator selection, exemptions, and fallback logic.
 */

import { CartItem, TaxContext, TaxCalculationResult, TaxExemption } from '../models/index.js';
import { TaxRateStore } from '../stores/tax-rate-store.js';
import {
  TaxCalculator,
  CanadianTaxCalculator,
} from './tax-calculators/index.js';

export class TaxService {
  private calculators: Map<string, TaxCalculator> = new Map();
  private exemptions: Map<string, TaxExemption[]> = new Map();

  constructor(private taxRateStore: TaxRateStore) {
    this.initializeCalculators();
  }

  /**
   * Calculate tax for cart items based on context
   */
  async calculateTax(items: CartItem[], context: TaxContext): Promise<TaxCalculationResult> {
    // Check for tax exemptions
    if (context.customerId) {
      const isExempt = await this.isExempt(context.customerId, context.jurisdiction);
      if (isExempt) {
        const subtotal = this.calculateSubtotal(items);
        return {
          subtotal,
          taxes: [],
          totalTax: 0,
          total: subtotal,
        };
      }
    }

    // Get calculator for jurisdiction
    const calculator = this.getCalculator(context.jurisdiction);

    if (!calculator) {
      // Fallback: no tax
      console.warn(`No tax calculator found for jurisdiction: ${context.jurisdiction}`);
      const subtotal = this.calculateSubtotal(items);
      return {
        subtotal,
        taxes: [],
        totalTax: 0,
        total: subtotal,
      };
    }

    // Calculate tax
    return calculator.calculate(items, context);
  }

  /**
   * Check if customer is tax-exempt
   */
  async isExempt(customerId: string, jurisdiction: string): Promise<boolean> {
    const customerExemptions = this.exemptions.get(customerId) || [];
    const now = new Date();

    return customerExemptions.some(exemption => {
      const matchesJurisdiction = exemption.jurisdiction === jurisdiction;
      const isActive = exemption.validFrom <= now && (!exemption.validTo || exemption.validTo >= now);
      const isFullExemption = exemption.exemptionType === 'full';

      return matchesJurisdiction && isActive && isFullExemption;
    });
  }

  /**
   * Add tax exemption for a customer
   */
  async addExemption(exemption: TaxExemption): Promise<void> {
    const customerExemptions = this.exemptions.get(exemption.customerId) || [];
    customerExemptions.push(exemption);
    this.exemptions.set(exemption.customerId, customerExemptions);
  }

  /**
   * Get all applicable tax rates for a jurisdiction
   */
  async getApplicableRates(jurisdiction: string, date: Date = new Date()) {
    return this.taxRateStore.getRatesAtDate(jurisdiction, date);
  }

  /**
   * Initialize tax calculators for all supported jurisdictions
   */
  private initializeCalculators(): void {
    // Canadian provinces
    const canadianProvinces = ['CA-ON', 'CA-BC', 'CA-AB', 'CA-QC', 'CA-NS', 'CA-NB', 'CA-MB', 'CA-SK', 'CA-PE', 'CA-NL', 'CA-YT', 'CA-NT', 'CA-NU'];

    for (const province of canadianProvinces) {
      this.calculators.set(
        province,
        new CanadianTaxCalculator(province, this.taxRateStore)
      );
    }
  }

  /**
   * Get calculator for a jurisdiction
   */
  private getCalculator(jurisdiction: string): TaxCalculator | undefined {
    return this.calculators.get(jurisdiction);
  }

  /**
   * Calculate subtotal from items
   */
  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
