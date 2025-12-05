/**
 * Error constants - centralized error codes and messages
 * This makes error management scalable and maintainable
 */

/**
 * Error codes enum for type safety
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CART_NOT_FOUND = 'CART_NOT_FOUND',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  CHECKOUT_ERROR = 'CHECKOUT_ERROR',
  EMPTY_CART = 'EMPTY_CART',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  EXTERNAL_PROVIDER_ERROR = 'EXTERNAL_PROVIDER_ERROR',
}

/**
 * Error class names - centralized for maintainability
 */
export const ErrorName: Record<string, string> = {
  CART_ERROR: 'CartError',
  VALIDATION_ERROR: 'ValidationError',
  CART_NOT_FOUND_ERROR: 'CartNotFoundError',
  ITEM_NOT_FOUND_ERROR: 'ItemNotFoundError',
  CHECKOUT_ERROR: 'CheckoutError',
  EMPTY_CART_ERROR: 'EmptyCartError',
  CONCURRENCY_ERROR: 'ConcurrencyError',
  EXTERNAL_PROVIDER_ERROR: 'ExternalProviderError',
  EXTERNAL_PROVIDER_CONTEXT_EXPIRED_ERROR: 'ExternalProviderContextExpiredError',
} as const;

/**
 * HTTP status codes for errors
 */
export enum ErrorStatusCode {
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Default error messages
 * Can be extended to support i18n in the future
 */
export const ErrorMessages = {
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed',
  [ErrorCode.CART_NOT_FOUND]: 'Cart not found or already checked out',
  [ErrorCode.ITEM_NOT_FOUND]: 'Item not found in cart',
  [ErrorCode.CHECKOUT_ERROR]: 'Checkout failed',
  [ErrorCode.EMPTY_CART]: 'Cannot checkout an empty cart',
  [ErrorCode.OPERATION_TIMEOUT]: 'Operation queue is busy, please retry',
  [ErrorCode.EXTERNAL_PROVIDER_ERROR]: 'External provider error',
  EXTERNAL_PROVIDER_CONTEXT_EXPIRED: (contextId: string) =>
    `External provider context expired: ${contextId}`,
  // Additional checkout-related messages
  CART_ALREADY_CHECKED_OUT: 'Cart already checked out',
  CHECKOUT_IN_PROGRESS: 'Checkout already in progress',
  PROVIDER_CHECKOUT_FAILED: 'Provider checkout failed',
  UNKNOWN_ERROR: 'Unknown error',
  CART_SYNC_VALIDATION_FAILED_ITEM_COUNT: 'Cart sync validation failed: item count mismatch',
  CART_SYNC_VALIDATION_FAILED_ITEM_MISMATCH: 'Cart sync validation failed: item mismatch',
  // Validation error messages
  INVALID_ITEM_DATA: 'Invalid item data',
  QUANTITY_MUST_BE_INTEGER: 'Quantity must be an integer >= 1',
} as const;

/**
 * Field-level validation error messages
 * Used for specific field validation errors
 */
export const ValidationMessages = {
  PRODUCT_ID_REQUIRED: 'Product ID is required',
  PRODUCT_NAME_REQUIRED: 'Product name is required',
  TYPE_MUST_BE_ONE_OF: (validTypes: readonly string[]) =>
    `Type must be one of: ${validTypes.join(', ')}`,
  QUANTITY_MUST_BE_INTEGER: 'Quantity must be an integer >= 1',
  QUANTITY_MUST_BE_INTEGER_FIELD: 'Must be an integer >= 1',
  PRICE_MUST_BE_NON_NEGATIVE: 'Price must be >= 0',
} as const;

/**
 * Error metadata configuration
 * Centralizes error code, status code, and default message mapping
 */
export const ErrorConfig = {
  [ErrorCode.VALIDATION_ERROR]: {
    statusCode: ErrorStatusCode.BAD_REQUEST,
    defaultMessage: ErrorMessages[ErrorCode.VALIDATION_ERROR],
  },
  [ErrorCode.CART_NOT_FOUND]: {
    statusCode: ErrorStatusCode.NOT_FOUND,
    defaultMessage: ErrorMessages[ErrorCode.CART_NOT_FOUND],
  },
  [ErrorCode.ITEM_NOT_FOUND]: {
    statusCode: ErrorStatusCode.NOT_FOUND,
    defaultMessage: ErrorMessages[ErrorCode.ITEM_NOT_FOUND],
  },
  [ErrorCode.CHECKOUT_ERROR]: {
    statusCode: ErrorStatusCode.UNPROCESSABLE_ENTITY,
    defaultMessage: ErrorMessages[ErrorCode.CHECKOUT_ERROR],
  },
  [ErrorCode.EMPTY_CART]: {
    statusCode: ErrorStatusCode.BAD_REQUEST,
    defaultMessage: ErrorMessages[ErrorCode.EMPTY_CART],
  },
  [ErrorCode.OPERATION_TIMEOUT]: {
    statusCode: ErrorStatusCode.SERVICE_UNAVAILABLE,
    defaultMessage: ErrorMessages[ErrorCode.OPERATION_TIMEOUT],
  },
  [ErrorCode.EXTERNAL_PROVIDER_ERROR]: {
    statusCode: ErrorStatusCode.SERVICE_UNAVAILABLE,
    defaultMessage: ErrorMessages[ErrorCode.EXTERNAL_PROVIDER_ERROR],
  },
} as const;

/**
 * Provider-specific constants
 * Values used across providers that should be centralized
 */
export const ProviderConstants = {
  UNKNOWN_USER_ID: 'unknown',
  DEFAULT_JURISDICTION: 'CA-ON', // Default to Ontario, Canada
} as const;
