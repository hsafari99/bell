# Telecom Cart Service

A production-ready RESTful API for managing a telecom shopping cart with seamless external commerce provider integration (Salesforce B2C Commerce Cloud).

## Features

✅ **Provider-Agnostic Architecture** - Easy migration between commerce platforms (Salesforce, Shopify, etc.)
✅ **State-Based Checkout Idempotency** - Prevents duplicate orders even if cleanup fails
✅ **Concurrency Control** - Per-user operation queues prevent race conditions
✅ **Self-Healing Synchronization** - Automatic retry and recovery from partial sync failures
✅ **Automatic Context Management** - Transparent recreation of expired provider contexts
✅ **Background Cleanup** - Automatic removal of expired carts and contexts
✅ **100% TypeScript** - Full type safety with strict mode
✅ **Comprehensive Tests** - 22 unit tests covering all critical paths

## Architecture

See [SPEC-A-architecture.md](./SPEC-A-architecture.md) for detailed architecture documentation.

**Key Components:**
- **API Layer**: Express routes with validation and error handling
- **Service Layer**: CartService (business logic), CartCleanupService (background jobs)
- **Integration Layer**: CommerceProviderInterface + SalesforceCommerceProvider (test double)
- **Storage Layer**: In-memory CartStore + ProviderContextStore
- **Utilities**: Operation queue, validators, pure calculation functions

## API Specification

See [SPEC-B-api.md](./SPEC-B-api.md) for complete API endpoint contracts.

**Available Endpoints:**
- `GET /api/v1/carts/:userId` - Get or create cart
- `POST /api/v1/carts/:userId/items` - Add item to cart
- `PUT /api/v1/carts/:userId/items/:productId` - Update item quantity
- `DELETE /api/v1/carts/:userId/items/:productId` - Remove item
- `DELETE /api/v1/carts/:userId` - Clear cart
- `POST /api/v1/carts/:userId/checkout` - Checkout (idempotent)
- `GET /api/v1/carts/:userId/summary` - Get cart summary
- `GET /api/v1/health` - Health check

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Running the Server

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm start
```

The server will start on port 3000 (configurable via `PORT` environment variable).

```
🚀 Telecom Cart Service running on port 3000
📍 API: http://localhost:3000/api/v1
❤️  Health: http://localhost:3000/api/v1/health
```

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage
```

**Test Results:**
```
Test Files  2 passed (2)
     Tests  22 passed (22)
```

## Example Usage

### Complete Shopping Flow

```bash
# 1. Get cart (creates if doesn't exist)
curl http://localhost:3000/api/v1/carts/user123

# 2. Add iPhone to cart
curl -X POST http://localhost:3000/api/v1/carts/user123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "iphone15",
    "name": "iPhone 15 Pro",
    "type": "device",
    "quantity": 1,
    "price": 999.99
  }'

# 3. Add plan to cart
curl -X POST http://localhost:3000/api/v1/carts/user123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "plan5g",
    "name": "Unlimited 5G Plan",
    "type": "plan",
    "quantity": 1,
    "price": 79.99
  }'

# 4. Update quantity
curl -X PUT http://localhost:3000/api/v1/carts/user123/items/iphone15 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 2}'

# 5. Get cart summary
curl http://localhost:3000/api/v1/carts/user123/summary

# 6. Checkout (idempotent)
curl -X POST http://localhost:3000/api/v1/carts/user123/checkout

# 7. Try to checkout again (will fail - cart already checked out)
curl -X POST http://localhost:3000/api/v1/carts/user123/checkout
# Response: {"success": false, "error": {"code": "CART_NOT_FOUND", ...}}
```

## Project Structure

