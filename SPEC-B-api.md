# SPEC-B: API Endpoint Contracts

## Overview

This document defines the RESTful API contracts for the telecom shopping cart service. The API provides endpoints for managing cart operations, handling checkout, and maintaining cart state with transparent external commerce provider integration.

**Base URL:** `/api/v1`

**Architecture Reference:** See [SPEC-A-architecture.md](./SPEC-A-architecture.md) for architectural details.

---

## Authentication & Authorization

**Note:** Authentication/authorization is out of scope for this implementation. The `userId` is passed directly in requests for simplicity.

In production:
- Use JWT tokens or session-based authentication
- Extract `userId` from authenticated session
- Implement role-based access control if needed

---

## Common Response Formats

### Success Response
```typescript
{
  "success": true,
  "data": <response_data>,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Error Response
```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Data Models

### Cart
```typescript
{
  "id": string,                    // Local cart identifier
  "userId": string,                // User identifier
  "items": CartItem[],            // Items in cart
  "totals": {
    "subtotal": number,           // Sum of all items
    "tax": number,                // Calculated tax
    "total": number               // Final total
  },
  "createdAt": string,            // ISO 8601 timestamp
  "updatedAt": string,            // ISO 8601 timestamp
  "syncStatus": "synced" | "pending" | "failed",
  "checkoutStatus": "pending" | "in_progress" | "completed" | "failed"
}
```

### CartItem
```typescript
{
  "productId": string,            // Product identifier
  "name": string,                 // Product name
  "type": "device" | "plan" | "addon",
  "quantity": number,             // Quantity (min: 1)
  "price": number,                // Price per unit
  "subtotal": number              // quantity * price
}
```

### CheckoutResult
```typescript
{
  "orderId": string,              // Order identifier from external provider
  "userId": string,               // User identifier
  "total": number,                // Order total
  "status": "completed",
  "items": CartItem[],           // Items that were checked out
  "completedAt": string          // ISO 8601 timestamp
}
```

---

## API Endpoints

## 1. Create or Get Cart

**Endpoint:** `GET /carts/:userId`

**Description:** Retrieves the current cart for a user. Creates a new empty cart if one doesn't exist.

**URL Parameters:**
- `userId` (string, required) - User identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [],
    "totals": {
      "subtotal": 0,
      "tax": 0,
      "total": 0
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z",
    "syncStatus": "synced",
    "checkoutStatus": "pending"
  },
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `500 Internal Server Error` - Server error

