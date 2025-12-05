/**
 * TaxRateStore
 *
 * In-memory storage for tax rates by jurisdiction.
 * Designed to be easily replaceable with database implementation.
 */

import { TaxRate } from '../models/index.js';

export class TaxRateStore {
  private rates: Map<string, TaxRate[]> = new Map();

  constructor() {
    this.seedInitialRates();
  }

  /**
   * Get all tax rates for a jurisdiction
   */
  async getRatesByJurisdiction(jurisdiction: string): Promise<TaxRate[]> {
    return this.rates.get(jurisdiction) || [];
  }

  /**
   * Get active tax rates for a jurisdiction at a specific date
   */
  async getRatesAtDate(jurisdiction: string, date: Date): Promise<TaxRate[]> {
    const allRates = this.rates.get(jurisdiction) || [];

    return allRates.filter(rate => {
      const isEffective = rate.effectiveFrom <= date;
      const notExpired = !rate.effectiveTo || rate.effectiveTo >= date;
      return isEffective && notExpired;
    });
  }

  /**
   * Add or update a tax rate
   */
  async upsert(rate: TaxRate): Promise<void> {
    const jurisdictionRates = this.rates.get(rate.jurisdiction) || [];

    // Remove existing rate with same id
    const filtered = jurisdictionRates.filter(r => r.id !== rate.id);
    filtered.push(rate);

    this.rates.set(rate.jurisdiction, filtered);
  }

  /**
   * Remove a tax rate
   */
  async delete(jurisdiction: string, rateId: string): Promise<void> {
    const jurisdictionRates = this.rates.get(jurisdiction) || [];
    const filtered = jurisdictionRates.filter(r => r.id !== rateId);
    this.rates.set(jurisdiction, filtered);
  }

  /**
   * Seed initial tax rates for testing
   */
  private seedInitialRates(): void {
    // Canadian provinces
    const canadianRates: TaxRate[] = [
      // Ontario - HST (harmonized)
      {
        id: 'ca-on-hst',
        jurisdiction: 'CA-ON',
        name: 'HST',
        rate: 0.13,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('2010-07-01'),
      },
      // British Columbia - GST + PST
      {
        id: 'ca-bc-gst',
        jurisdiction: 'CA-BC',
        name: 'GST',
        rate: 0.05,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('2013-04-01'),
      },
      {
        id: 'ca-bc-pst',
        jurisdiction: 'CA-BC',
        name: 'PST',
        rate: 0.07,
        applicableProductTypes: ['device', 'accessory'],
        effectiveFrom: new Date('2013-04-01'),
      },
      // Alberta - GST only
      {
        id: 'ca-ab-gst',
        jurisdiction: 'CA-AB',
        name: 'GST',
        rate: 0.05,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('1991-01-01'),
      },
      // Quebec - GST + QST
      {
        id: 'ca-qc-gst',
        jurisdiction: 'CA-QC',
        name: 'GST',
        rate: 0.05,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('1991-01-01'),
      },
      {
        id: 'ca-qc-qst',
        jurisdiction: 'CA-QC',
        name: 'QST',
        rate: 0.09975,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('2013-01-01'),
      },
    ];

    // US states
    const usRates: TaxRate[] = [
      // California
      {
        id: 'us-ca-sales',
        jurisdiction: 'US-CA',
        name: 'Sales Tax',
        rate: 0.0725, // Base state rate
        applicableProductTypes: ['device', 'accessory'],
        effectiveFrom: new Date('2011-07-01'),
      },
      // New York
      {
        id: 'us-ny-sales',
        jurisdiction: 'US-NY',
        name: 'Sales Tax',
        rate: 0.04, // State rate
        applicableProductTypes: ['device', 'accessory'],
        effectiveFrom: new Date('2005-06-01'),
      },
      // Texas
      {
        id: 'us-tx-sales',
        jurisdiction: 'US-TX',
        name: 'Sales Tax',
        rate: 0.0625,
        applicableProductTypes: ['device', 'accessory', 'service'],
        effectiveFrom: new Date('1990-01-01'),
      },
      // Oregon - No sales tax
      {
        id: 'us-or-none',
        jurisdiction: 'US-OR',
        name: 'No Tax',
        rate: 0,
        applicableProductTypes: ['device', 'accessory', 'plan', 'service'],
        effectiveFrom: new Date('1900-01-01'),
      },
    ];

    // Seed all rates
    [...canadianRates, ...usRates].forEach(rate => {
      const jurisdictionRates = this.rates.get(rate.jurisdiction) || [];
      jurisdictionRates.push(rate);
      this.rates.set(rate.jurisdiction, jurisdictionRates);
    });
  }

  /**
   * Get all jurisdictions with rates
   */
  async getAllJurisdictions(): Promise<string[]> {
    return Array.from(this.rates.keys());
  }
}
