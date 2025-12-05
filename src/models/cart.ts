/**
 * Cart domain model
 */

import { TaxContext, TaxBreakdown } from './tax.js';

export const ProductType = {
  DEVICE: 'device',
  ACCESSORY: 'accessory',
  PLAN: 'plan',
  SERVICE: 'service',
} as const;

export type ProductType = typeof ProductType[keyof typeof ProductType];

export const SyncStatus = {
  SYNCED: 'synced',
  PENDING: 'pending',
  FAILED: 'failed',
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

export const CheckoutStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type CheckoutStatus = typeof CheckoutStatus[keyof typeof CheckoutStatus];

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  externalCartId?: string;

  // Tax context
  taxContext?: TaxContext;

  // Sync tracking
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  lastSyncError?: string;

  // Checkout idempotency tracking
  checkoutStatus: CheckoutStatus;
  checkoutStartedAt?: Date;
  checkoutCompletedAt?: Date;
  checkoutResult?: CheckoutResult;
  checkoutError?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  type: ProductType;
  quantity: number;
  price: number;
}

export interface CartTotals {
  subtotal: number;
  taxes: TaxBreakdown[];
  totalTax: number;
  total: number;
}

export interface CheckoutResult {
  orderId?: string;
  userId: string;
  subtotal: number;
  taxes: TaxBreakdown[];
  totalTax: number;
  total: number;
  status: CheckoutStatus;
  items: CartItem[];
  completedAt?: Date;
  error?: string;
}