```
src/
├── models/              # Domain models and types
│   ├── cart.ts
│   ├── external-context.ts
│   ├── api-responses.ts
│   ├── errors.ts
│   └── index.ts
├── providers/           # External commerce provider integration
│   ├── commerce-provider.interface.ts
│   ├── salesforce-commerce-provider.ts
│   └── index.ts
├── stores/              # In-memory storage
│   ├── cart-store.ts
│   ├── provider-context-store.ts
│   └── index.ts
├── services/            # Business logic
│   ├── cart.service.ts
│   ├── cart-cleanup.service.ts
│   └── index.ts
├── api/                 # Express routes
│   ├── cart.routes.ts
│   ├── health.routes.ts
│   ├── response-helpers.ts
│   └── index.ts
├── utils/               # Utility functions
│   ├── cart-operation-queue.ts
│   ├── cart-calculations.ts
│   ├── validators.ts
│   └── index.ts
└── index.ts             # Application entry point

tests/                   # Unit tests
├── cart.service.test.ts
└── salesforce-provider.test.ts
```

## Key Design Decisions

### 1. Optimistic Local State
- Local cart is the source of truth
- External provider sync happens lazily
- Reduces API calls and improves performance
- Enables graceful degradation when provider is unavailable

### 2. Per-User Serialization, Cross-User Parallelism
- Operations for the same user are serialized (prevents race conditions)
- Different users can operate in parallel (maintains throughput)
- Simple implementation without global locking

### 3. State-Based Checkout Idempotency
- Cart marked as `in_progress` BEFORE external checkout call
- Cart marked as `completed` BEFORE cleanup
- Cleanup failures don't affect idempotency guarantee
- Prevents duplicate orders even with system failures

### 4. Self-Healing Synchronization
- Partial sync failures don't break user experience
- System automatically retries on critical operations
- Full reconciliation on checkout ensures consistency

### 5. Background Cleanup
- Runs every 5 minutes
- Removes completed checkouts immediately
- Removes inactive carts after 24 hours
- Marks stuck checkouts as failed after 5 minutes

## Testing

The project includes comprehensive unit tests covering:

- ✅ Cart operations (add, update, remove, checkout)
- ✅ Checkout idempotency (duplicate prevention)
- ✅ Concurrency control (race conditions)
- ✅ Provider context expiry and recreation
- ✅ Validation errors
- ✅ Empty cart scenarios
- ✅ Concurrent operations for same/different users

Run tests with:
```bash
npm test
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| Context Expiry | 30 minutes | Salesforce context timeout (hardcoded) |
| Cleanup Interval | 5 minutes | Background cleanup frequency (hardcoded) |
| Cart Expiry | 24 hours | Inactive cart removal threshold (hardcoded) |

## Development Constraints

- ✅ Language: TypeScript on Node 20+
- ✅ No real Salesforce calls (test double with realistic behavior)
- ✅ No database (in-memory stores only)
- ✅ Unit tests for critical paths
- ✅ Small, cohesive, and clear code

## Operational Guarantees

### Concurrency Control
**Problem**: Multiple simultaneous requests for the same user's cart
**Solution**: Per-user operation queue serializes operations while allowing cross-user parallelism
**Guarantee**: No race conditions or lost updates; operations execute in order per user

### Checkout Idempotency
**Problem**: Cleanup failure after successful checkout could allow duplicate checkout
**Solution**: State-based idempotency with checkout status tracking
**Guarantee**: No duplicate checkouts even if cleanup fails

### Partial Sync Recovery
**Problem**: Network failures or provider errors during synchronization
**Solution**: Local-first architecture with sync status tracking and automatic retry
**Guarantee**: User operations always succeed locally; system self-heals on next critical operation

### Memory Cleanup
**Problem**: Abandoned carts accumulating in memory
**Solution**: Background cleanup service with automatic and manual triggers
**Schedule**: Every 5 minutes, remove carts inactive > 24 hours

## References

- [SPEC-A: Architecture and Abstractions](./SPEC-A-architecture.md)
- [SPEC-B: API Endpoint Contracts](./SPEC-B-api.md)
- [PROMPTS: Development History](./PROMPTS.md)

## License

MIT
