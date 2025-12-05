/**
 * Commerce Provider Interface
 * Abstract interface for integrating with external commerce platforms
 */

import { CartItem, CheckoutResult } from '../models/index.js';
import { ExternalCartContext, ExternalCart } from '../models/index.js';

export interface CommerceProviderInterface {
  /**
   * Create a new cart in the external provider
   */
  createCart(userId: string, items: CartItem[]): Promise<ExternalCartContext>;

  /**
   * Add an item to an existing external cart
   */
  addItem(contextId: string, item: CartItem): Promise<void>;

  /**
   * Remove an item from an existing external cart
   */
  removeItem(contextId: string, productId: string): Promise<void>;

  /**
   * Retrieve cart details from the external provider
   */
  getCart(contextId: string): Promise<ExternalCart>;

  /**
   * Validate if the context is still active
   */
  validateContext(contextId: string): Promise<boolean>;

  /**
   * Execute checkout with the external provider
   */
  checkout(contextId: string): Promise<CheckoutResult>;
}
