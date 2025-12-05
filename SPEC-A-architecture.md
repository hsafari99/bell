# SPEC-A: Architecture and Abstractions

## Overview

This document defines the architecture for a RESTful API that manages a telecom shopping cart with seamless Salesforce B2C Commerce Cloud integration.

### Purpose
The system provides a reliable, persistent cart experience for telecom products (devices, plans, and add-ons) while managing the underlying third-party commerce platform cart contexts, which are non-persistent and subject to expiration.

### Key Challenges
- **Context Expiration**: External commerce platform cart contexts expire after periods of inactivity
- **State Management**: Maintaining cart state independently of the external system
- **Transparent Recovery**: Recreating expired external carts without user disruption
- **Synchronization**: Ensuring consistency between local state and the external commerce platform
- **Provider Flexibility**: Supporting migration to different commerce platforms with minimal code changes

### Solution Approach
The architecture implements an optimistic local-first strategy where cart state is maintained in-memory as the source of truth, with lazy synchronization to the external commerce provider only when required (e.g., during checkout). The integration layer is abstracted through a provider interface, enabling seamless migration between different commerce platforms (currently Salesforce B2C Commerce Cloud). This approach minimizes external API calls, improves performance, and provides automatic recovery from context expiration.

## Core Problem
Third-party commerce platform cart contexts expire after a period of inactivity. We need to maintain cart state independently and recreate the external cart on-demand when operations require it, while keeping the integration layer modular to support future platform migrations.

## Architecture Layers

### 1. API Layer (HTTP Interface)
- Exposes RESTful endpoints for cart operations
- Handles request validation and error responses
- Delegates business logic to the Service Layer
- Uses Express.js or similar minimal framework

### 2. Service Layer (Business Logic)
**CartService**
- Orchestrates cart operations
- Manages the coordination between local cart state and the external commerce provider
- Handles cart state persistence in memory
- Implements cart recreation logic when external provider context expires

**Responsibilities:**
- Add/remove items from cart
- Calculate totals
- Validate cart operations
- Trigger external provider cart synchronization when needed
- Handle checkout flow
- Delegates commerce platform operations to the Integration Layer

### 3. Integration Layer

This layer provides an abstraction over the external commerce platform, enabling seamless migration between different providers.

**CommerceProviderInterface**
- Abstract interface defining cart operations for any commerce platform
- Ensures loose coupling between business logic and provider-specific implementation
- Standard methods: `createCart()`, `addItem()`, `removeItem()`, `getCart()`, `checkout()`, `validateContext()`

**CommerceProviderClient (Implementation)**
- Concrete implementation of the CommerceProviderInterface
- Currently implements Salesforce B2C Commerce Cloud integration (as test double)
- Manages external cart context lifecycle (creation, expiry, validation)
- Handles provider-specific API calls and error responses

**Provider Context Management:**
- External cart contexts expire after a configurable timeout (e.g., 30 minutes)
- Expired contexts throw appropriate errors for the service layer to handle
- Client must support recreating carts from scratch using local state
- Context validation before critical operations

**Design Benefits:**
- **Modularity**: Swapping commerce providers only requires implementing the interface
- **Testability**: Mock implementations can be easily created for testing
- **Maintainability**: Provider-specific logic is isolated from business logic
- **Extensibility**: Support for multiple providers can be added with minimal changes

### 4. Commerce Provider Interface

**CommerceProviderInterface Definition**
```typescript
interface CommerceProviderInterface {
  // Create a new cart in the external provider
  createCart(userId: string, items: CartItem[]): Promise<ExternalCartContext>;

  // Add an item to an existing external cart
  addItem(contextId: string, item: CartItem): Promise<void>;

  // Remove an item from an existing external cart
  removeItem(contextId: string, productId: string): Promise<void>;

  // Retrieve cart details from the external provider
  getCart(contextId: string): Promise<ExternalCart>;

  // Validate if the context is still active
  validateContext(contextId: string): Promise<boolean>;

  // Execute checkout with the external provider
  checkout(contextId: string): Promise<CheckoutResult>;
}
```

