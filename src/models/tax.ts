/**
 * Tax domain models
 */

import { ProductType } from './cart.js';

/**
 * Tax rate configuration for a specific jurisdiction
 */
export interface TaxRate {
  id: string;
  jurisdiction: string; // "CA-ON", "CA-BC", "US-CA", "US-NY", etc.
  name: string; // "HST", "GST", "PST", "Sales Tax"
  rate: number; // 0.13 for 13%
  applicableProductTypes: ProductType[];
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * Individual tax component breakdown
 */
export interface TaxBreakdown {
  jurisdiction: string;
  taxName: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

/**
 * Complete tax calculation result
 */
export interface TaxCalculationResult {
  subtotal: number;
  taxes: TaxBreakdown[];
  totalTax: number;
  total: number;
}

/**
 * Context for tax calculation
 */
export interface TaxContext {
  jurisdiction: string; // "CA-ON", "US-CA", etc.
  customerId?: string; // For exemption checks
  calculationDate: Date;
}

/**
 * Tax exemption status
 */
export interface TaxExemption {
  customerId: string;
  jurisdiction: string;
  exemptionType: 'full' | 'partial';
  exemptTaxNames?: string[]; // Specific taxes exempt from (e.g., ["PST"])
  validFrom: Date;
  validTo?: Date;
}
