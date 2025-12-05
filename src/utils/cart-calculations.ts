/**
 * Pure functions for cart calculations
 */

import { CartItem, CartTotals } from '../models/index.js';

export function calculateCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Note: Tax calculation now happens via TaxService
  // This function returns a basic totals object without tax
  return {
    subtotal: roundToTwoDecimals(subtotal),
    taxes: [],
    totalTax: 0,
    total: roundToTwoDecimals(subtotal),
  };
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateItemSubtotal(item: CartItem): number {
  return roundToTwoDecimals(item.price * item.quantity);
}
