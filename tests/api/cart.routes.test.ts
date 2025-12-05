/**
 * Cart API routes tests
 * Tests route handlers by directly calling them
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { createCartRoutes } from '../../src/api/cart.routes.js';
import { CartService } from '../../src/services/index.js';
import { Cart, CartItem, CheckoutStatus, CartError } from '../../src/models/index.js';

// Helper to extract route handler
function getRouteHandler(router: ReturnType<typeof createCartRoutes>, method: string, path: string) {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]) {
      return layer.route.stack[0]?.handle;
    }
  }
  return null;
}

describe('Cart Routes', () => {
  let cartService: CartService;
  let router: ReturnType<typeof createCartRoutes>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    cartService = {
      getCart: vi.fn(),
      addItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      checkout: vi.fn(),
    } as unknown as CartService;

    router = createCartRoutes(cartService);

    mockRequest = {
      params: {},
      body: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('GET /:userId', () => {
    it('should get cart successfully', async () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      mockRequest.params = { userId: 'user1' };
      (cartService.getCart as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const handler = getRouteHandler(router, 'get', '/:userId');
      expect(handler).toBeDefined();
      
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.getCart).toHaveBeenCalledWith('user1');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalled();
      }
    });

    it('should handle errors', async () => {
      mockRequest.params = { userId: 'user1' };
      (cartService.getCart as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Test error'));

      const handler = getRouteHandler(router, 'get', '/:userId');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalled();
      }
    });

    it('should handle CartError', async () => {
      mockRequest.params = { userId: 'user1' };
      (cartService.getCart as ReturnType<typeof vi.fn>).mockRejectedValue(new CartError('Not found', 'CART_NOT_FOUND', 404));

      const handler = getRouteHandler(router, 'get', '/:userId');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      }
    });
  });

  describe('GET /:userId/summary', () => {
    it('should get cart summary successfully', async () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      mockRequest.params = { userId: 'user1' };
      (cartService.getCart as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const handler = getRouteHandler(router, 'get', '/:userId/summary');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.getCart).toHaveBeenCalledWith('user1');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('POST /:userId/items', () => {
    it('should add item successfully', async () => {
      const item: CartItem = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'device',
        quantity: 1,
        price: 999.99,
      };

      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [item],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      mockRequest.params = { userId: 'user1' };
      mockRequest.body = item;
      (cartService.addItem as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const handler = getRouteHandler(router, 'post', '/:userId/items');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.addItem).toHaveBeenCalledWith('user1', item);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('PUT /:userId/items/:productId', () => {
    it('should update item quantity successfully', async () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      mockRequest.params = { userId: 'user1', productId: 'prod1' };
      mockRequest.body = { quantity: 5 };
      (cartService.updateItemQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const handler = getRouteHandler(router, 'put', '/:userId/items/:productId');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.updateItemQuantity).toHaveBeenCalledWith('user1', 'prod1', 5);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('DELETE /:userId/items/:productId', () => {
    it('should remove item successfully', async () => {
      const cart: Cart = {
        id: 'cart_123',
        userId: 'user1',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        syncStatus: 'synced',
        checkoutStatus: 'pending',
      };

      mockRequest.params = { userId: 'user1', productId: 'prod1' };
      (cartService.removeItem as ReturnType<typeof vi.fn>).mockResolvedValue(cart);

      const handler = getRouteHandler(router, 'delete', '/:userId/items/:productId');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.removeItem).toHaveBeenCalledWith('user1', 'prod1');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('DELETE /:userId', () => {
    it('should clear cart successfully', async () => {
      mockRequest.params = { userId: 'user1' };
      (cartService.clearCart as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const handler = getRouteHandler(router, 'delete', '/:userId');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.clearCart).toHaveBeenCalledWith('user1');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });
  });

  describe('POST /:userId/checkout', () => {
    it('should checkout successfully', async () => {
      const result = {
        orderId: 'order_123',
        userId: 'user1',
        subtotal: 999.99,
        taxes: [],
        totalTax: 0,
        total: 999.99,
        status: CheckoutStatus.COMPLETED,
        items: [],
        completedAt: new Date(),
      };

      mockRequest.params = { userId: 'user1' };
      (cartService.checkout as ReturnType<typeof vi.fn>).mockResolvedValue(result);

      const handler = getRouteHandler(router, 'post', '/:userId/checkout');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(cartService.checkout).toHaveBeenCalledWith('user1');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      }
    });

    it('should handle failed checkout', async () => {
      const result = {
        userId: 'user1',
        subtotal: 0,
        taxes: [],
        totalTax: 0,
        total: 0,
        status: CheckoutStatus.FAILED,
        items: [],
        error: 'Cart is empty',
      };

      mockRequest.params = { userId: 'user1' };
      (cartService.checkout as ReturnType<typeof vi.fn>).mockResolvedValue(result);

      const handler = getRouteHandler(router, 'post', '/:userId/checkout');
      if (handler) {
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      }
    });
  });
});