**Notes:**
- This is an optimistic read - no external provider interaction
- Always returns a cart (creates if doesn't exist)
- Cart includes sync status for monitoring

---

## 2. Add Item to Cart

**Endpoint:** `POST /carts/:userId/items`

**Description:** Adds a product to the user's cart. If the item already exists, updates the quantity.

**URL Parameters:**
- `userId` (string, required) - User identifier

**Request Body:**
```json
{
  "productId": "prod_789",
  "name": "iPhone 15 Pro",
  "type": "device",
  "quantity": 1,
  "price": 999.99
}
```

**Validation Rules:**
- `productId`: Required, non-empty string
- `name`: Required, non-empty string
- `type`: Required, must be one of: "device", "plan", "addon"
- `quantity`: Required, integer >= 1
- `price`: Required, number >= 0

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [
      {
        "productId": "prod_789",
        "name": "iPhone 15 Pro",
        "type": "device",
        "quantity": 1,
        "price": 999.99,
        "subtotal": 999.99
      }
    ],
    "totals": {
      "subtotal": 999.99,
      "tax": 70.00,
      "total": 1069.99
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:05:00.000Z",
    "syncStatus": "synced",
    "checkoutStatus": "pending"
  },
  "timestamp": "2025-01-15T10:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid item data",
    "details": {
      "fields": {
        "quantity": "Must be at least 1"
      }
    }
  },
  "timestamp": "2025-01-15T10:05:00.000Z"
}
```
- `503 Service Unavailable` - Operation queue timeout
- `500 Internal Server Error` - Server error

**Notes:**
- Operation is queued per user to prevent race conditions
- External provider sync happens asynchronously
- If sync fails, local cart is still updated (sync will retry on checkout)

---

## 3. Update Item Quantity

**Endpoint:** `PUT /carts/:userId/items/:productId`

**Description:** Updates the quantity of an existing item in the cart.

**URL Parameters:**
- `userId` (string, required) - User identifier
- `productId` (string, required) - Product identifier

**Request Body:**
```json
{
  "quantity": 2
}
```

**Validation Rules:**
- `quantity`: Required, integer >= 1

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [
      {
        "productId": "prod_789",
        "name": "iPhone 15 Pro",
        "type": "device",
        "quantity": 2,
        "price": 999.99,
        "subtotal": 1999.98
      }
    ],
    "totals": {
      "subtotal": 1999.98,
      "tax": 140.00,
      "total": 2139.98
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:10:00.000Z",
    "syncStatus": "synced",
    "checkoutStatus": "pending"
  },
  "timestamp": "2025-01-15T10:10:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `404 Not Found` - Item not in cart
```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item not found in cart",
    "details": {
      "productId": "prod_789"
    }
  },
  "timestamp": "2025-01-15T10:10:00.000Z"
}
```
- `503 Service Unavailable` - Operation queue timeout
- `500 Internal Server Error` - Server error

---

## 4. Remove Item from Cart

**Endpoint:** `DELETE /carts/:userId/items/:productId`

**Description:** Removes an item from the cart.

**URL Parameters:**
- `userId` (string, required) - User identifier
- `productId` (string, required) - Product identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [],
    "totals": {
      "subtotal": 0,
      "tax": 0,
      "total": 0
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:15:00.000Z",
    "syncStatus": "synced",
    "checkoutStatus": "pending"
  },
  "timestamp": "2025-01-15T10:15:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Item not in cart
- `503 Service Unavailable` - Operation queue timeout
- `500 Internal Server Error` - Server error

**Notes:**
- Removing non-existent item returns 404 (not idempotent by design for clarity)
- If this is the last item, cart becomes empty but is not deleted

---

## 5. Clear Cart

**Endpoint:** `DELETE /carts/:userId`

**Description:** Removes all items from the cart.

**URL Parameters:**
- `userId` (string, required) - User identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Cart cleared successfully"
  },
  "timestamp": "2025-01-15T10:20:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Cart doesn't exist
- `503 Service Unavailable` - Operation queue timeout
- `500 Internal Server Error` - Server error

**Notes:**
- Clears all items but keeps the cart entity
- Resets totals to zero
- Clears external provider context

---

## 6. Checkout

**Endpoint:** `POST /carts/:userId/checkout`

**Description:** Completes the checkout process for the user's cart. This operation is idempotent.

**URL Parameters:**
- `userId` (string, required) - User identifier

**Request Body:** (Optional)
```json
{
  "idempotencyKey": "checkout_unique_key_123" // Optional client-side idempotency key
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123",
    "userId": "user_456",
    "total": 1069.99,
    "status": "completed",
    "items": [
      {
        "productId": "prod_789",
        "name": "iPhone 15 Pro",
        "type": "device",
        "quantity": 1,
        "price": 999.99,
        "subtotal": 999.99
      }
    ],
    "completedAt": "2025-01-15T10:25:00.000Z"
  },
  "timestamp": "2025-01-15T10:25:00.000Z"
}
```

**Error Responses:**

**Empty Cart:**
```json
{
  "success": false,
  "error": {
    "code": "EMPTY_CART",
    "message": "Cannot checkout an empty cart",
    "details": {}
  },
  "timestamp": "2025-01-15T10:25:00.000Z"
}
```
**Status:** `400 Bad Request`

**Cart Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "CART_NOT_FOUND",
    "message": "Cart not found or already checked out",
    "details": {}
  },
  "timestamp": "2025-01-15T10:25:00.000Z"
}
```
**Status:** `404 Not Found`

**Already Checked Out (Idempotency):**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_OUT",
    "message": "Cart has already been checked out",
    "details": {
      "orderId": "order_abc123",
      "completedAt": "2025-01-15T10:25:00.000Z"
    }
  },
  "timestamp": "2025-01-15T10:26:00.000Z"
}
```
**Status:** `422 Unprocessable Entity`

**Checkout In Progress:**
```json
{
  "success": false,
  "error": {
    "code": "CHECKOUT_IN_PROGRESS",
    "message": "Checkout is already in progress for this cart",
    "details": {
      "startedAt": "2025-01-15T10:25:00.000Z"
    }
  },
  "timestamp": "2025-01-15T10:25:30.000Z"
}
```
**Status:** `422 Unprocessable Entity`

**External Provider Error:**
```json
{
  "success": false,
  "error": {
    "code": "CHECKOUT_FAILED",
    "message": "Checkout failed in external commerce provider",
    "details": {
      "provider": "salesforce",
      "reason": "Payment processing error"
    }
  },
  "timestamp": "2025-01-15T10:25:00.000Z"
}
```
**Status:** `422 Unprocessable Entity`

**Concurrency Error:**
```json
{
  "success": false,
  "error": {
    "code": "OPERATION_TIMEOUT",
    "message": "Operation queue is busy, please retry",
    "details": {}
  },
  "timestamp": "2025-01-15T10:25:00.000Z"
}
```
**Status:** `503 Service Unavailable`

**Notes:**
- **Idempotency:** Multiple checkout requests with same cart state return error (not duplicate order)
- Cart is validated and synced with external provider before checkout
- On success, cart is cleared from memory
- On failure, cart state is preserved and can be retried
- Checkout operation forces full reconciliation with external provider

---

## 7. Get Cart Summary

**Endpoint:** `GET /carts/:userId/summary`

**Description:** Returns a lightweight summary of the cart without full item details.

**URL Parameters:**
- `userId` (string, required) - User identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user_456",
    "itemCount": 3,
    "totals": {
      "subtotal": 2999.97,
      "tax": 210.00,
      "total": 3209.97
    },
    "syncStatus": "synced",
    "checkoutStatus": "pending",
    "lastUpdated": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Cart doesn't exist
- `500 Internal Server Error` - Server error

**Notes:**
- Lightweight endpoint for UI displays
- Useful for header/navbar cart indicators

---

## 8. Health Check

**Endpoint:** `GET /health`

**Description:** Returns the health status of the API and external provider connectivity.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2025-01-15T10:35:00.000Z",
    "services": {
      "api": "healthy",
      "externalProvider": "healthy",
      "cache": "healthy"
    },
    "uptime": 3600000
  },
  "timestamp": "2025-01-15T10:35:00.000Z"
}
```

