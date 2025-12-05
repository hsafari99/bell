# Telecom Cart Service

A production-ready RESTful API for managing a telecom shopping cart with seamless external commerce provider integration (Salesforce B2C Commerce Cloud).

## Features

✅ **Provider-Agnostic Architecture** - Easy migration between commerce platforms (Salesforce, Shopify, etc.)
✅ **State-Based Checkout Idempotency** - Prevents duplicate orders even if cleanup fails
✅ **Concurrency Control** - Per-user operation queues prevent race conditions
✅ **Self-Healing Synchronization** - Automatic retry and recovery from partial sync failures
✅ **Automatic Context Management** - Transparent recreation of expired provider contexts
✅ **Background Cleanup** - Automatic removal of expired carts and contexts
✅ **Jurisdiction-Specific Tax Calculation** - Canadian provinces (HST, GST+PST, GST+QST) with extensible calculator system
✅ **Result Pattern** - Explicit success/failure handling without exceptions
✅ **Centralized Error Management** - Scalable error messages ready for i18n
✅ **100% TypeScript** - Full type safety with strict mode
✅ **Comprehensive Tests** - 195 unit tests across 17 test files covering all critical paths
✅ **SOLID Principles** - Full adherence to Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion

## Architecture

See [SPEC-A-architecture.md](./SPEC-A-architecture.md) for detailed architecture documentation.

**Key Components:**
- **API Layer**: Express routes with validation and error handling
- **Service Layer**: CartService (business logic), TaxService (tax orchestration), CartCleanupService (background jobs)
- **Tax Calculation Layer**: TaxCalculator interface with jurisdiction-specific implementations (Strategy pattern)
- **Integration Layer**: CommerceProviderInterface + SalesforceCommerceProvider (test double)
- **Storage Layer**: In-memory CartStore, ProviderContextStore, TaxRateStore
- **Error Management**: Centralized error constants and messages (i18n-ready)
- **Utilities**: Operation queue, validators, pure calculation functions

**SOLID Principles Compliance:**
- **Single Responsibility**: Each class has one clear purpose (CartService for cart logic, TaxService for tax orchestration, etc.)
- **Open/Closed**: Extensible via interfaces (add new tax calculators or commerce providers without modifying existing code)
- **Liskov Substitution**: All interface implementations are interchangeable
- **Interface Segregation**: Focused, minimal interfaces (TaxCalculator, CommerceProviderInterface)
- **Dependency Inversion**: Dependencies on abstractions with constructor injection

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
Test Files  17 passed (17)
     Tests  195 passed (195)
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
│   ├── error-constants.ts
│   ├── tax.ts
│   └── index.ts
├── providers/           # External commerce provider integration
│   ├── commerce-provider.interface.ts
│   ├── salesforce-commerce-provider.ts
│   └── index.ts
├── stores/              # In-memory storage
│   ├── cart-store.ts
│   ├── provider-context-store.ts
│   ├── tax-rate-store.ts
│   └── index.ts
├── services/            # Business logic
│   ├── cart.service.ts
│   ├── cart-cleanup.service.ts
│   ├── tax.service.ts
│   ├── tax-calculators/
│   │   ├── tax-calculator.interface.ts
│   │   ├── canadian-tax-calculator.ts
│   │   └── index.ts
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

tests/                   # Unit tests (17 test files, 195 tests)
├── cart.service.test.ts
├── tax.service.test.ts
├── salesforce-provider.test.ts
├── models/
│   └── errors.test.ts
├── stores/
│   ├── cart-store.test.ts
│   ├── provider-context-store.test.ts
│   └── tax-rate-store.test.ts
├── services/
│   ├── cart.service.additional.test.ts
│   ├── cart-cleanup.service.test.ts
│   └── tax.service.exemptions.test.ts
├── tax-calculators/
│   └── canadian-tax-calculator.additional.test.ts
├── utils/
│   ├── cart-calculations.test.ts
│   ├── cart-operation-queue.test.ts
│   └── validators.test.ts
└── api/
    ├── cart.routes.test.ts
    ├── health.routes.test.ts
    └── response-helpers.test.ts
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

The project includes comprehensive unit tests (195 tests across 17 test files) covering:

**Cart Service Tests:**
- ✅ Cart operations (add, update, remove, checkout)
- ✅ Checkout idempotency (duplicate prevention)
- ✅ Result pattern (success/failure handling)
- ✅ Concurrency control (race conditions)
- ✅ Tax context management
- ✅ Sync scenarios and failures
- ✅ Concurrent operations for same/different users

**Tax Calculation Tests:**
- ✅ Canadian tax calculations (HST, GST+PST, GST+QST)
- ✅ Tax exemptions for different product types
- ✅ Multiple jurisdictions
- ✅ Tax stacking (Quebec QST)
- ✅ Time-based tax rate changes

**Provider Tests:**
- ✅ Provider context expiry and recreation
- ✅ Cart synchronization
- ✅ Checkout flows
- ✅ Idempotent operations

**Store Tests:**
- ✅ Cart store operations
- ✅ Provider context store
- ✅ Tax rate store

**Utility Tests:**
- ✅ Validation errors
- ✅ Cart calculations
- ✅ Operation queue
- ✅ Error handling

**API Tests:**
- ✅ Response helpers
- ✅ Cart routes
- ✅ Health check routes

**Service Tests:**
- ✅ Cleanup service
- ✅ Background jobs

Run tests with:
```bash
npm test

# Run with coverage
npm test:coverage

# Run in non-watch mode
npm test -- --run
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
