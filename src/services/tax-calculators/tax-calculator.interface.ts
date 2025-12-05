/**
 * TaxCalculator interface
 *
 * Strategy pattern for jurisdiction-specific tax calculation logic
 */

import { CartItem, TaxContext, TaxCalculationResult } from '../../models/index.js';

export interface TaxCalculator {
  /**
   * The jurisdiction this calculator handles (e.g., "CA-ON", "US-CA")
   */
  jurisdiction: string;

  /**
   * Calculate tax for a set of cart items
   */
  calculate(items: CartItem[], context: TaxContext): Promise<TaxCalculationResult>;
}