**Degraded Status:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "version": "1.0.0",
    "timestamp": "2025-01-15T10:35:00.000Z",
    "services": {
      "api": "healthy",
      "externalProvider": "unhealthy",
      "cache": "healthy"
    },
    "uptime": 3600000
  },
  "timestamp": "2025-01-15T10:35:00.000Z"
}
```

**Notes:**
- Returns 200 even when degraded (external provider down)
- Cart operations continue to work with local state when degraded
- Checkout will fail when external provider is unhealthy

---

## Error Codes Reference

| Code | HTTP Status | Description | Retry |
|------|-------------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input data | No |
| `EMPTY_CART` | 400 | Cannot perform operation on empty cart | No |
| `CART_NOT_FOUND` | 404 | Cart does not exist | No |
| `ITEM_NOT_FOUND` | 404 | Item not in cart | No |
| `ALREADY_CHECKED_OUT` | 422 | Cart already checked out (idempotency) | No |
| `CHECKOUT_IN_PROGRESS` | 422 | Checkout currently processing | Yes (wait) |
| `CHECKOUT_FAILED` | 422 | External provider checkout failed | Yes |
| `OPERATION_TIMEOUT` | 503 | Queue busy, concurrent operations | Yes |
| `EXTERNAL_PROVIDER_ERROR` | 503 | External provider unavailable | Yes |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Yes |

---

## Rate Limiting

**Not implemented in current scope.**

Production recommendations:
- 100 requests per minute per user
- 10 checkout attempts per hour per user
- Implement exponential backoff for retries

---

## API Usage Examples

### Example 1: Complete Shopping Flow

```bash
# 1. Get cart (creates if doesn't exist)
GET /api/v1/carts/user_123

# 2. Add device to cart
POST /api/v1/carts/user_123/items
{
  "productId": "device_001",
  "name": "iPhone 15 Pro",
  "type": "device",
  "quantity": 1,
  "price": 999.99
}

# 3. Add plan to cart
POST /api/v1/carts/user_123/items
{
  "productId": "plan_001",
  "name": "Unlimited 5G Plan",
  "type": "plan",
  "quantity": 1,
  "price": 79.99
}

# 4. Update device quantity
PUT /api/v1/carts/user_123/items/device_001
{
  "quantity": 2
}

# 5. Check cart summary
GET /api/v1/carts/user_123/summary

# 6. Checkout
POST /api/v1/carts/user_123/checkout
```

### Example 2: Handling Idempotent Checkout

```bash
# First checkout attempt
POST /api/v1/carts/user_123/checkout
# Response: 200 OK with order details

# Second checkout attempt (user double-clicked)
POST /api/v1/carts/user_123/checkout
# Response: 422 Unprocessable Entity
# Error: "ALREADY_CHECKED_OUT"
# No duplicate order created ✓
```

### Example 3: Retry After Failure

```bash
# Checkout fails due to external provider error
POST /api/v1/carts/user_123/checkout
# Response: 422 Unprocessable Entity
# Error: "CHECKOUT_FAILED"

# Cart is preserved, user can retry
POST /api/v1/carts/user_123/checkout
# Response: 200 OK (if provider recovered)
```

---

## Versioning

**Current Version:** `v1`

API versioning strategy:
- Version included in URL path: `/api/v1/`
- Breaking changes require new version
- Old versions supported for 6 months minimum

---

## CORS Configuration

**Development:**
- Allow all origins: `*`

**Production:**
- Whitelist specific origins
- Include credentials if using cookies
- Allow methods: GET, POST, PUT, DELETE, OPTIONS
- Allow headers: Content-Type, Authorization

---

## Request/Response Headers

### Standard Request Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: <client-identifier>`

### Standard Response Headers
- `Content-Type: application/json`
- `X-Request-ID: <unique-request-id>` (for tracing)
- `X-RateLimit-Remaining: <count>` (when implemented)

---

## Testing Endpoints

All endpoints should be tested for:
1. **Happy path** - Normal successful operation
2. **Validation errors** - Invalid input data
3. **Idempotency** - Duplicate requests (where applicable)
4. **Concurrency** - Simultaneous requests
5. **Error recovery** - Retry after failure
6. **External provider failure** - Degraded mode operation

---

## OpenAPI/Swagger Specification

**TODO:** Generate OpenAPI 3.0 specification from this document for:
- Interactive API documentation
- Client SDK generation
- API testing tools integration
- Contract testing

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial API specification |

---

## References

- [SPEC-A: Architecture and Abstractions](./SPEC-A-architecture.md)
- [PROMPTS: User Prompt History](./PROMPTS.md)
