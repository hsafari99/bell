/**
 * ProviderContextStore
 *
 * Stores the 3rd-party commerce provider context (session) information.
 * Maps userId → ExternalCartContext (contains contextId, cartId, expiry info)
 *
 * Why separate from CartStore?
 * - Local cart data (CartStore) = permanent, source of truth
 * - Provider context (ProviderContextStore) = temporary, expires after inactivity
 * - When provider context expires, we recreate it from CartStore data
 *
 * Example flow:
 * 1. User adds item → CartStore updated
 * 2. Sync to Salesforce → ProviderContextStore tracks the Salesforce session
 * 3. Session expires (30min) → ProviderContextStore removes expired entry
 * 4. User checks out → System recreates Salesforce session from CartStore data
 */

import { ExternalCartContext } from '../models/index.js';

export class ProviderContextStore {
  private contexts: Map<string, ExternalCartContext> = new Map();

  async get(userId: string): Promise<ExternalCartContext | null> {
    const context = this.contexts.get(userId);

    if (!context) {
      return null;
    }

    // Auto-cleanup expired contexts
    if (context.isExpired || context.expiresAt < new Date()) {
      this.contexts.delete(userId);
      return null;
    }

    return context;
  }

  async set(userId: string, context: ExternalCartContext): Promise<void> {
    this.contexts.set(userId, context);
  }

  async delete(userId: string): Promise<void> {
    this.contexts.delete(userId);
  }

  async exists(userId: string): Promise<boolean> {
    const context = await this.get(userId);
    return context !== null;
  }

  // Iteration support for cleanup service
  entries(): IterableIterator<[string, ExternalCartContext]> {
    return this.contexts.entries();
  }

  size(): number {
    return this.contexts.size;
  }

  // Testing utility
  clear(): void {
    this.contexts.clear();
  }
}
