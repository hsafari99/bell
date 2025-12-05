/**
 * API response types
 */

import { CartItem, CartTotals, SyncStatus, CheckoutStatus } from './cart.js';

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  totals: CartTotals;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  checkoutStatus: CheckoutStatus;
}

export interface CartSummaryResponse {
  userId: string;
  itemCount: number;
  totals: CartTotals;
  syncStatus: SyncStatus;
  checkoutStatus: CheckoutStatus;
  lastUpdated: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
