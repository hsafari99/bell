/**
 * In-memory cart storage
 */

import { Cart } from '../models/index.js';

export class CartStore {
  private carts: Map<string, Cart> = new Map();

  async get(userId: string): Promise<Cart | null> {
    return this.carts.get(userId) || null;
  }

  async set(userId: string, cart: Cart): Promise<void> {
    this.carts.set(userId, cart);
  }

  async update(userId: string, cart: Cart): Promise<void> {
    cart.updatedAt = new Date();
    cart.lastAccessedAt = new Date();
    this.carts.set(userId, cart);
  }

  async delete(userId: string): Promise<void> {
    this.carts.delete(userId);
  }

  async exists(userId: string): Promise<boolean> {
    return this.carts.has(userId);
  }

  // Iteration support for cleanup service
  entries(): IterableIterator<[string, Cart]> {
    return this.carts.entries();
  }

  size(): number {
    return this.carts.size;
  }

  // Testing utility
  clear(): void {
    this.carts.clear();
  }
}
