/**
 * Cart API routes
 */

import { Router, Request, Response } from 'express';
import { CartService } from '../services/index.js';
import { CartItem, CheckoutStatus } from '../models/index.js';
import {
  sendSuccess,
  sendError,
  handleError,
  mapCartToResponse,
  mapCartToSummaryResponse,
} from './response-helpers.js';

export function createCartRoutes(cartService: CartService): Router {
  const router = Router();

  /**
   * GET /carts/:userId
   * Get or create cart for a user
   */
  router.get('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const cart = await cartService.getCart(userId);
      sendSuccess(res, mapCartToResponse(cart));
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * GET /carts/:userId/summary
   * Get cart summary
   */
  router.get('/:userId/summary', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const cart = await cartService.getCart(userId);
      sendSuccess(res, mapCartToSummaryResponse(cart));
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /carts/:userId/items
   * Add item to cart
   */
  router.post('/:userId/items', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const item: CartItem = req.body;

      const cart = await cartService.addItem(userId, item);
      sendSuccess(res, mapCartToResponse(cart));
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * PUT /carts/:userId/items/:productId
   * Update item quantity
   */
  router.put('/:userId/items/:productId', async (req: Request, res: Response) => {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;

      const cart = await cartService.updateItemQuantity(userId, productId, quantity);
      sendSuccess(res, mapCartToResponse(cart));
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * DELETE /carts/:userId/items/:productId
   * Remove item from cart
   */
  router.delete('/:userId/items/:productId', async (req: Request, res: Response) => {
    try {
      const { userId, productId } = req.params;

      const cart = await cartService.removeItem(userId, productId);
      sendSuccess(res, mapCartToResponse(cart));
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * DELETE /carts/:userId
   * Clear cart
   */
  router.delete('/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      await cartService.clearCart(userId);
      sendSuccess(res, { message: 'Cart cleared successfully' });
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /carts/:userId/checkout
   * Checkout (idempotent) - returns result with status
   */
  router.post('/:userId/checkout', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const result = await cartService.checkout(userId);

      // Check if checkout failed
      if (result.status === CheckoutStatus.FAILED) {
        // Return 400 for failed checkout with error details
        sendError(res, 'CHECKOUT_FAILED', result.error || 'Checkout failed', 400, {
          result,
        });
        return;
      }

      // Convert Date to ISO string for JSON response (successful checkout)
      const response = {
        ...result,
        completedAt: result.completedAt?.toISOString(),
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}
