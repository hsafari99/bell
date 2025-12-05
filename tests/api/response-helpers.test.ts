/**
 * Response helpers tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Response } from 'express';
import {
  sendSuccess,
  sendError,
  handleError,
  mapCartToResponse,
  mapCartToSummaryResponse,
} from '../../src/api/response-helpers.js';
import { Cart, CartError, ValidationError } from '../../src/models/index.js';

describe('Response Helpers', () => {
  describe('sendSuccess', () => {
    it('should send success response with default status code', () => {
      const res = {
        status: (code: number) => res,
        json: (data: unknown) => {
          expect(code).toBe(200);
          expect(data).toEqual({
            success: true,
            data: { test: 'data' },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(200);
          expect(data).toEqual({
            success: true,
            data: { test: 'data' },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      sendSuccess(mockRes, { test: 'data' });
    });

    it('should send success response with custom status code', () => {
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(201);
          expect(data).toEqual({
            success: true,
            data: { created: true },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      sendSuccess(mockRes, { created: true }, 201);
    });
  });

  describe('sendError', () => {
    it('should send error response with default status code', () => {
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(500);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'TEST_ERROR',
              message: 'Test error',
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      sendError(mockRes, 'TEST_ERROR', 'Test error');
    });

    it('should send error response with custom status code and details', () => {
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(400);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: { field: 'email' },
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      sendError(mockRes, 'VALIDATION_ERROR', 'Invalid input', 400, { field: 'email' });
    });
  });

  describe('handleError', () => {
    it('should handle CartError', () => {
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(404);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'CART_NOT_FOUND',
              message: 'Cart not found',
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      const error = new CartError('Cart not found', 'CART_NOT_FOUND', 404);
      handleError(mockRes, error);
    });

    it('should handle ValidationError with details', () => {
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(400);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid item data',
              details: { fields: { productId: 'Required' } },
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      const error = new ValidationError('Invalid item data', {
        fields: { productId: 'Required' },
      });
      handleError(mockRes, error);
    });

    it('should handle generic Error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(500);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Something went wrong',
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      handleError(mockRes, new Error('Something went wrong'));
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle unknown error type', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let code = 200;
      const mockRes = {
        status: (statusCode: number) => {
          code = statusCode;
          return mockRes;
        },
        json: (data: unknown) => {
          expect(code).toBe(500);
          expect(data).toEqual({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
            timestamp: expect.any(String),
          });
        },
      } as unknown as Response;

      handleError(mockRes, 'Unknown error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('mapCartToResponse', () => {
    it('should map cart to response format', () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [
          {
            productId: 'prod1',
            name: 'iPhone',
            type: 'device',
            quantity: 2,
            price: 999.99,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastAccessedAt: new Date('2024-01-02'),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      const response = mapCartToResponse(cart);

      expect(response).toEqual({
        id: 'cart_123',
        userId: 'user1',
        items: [
          {
            productId: 'prod1',
            name: 'iPhone',
            type: 'device',
            quantity: 2,
            price: 999.99,
            subtotal: 1999.98,
          },
        ],
        totals: {
          subtotal: 1999.98,
          taxes: [],
          totalTax: 0,
          total: 1999.98,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      });
    });

    it('should handle empty cart', () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastAccessedAt: new Date('2024-01-02'),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      const response = mapCartToResponse(cart);

      expect(response.items).toEqual([]);
      expect(response.totals.subtotal).toBe(0);
    });
  });

  describe('mapCartToSummaryResponse', () => {
    it('should map cart to summary format', () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [
          {
            productId: 'prod1',
            name: 'iPhone',
            type: 'device',
            quantity: 2,
            price: 999.99,
          },
          {
            productId: 'prod2',
            name: 'Plan',
            type: 'plan',
            quantity: 1,
            price: 79.99,
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastAccessedAt: new Date('2024-01-02'),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      const response = mapCartToSummaryResponse(cart);

      expect(response).toEqual({
        userId: 'user1',
        itemCount: 3, // 2 + 1
        totals: {
          subtotal: 2079.97,
          taxes: [],
          totalTax: 0,
          total: 2079.97,
        },
        syncStatus: 'synced',
        checkoutStatus: 'pending',
        lastUpdated: '2024-01-02T00:00:00.000Z',
      });
    });
  });
});
