/**
 * API response helper functions
 */

import { Response } from 'express';
import {
  Cart,
  CartResponse,
  CartSummaryResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  CartError,
} from '../models/index.js';
import { calculateCartTotals, calculateItemSubtotal } from '../utils/index.js';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 500,
  details?: Record<string, unknown>
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

export function handleError(res: Response, error: unknown): void {
  if (error instanceof CartError) {
    sendError(res, error.code, error.message, error.statusCode, error.details);
  } else if (error instanceof Error) {
    console.error('Unexpected error:', error);
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  } else {
    console.error('Unknown error:', error);
    sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export function mapCartToResponse(cart: Cart): CartResponse {
  const totals = calculateCartTotals(cart.items);

  return {
    id: cart.id,
    userId: cart.userId,
    items: cart.items.map((item) => ({
      ...item,
      subtotal: calculateItemSubtotal(item),
    })),
    totals,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    syncStatus: cart.syncStatus,
    checkoutStatus: cart.checkoutStatus,
  };
}

export function mapCartToSummaryResponse(cart: Cart): CartSummaryResponse {
  const totals = calculateCartTotals(cart.items);

  return {
    userId: cart.userId,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    totals,
    syncStatus: cart.syncStatus,
    checkoutStatus: cart.checkoutStatus,
    lastUpdated: cart.updatedAt.toISOString(),
  };
}
