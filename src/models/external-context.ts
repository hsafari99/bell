/**
 * External commerce provider context model
 */

import { CartItem } from './cart.js';

export interface ExternalCartContext {
  contextId: string;
  cartId: string;
  provider: string;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

export interface ExternalCart {
  cartId: string;
  items: CartItem[];
}