**Current Implementation: SalesforceCommerceProvider**
- Implements CommerceProviderInterface for Salesforce B2C Commerce Cloud
- Acts as a test double simulating realistic Salesforce behavior
- Handles context expiry simulation for testing

**Future Implementations:**
- `ShopifyCommerceProvider`: For Shopify integration
- `CustomCommerceProvider`: For custom/proprietary systems
- Any provider that implements the interface contract

### 5. Domain Models

**Cart**
```typescript
interface Cart {
  id: string;                    // Local cart identifier
  userId: string;                // User identifier
  items: CartItem[];            // Items in cart
  createdAt: Date;              // Cart creation timestamp
  updatedAt: Date;              // Last modification timestamp
  lastAccessedAt: Date;          // Last access time (for cleanup)
  externalCartId?: string;      // Current external provider cart context ID (may be expired)

  // Sync tracking
  syncStatus: 'synced' | 'pending' | 'failed';  // Synchronization state
  lastSyncedAt?: Date;           // When last successful sync occurred
  lastSyncError?: string;        // Last error message if sync failed

  // Checkout idempotency tracking
  checkoutStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  checkoutStartedAt?: Date;      // When checkout was initiated
  checkoutCompletedAt?: Date;    // When checkout completed successfully
  checkoutResult?: CheckoutResult;  // Cached result for idempotent retries
  checkoutError?: string;        // Error if checkout failed
}
```

**CartItem**
```typescript
interface CartItem {
  productId: string;            // Telecom product identifier (e.g., plan, device)
  quantity: number;
  price: number;                // Price per unit
  name: string;                 // Product name
  type: 'device' | 'plan' | 'addon';  // Product category
}
```

**ExternalCartContext**
```typescript
interface ExternalCartContext {
  contextId: string;            // External provider session/context ID
  cartId: string;               // External provider cart ID
  provider: string;             // Provider name (e.g., 'salesforce', 'shopify')
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}
```

## Data Flow Patterns

### Pattern 1: Add Item to Cart
1. Client calls API to add item
2. CartService validates item
3. CartService adds item to local cart state
4. CartService delegates to Integration Layer:
   - If external provider context exists and is valid:
     - Update external cart via CommerceProviderClient
   - If external provider context is expired or doesn't exist:
     - Create new external cart via CommerceProviderClient
     - Sync all items to new external cart
     - Store new context ID
5. Return updated cart to client

### Pattern 2: Checkout Flow (with Idempotency)
1. Client initiates checkout
2. CartService retrieves local cart
3. **Idempotency Check**:
   - If `checkoutStatus === 'completed'`: Return error or cached result
   - If `checkoutStatus === 'in_progress'`: Return error (checkout in progress)
   - If `checkoutStatus === 'failed'` or `'pending'`: Continue to checkout
4. **Mark cart as 'in_progress'** (CRITICAL: before external call)
5. CartService ensures valid external provider cart exists:
   - Check if context is expired via CommerceProviderClient
   - If expired: create new cart and sync all items via Integration Layer
   - If valid: use existing cart
6. Call external provider checkout API via CommerceProviderClient
7. **Mark cart as 'completed' and cache result** (CRITICAL: before cleanup)
8. Clear local cart state (best-effort - failure doesn't affect idempotency)
9. Return checkout confirmation

**Idempotency Guarantee**: Steps 4 and 7 ensure no duplicate checkouts even if cleanup fails

### Pattern 3: Get Cart
1. Client requests current cart
2. CartService returns local cart state
3. No external provider interaction needed (optimistic read)

## Storage Strategy

### In-Memory Stores
**CartStore**
- Key: userId
- Value: Cart object
- Simple Map-based implementation
- No persistence across server restarts (acceptable for this demo)

**ExternalContextStore**
- Key: userId
- Value: ExternalCartContext
- Tracks active external provider sessions
- Cleaned up on expiry

### Cleanup Strategy

**Automatic Cleanup Process:**
- Background cleanup task runs every 5 minutes
- Removes carts inactive for > 24 hours from CartStore
- Removes expired contexts from ExternalContextStore
- Uses `lastAccessedAt` timestamp updated on every cart operation

**Manual Cleanup Triggers:**
- On successful checkout: immediately remove cart and context
- On cart deletion: remove both cart and associated context
- On server shutdown: graceful cleanup of all expired entries (optional)

**Implementation Pattern:**
```typescript
class CartCleanupService {
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes

  startCleanup() {
    setInterval(() => {
      this.cleanupExpiredCarts();
      this.cleanupExpiredContexts();
    }, this.cleanupInterval);
  }

  private cleanupExpiredCarts() {
    const expiryThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    // Remove carts where lastAccessedAt < expiryThreshold
  }

  private cleanupExpiredContexts() {
    // Remove contexts where isExpired === true
  }
}
```

## Concurrency Control Strategy

### Problem Statement
Multiple concurrent requests for the same user's cart can lead to race conditions, lost updates, or inconsistent state between local cart and external provider.

### Solution: Optimistic Locking with Operation Queue

**Per-User Operation Queue:**
```typescript
class CartOperationQueue {
  private queues: Map<string, Promise<any>> = new Map();

  async enqueue<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    // Wait for previous operation to complete
    const previousOp = this.queues.get(userId) || Promise.resolve();

    // Chain new operation
    const currentOp = previousOp
      .then(() => operation())
      .catch((err) => {
        // Log error but don't block queue
        console.error(`Operation failed for user ${userId}:`, err);
        throw err;
      })
      .finally(() => {
        // Clean up if this is the last operation
        if (this.queues.get(userId) === currentOp) {
          this.queues.delete(userId);
        }
      });

    this.queues.set(userId, currentOp);
    return currentOp;
  }
}
```

**Usage in CartService:**
```typescript
class CartService {
  private operationQueue = new CartOperationQueue();

  async addItem(userId: string, item: CartItem): Promise<Cart> {
    return this.operationQueue.enqueue(userId, async () => {
      // Perform cart operation atomically
      const cart = await this.getOrCreateCart(userId);
      cart.items.push(item);
      await this.syncToExternalProvider(cart);
      return cart;
    });
  }
}
```

**Benefits:**
- Serializes operations per user (different users can run concurrently)
- Prevents race conditions and lost updates
- Simple implementation without complex locking mechanisms
- Non-blocking for different users

**Alternative Approach (if needed):**
- Version-based optimistic locking with retry logic
- Add `version` field to Cart model
- Increment version on each update
- Retry on version conflict

## Synchronization and Partial Sync Recovery

### Context Validation Strategy

**When to Validate Context:**
1. **Before Critical Operations**: Always validate before checkout
2. **Lazy Validation**: Don't validate on every cart read (optimistic)
3. **After Long Idle Periods**: Validate if last sync was > 15 minutes ago
4. **On External Provider Errors**: Revalidate if provider returns context errors

**Validation Implementation:**
```typescript
class CartService {
  private async ensureValidContext(
    userId: string,
    cart: Cart
  ): Promise<ExternalCartContext> {
    const context = await this.contextStore.get(userId);

    // No context exists - create new one
    if (!context) {
      return this.createAndSyncContext(userId, cart);
    }

    // Context expired - recreate
    if (context.isExpired || context.expiresAt < new Date()) {
      return this.createAndSyncContext(userId, cart);
    }

    // Context exists but validate with provider (for critical operations)
    const isValid = await this.provider.validateContext(context.contextId);
    if (!isValid) {
      return this.createAndSyncContext(userId, cart);
    }

    return context;
  }
}
```

### Partial Sync Recovery

**Problem:**
If synchronization to external provider fails mid-operation (e.g., network timeout, provider error), the local cart may be out of sync with the external cart.

**Recovery Strategy:**

**1. Transactional Sync Pattern:**
```typescript
async syncToExternalProvider(cart: Cart): Promise<void> {
  const context = await this.getOrCreateContext(cart.userId, cart);

  try {
    // Full reconciliation: sync all items
    const externalCart = await this.provider.getCart(context.contextId);

    // Calculate diff between local and external
    const itemsToAdd = this.findItemsToAdd(cart.items, externalCart.items);
    const itemsToRemove = this.findItemsToRemove(cart.items, externalCart.items);

    // Apply changes
    for (const item of itemsToRemove) {
      await this.provider.removeItem(context.contextId, item.productId);
    }

    for (const item of itemsToAdd) {
      await this.provider.addItem(context.contextId, item);
    }

    // Mark sync successful
    cart.lastSyncedAt = new Date();

  } catch (error) {
    // On failure, mark cart as needs resync
    cart.syncStatus = 'pending';
    cart.lastSyncError = error.message;

    // Don't fail the user operation - local state is still updated
    console.error(`Sync failed for user ${cart.userId}:`, error);

    // Retry will happen on next critical operation (e.g., checkout)
  }
}
```

**2. Idempotent Operations:**
- All provider operations are idempotent where possible
- Adding same item twice with same quantity should not duplicate
- Removing non-existent item should not error

**3. Recovery on Checkout:**
```typescript
async checkout(userId: string): Promise<CheckoutResult> {
  return this.operationQueue.enqueue(userId, async () => {
    const cart = await this.cartStore.get(userId);

    if (!cart) {
      throw new CartNotFoundError('Cart not found or already checked out');
    }

    // Check if cart is already in checkout state (idempotency guard)
    if (cart.checkoutStatus === 'completed') {
      throw new CheckoutError('Cart already checked out');
    }

    if (cart.checkoutStatus === 'in_progress') {
      throw new CheckoutError('Checkout already in progress');
    }

    try {
      // STEP 1: Mark cart as in_progress BEFORE checkout (critical for idempotency)
      cart.checkoutStatus = 'in_progress';
      cart.checkoutStartedAt = new Date();
      await this.cartStore.update(userId, cart);

      // STEP 2: Force full resync before checkout
      const context = await this.createAndSyncContext(userId, cart);

      // STEP 3: Verify sync succeeded by checking external cart
      const externalCart = await this.provider.getCart(context.contextId);
      this.validateCartMatch(cart, externalCart);

      // STEP 4: Proceed with checkout in external provider
      const result = await this.provider.checkout(context.contextId);

      // STEP 5: Mark as completed BEFORE cleanup
      cart.checkoutStatus = 'completed';
      cart.checkoutCompletedAt = new Date();
      cart.checkoutResult = result;
      await this.cartStore.update(userId, cart);

      // STEP 6: Clean up (best effort - failure here doesn't affect idempotency)
      try {
        await this.cartStore.delete(userId);
        await this.contextStore.delete(userId);
      } catch (cleanupError) {
        // Log but don't fail - cleanup will happen via scheduled task
        console.error(`Cleanup failed for user ${userId}:`, cleanupError);
      }

      return result;

    } catch (error) {
      // Rollback checkout status on failure
      cart.checkoutStatus = 'pending';
      cart.checkoutError = error.message;
      await this.cartStore.update(userId, cart);
      throw error;
    }
  });
}
```

**Enhanced Cart Model with Checkout Idempotency:**
```typescript
interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;          // For cleanup
  externalCartId?: string;

  // Sync tracking
  syncStatus: 'synced' | 'pending' | 'failed';  // Track sync state
  lastSyncedAt?: Date;           // When last successful sync occurred
  lastSyncError?: string;        // Last error message if sync failed

  // Checkout idempotency tracking
  checkoutStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  checkoutStartedAt?: Date;      // When checkout was initiated
  checkoutCompletedAt?: Date;    // When checkout completed successfully
  checkoutResult?: CheckoutResult;  // Cached result for idempotent retries
  checkoutError?: string;        // Error if checkout failed
}
```

**Recovery Guarantees:**
- Local cart is always source of truth
- External cart is best-effort synchronized
- Critical operations (checkout) force full reconciliation
- Partial failures don't break user experience
- System self-heals on next critical operation

## Checkout Idempotency Strategy

### Problem Statement
If cleanup fails after a successful checkout, the cart remains in memory with all items intact. A subsequent checkout request could process the same cart twice, leading to:
- Duplicate orders in the external provider
- Duplicate charges to the customer
- Inventory issues
- Data inconsistency

### Solution: State-Based Idempotency

**Checkout State Machine:**
```
pending -> in_progress -> completed
             |
             v
           failed -> pending (retry allowed)
```

**Key Principles:**

1. **Mark Before Execute**: Update `checkoutStatus = 'in_progress'` BEFORE calling external provider
2. **Cache Result**: Store `checkoutResult` in cart BEFORE cleanup
3. **Guard on Entry**: Reject checkout if status is `in_progress` or `completed`
4. **Best-Effort Cleanup**: Cleanup failure doesn't affect idempotency guarantee

**Idempotency Scenarios:**

**Scenario 1: Cleanup Fails After Successful Checkout**
```
User clicks checkout
→ Cart marked as 'in_progress'
→ External provider checkout succeeds
→ Cart marked as 'completed' with result cached
→ Cleanup fails (cart remains in memory)
→ User clicks checkout again
→ System detects cart.checkoutStatus === 'completed'
→ Returns error: "Cart already checked out"
✓ Duplicate checkout prevented
```

**Scenario 2: Network Timeout During Cleanup**
```
User clicks checkout
→ Cart marked as 'in_progress'
→ External provider checkout succeeds
→ Cart marked as 'completed'
→ Network timeout during cleanup
→ User retries checkout
→ System detects cart.checkoutStatus === 'completed'
→ Returns cached checkoutResult (optional) or error
✓ Idempotent response
```

**Scenario 3: Concurrent Checkout Requests**
```
User double-clicks checkout
→ Request 1: Cart marked as 'in_progress'
→ Request 2 (concurrent): Blocked by operation queue
→ Request 2 starts: detects cart.checkoutStatus === 'in_progress'
→ Returns error: "Checkout already in progress"
✓ Race condition prevented by queue + status check
```

**Scenario 4: Checkout Fails in External Provider**
```
User clicks checkout
→ Cart marked as 'in_progress'
→ External provider returns error
→ Cart marked as 'failed' with error message
→ Cart status rolled back to 'pending'
→ User can retry checkout
✓ Retry allowed after genuine failure
```

**Implementation Safeguards:**

```typescript
// API Layer: Optional idempotent checkout with cached result
async checkout(userId: string, idempotencyKey?: string): Promise<CheckoutResult> {
  return this.operationQueue.enqueue(userId, async () => {
    const cart = await this.cartStore.get(userId);

    if (!cart) {
      throw new CartNotFoundError('Cart not found or already checked out');
    }

    // Return cached result for completed checkouts (optional optimization)
    if (cart.checkoutStatus === 'completed') {
      if (cart.checkoutResult) {
        console.log(`Returning cached checkout result for user ${userId}`);
        return cart.checkoutResult;
      }
      throw new CheckoutError('Cart already checked out');
    }

    // Prevent concurrent checkouts
    if (cart.checkoutStatus === 'in_progress') {
      const elapsed = Date.now() - cart.checkoutStartedAt.getTime();
      if (elapsed < 60000) { // 1 minute timeout
        throw new CheckoutError('Checkout already in progress');
      }
      // If checkout has been stuck for >1 minute, allow retry
      console.warn(`Checkout timeout for user ${userId}, allowing retry`);
    }

    // Proceed with checkout...
  });
}
```

**Cleanup Enhancement:**

```typescript
class CartCleanupService {
  private cleanupExpiredCarts() {
    const expiryThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [userId, cart] of this.cartStore.entries()) {
      // Clean up completed checkouts immediately
      if (cart.checkoutStatus === 'completed') {
        this.cartStore.delete(userId);
        this.contextStore.delete(userId);
        continue;
      }

      // Clean up failed checkouts after 1 hour
      if (cart.checkoutStatus === 'failed') {
        const failedAt = cart.checkoutStartedAt?.getTime() || 0;
        if (Date.now() - failedAt > 60 * 60 * 1000) {
          this.cartStore.delete(userId);
          continue;
        }
      }

      // Clean up stuck 'in_progress' checkouts after timeout
      if (cart.checkoutStatus === 'in_progress') {
        const startedAt = cart.checkoutStartedAt?.getTime() || 0;
        if (Date.now() - startedAt > 5 * 60 * 1000) { // 5 minutes
          cart.checkoutStatus = 'failed';
          cart.checkoutError = 'Checkout timeout - please retry';
        }
      }

      // Clean up old inactive carts
      if (cart.lastAccessedAt < expiryThreshold) {
        this.cartStore.delete(userId);
      }
    }
  }
}
```

**Guarantees:**
- ✓ No duplicate checkouts even if cleanup fails
- ✓ No duplicate checkouts from concurrent requests
- ✓ Retry allowed only for genuine failures
- ✓ Stuck checkouts auto-recovered after timeout
- ✓ Completed checkouts eventually cleaned up
- ✓ Optional: Return cached result for retried completed checkouts

## Error Handling Strategy

### Error Types
1. **ValidationError**: Invalid input (400)
2. **CartNotFoundError**: Cart doesn't exist (404)
3. **ExternalProviderContextExpiredError**: Internal - triggers cart recreation
4. **PartialSyncError**: Sync failed but local cart updated (logged, not surfaced to user)
5. **CheckoutError**: Checkout failed or already completed (422)
   - "Cart already checked out" - idempotency violation detected
   - "Checkout already in progress" - concurrent checkout attempt
   - External provider error - genuine checkout failure
6. **ConcurrencyError**: Operation timeout due to queue (503)
7. **InternalError**: Unexpected errors (500)

### Recovery Patterns
- On external provider context expiry: Automatically recreate cart and resync
- On validation errors: Return clear error messages
- On checkout errors:
  - Already completed: Return error or cached result (idempotent)
  - Already in progress: Return error, user should wait
  - Genuine failure: Preserve cart state, allow retry
- On partial sync errors: Log error, continue operation, retry on next critical operation
- On concurrency timeouts: Inform user to retry (queue is busy)

## Key Design Decisions

### 1. Optimistic Local State
- Keep cart state locally as source of truth
- Sync to external provider only when necessary (lazy synchronization)
- Reduces external API calls and improves performance
- Enables graceful degradation when provider is unavailable

### 2. Stateless API Design
- Each request contains userId (in headers or path)
- No session cookies required
- Simplifies horizontal scaling
- Operation queue maintained in-memory per instance

### 3. Pure Functions Where Possible
- Cart calculations (totals, validation) are pure functions
- Easier to test and reason about
- Separate pure logic from side effects

### 4. Test Double for External Provider
- Realistic behavior simulation for Salesforce B2C Commerce Cloud
- Configurable expiry timeouts
- No external dependencies
- Easy to swap with real implementation

### 5. Per-User Serialization, Cross-User Parallelism
- Operations for same user are serialized (queue pattern)
- Different users can execute operations in parallel
- Prevents race conditions without global locking
- Maximizes throughput while maintaining consistency

### 6. Self-Healing Synchronization
- Partial sync failures don't break user experience
- System automatically retries sync on critical operations
- Full reconciliation on checkout ensures consistency
- Local state preserved even when provider fails

### 7. Checkout Idempotency
- State-based idempotency prevents duplicate checkouts
- Checkout status tracked through state machine (pending → in_progress → completed)
- Status marked BEFORE external provider call
- Cleanup failures don't compromise idempotency guarantee
- Stuck checkouts auto-recovered after timeout

## Testing Strategy

### Unit Tests Required For:
1. CartService operations (add, remove, checkout)
2. Cart recreation logic when external provider context expires
3. Pure functions (calculations, validations)
4. CommerceProviderClient behavior (expiry simulation)
5. CartOperationQueue concurrency handling
6. Partial sync recovery logic
7. Context validation strategy
8. Cleanup service functionality
9. **Checkout idempotency scenarios**:
   - Duplicate checkout prevention after cleanup failure
   - Concurrent checkout request blocking
   - Cached result return for completed checkouts
   - Retry allowed after genuine failures
   - Stuck checkout timeout and recovery

### Test Coverage Focus:
- Happy paths for all operations
- External provider context expiry scenarios
- Concurrent request handling (race conditions)
- Partial sync failures and recovery
- **Checkout idempotency edge cases**:
  - Cleanup fails after successful checkout
  - Double-click/concurrent checkout requests
  - Network timeout during cleanup
  - Checkout stuck in 'in_progress' state
  - Retry after genuine checkout failure
- Edge cases (empty cart, invalid items, duplicate items)
- Error handling and recovery
- Cleanup triggers and scheduled cleanup
- Full reconciliation on checkout

## Non-Requirements (Out of Scope)
- User authentication/authorization
- Real database persistence
- Multiple concurrent carts per user
- Cart sharing or collaboration
- Payment processing details
- Real Salesforce API integration
- Production monitoring/logging
- Rate limiting
- Caching layers

## Technology Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **HTTP Framework**: Express.js (or similar minimal framework)
- **Testing**: Jest or Vitest
- **No external databases**: In-memory only

## Operational Guarantees Summary

This section summarizes the architectural solutions to key operational concerns:

### Concurrency Control
**Problem**: Multiple simultaneous requests for the same user's cart
**Solution**: Per-user operation queue serializes operations while allowing cross-user parallelism
**Guarantee**: No race conditions or lost updates; operations execute in order per user

### Partial Sync Recovery
**Problem**: Network failures or provider errors during synchronization
**Solution**: Local-first architecture with sync status tracking and automatic retry
**Guarantee**: User operations always succeed locally; system self-heals on next critical operation

### Context Validation
**Problem**: When to check if external provider context is still valid
**Solution**: Lazy validation with forced validation before critical operations (checkout)
**Strategy**:
- Don't validate on reads (optimistic)
- Validate before checkout (critical)
- Validate after 15+ minutes idle
- Recreate context if validation fails

### Memory Cleanup
**Problem**: Abandoned carts accumulating in memory
**Solution**: Background cleanup service with automatic and manual triggers
**Schedule**:
- Automatic: Every 5 minutes, remove carts inactive > 24 hours
- Manual: On checkout, on deletion
- Cleanup both CartStore and ExternalContextStore
- Smart cleanup: Completed checkouts removed immediately, stuck checkouts marked as failed

### Checkout Idempotency
**Problem**: Cleanup failure after successful checkout could allow duplicate checkout
**Solution**: State-based idempotency with checkout status tracking
**Guarantee**: No duplicate checkouts even if cleanup fails
**Mechanism**:
- Mark cart as 'in_progress' BEFORE calling external provider
- Mark cart as 'completed' AFTER successful checkout
- Reject subsequent checkout attempts on 'completed' or 'in_progress' carts
- Optional: Return cached result for retried completed checkouts
- Stuck checkouts (>5 min) automatically marked as failed

### System Resilience
The architecture provides multiple layers of fault tolerance:
1. **Local state preservation**: User operations never fail due to external provider issues
2. **Automatic recovery**: System recreates expired contexts transparently
3. **Full reconciliation**: Checkout ensures perfect sync before completing transaction
4. **Graceful degradation**: Cart remains functional even if external provider is down
5. **Self-healing**: Partial failures automatically retry on next critical operation
6. **Checkout protection**: State-based idempotency prevents duplicate orders even with cleanup failures
