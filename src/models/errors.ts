/**
 * Custom error types
 * Uses centralized error constants for maintainability
 */

import {
  ErrorCode,
  ErrorMessages,
  ErrorConfig,
  ErrorName,
} from './error-constants.js';

export class CartError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = ErrorName.CART_ERROR;
  }
}

export class ValidationError extends CartError {
  constructor(
    message: string = ErrorConfig[ErrorCode.VALIDATION_ERROR].defaultMessage,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorConfig[ErrorCode.VALIDATION_ERROR].statusCode,
      details
    );
    this.name = ErrorName.VALIDATION_ERROR;
  }
}

export class CartNotFoundError extends CartError {
  constructor(
    message: string = ErrorConfig[ErrorCode.CART_NOT_FOUND].defaultMessage
  ) {
    super(
      message,
      ErrorCode.CART_NOT_FOUND,
      ErrorConfig[ErrorCode.CART_NOT_FOUND].statusCode
    );
    this.name = ErrorName.CART_NOT_FOUND_ERROR;
  }
}

export class ItemNotFoundError extends CartError {
  constructor(productId: string) {
    super(
      ErrorConfig[ErrorCode.ITEM_NOT_FOUND].defaultMessage,
      ErrorCode.ITEM_NOT_FOUND,
      ErrorConfig[ErrorCode.ITEM_NOT_FOUND].statusCode,
      { productId }
    );
    this.name = ErrorName.ITEM_NOT_FOUND_ERROR;
  }
}

export class CheckoutError extends CartError {
  constructor(
    message: string = ErrorConfig[ErrorCode.CHECKOUT_ERROR].defaultMessage,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCode.CHECKOUT_ERROR,
      ErrorConfig[ErrorCode.CHECKOUT_ERROR].statusCode,
      details
    );
    this.name = ErrorName.CHECKOUT_ERROR;
  }
}

export class EmptyCartError extends CartError {
  constructor() {
    super(
      ErrorConfig[ErrorCode.EMPTY_CART].defaultMessage,
      ErrorCode.EMPTY_CART,
      ErrorConfig[ErrorCode.EMPTY_CART].statusCode
    );
    this.name = ErrorName.EMPTY_CART_ERROR;
  }
}

export class ConcurrencyError extends CartError {
  constructor(
    message: string = ErrorConfig[ErrorCode.OPERATION_TIMEOUT].defaultMessage
  ) {
    super(
      message,
      ErrorCode.OPERATION_TIMEOUT,
      ErrorConfig[ErrorCode.OPERATION_TIMEOUT].statusCode
    );
    this.name = ErrorName.CONCURRENCY_ERROR;
  }
}

export class ExternalProviderError extends CartError {
  constructor(
    message: string = ErrorConfig[ErrorCode.EXTERNAL_PROVIDER_ERROR]
      .defaultMessage,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCode.EXTERNAL_PROVIDER_ERROR,
      ErrorConfig[ErrorCode.EXTERNAL_PROVIDER_ERROR].statusCode,
      details
    );
    this.name = ErrorName.EXTERNAL_PROVIDER_ERROR;
  }
}

export class ExternalProviderContextExpiredError extends Error {
  constructor(contextId: string) {
    super(ErrorMessages.EXTERNAL_PROVIDER_CONTEXT_EXPIRED(contextId));
    this.name = ErrorName.EXTERNAL_PROVIDER_CONTEXT_EXPIRED_ERROR;
  }
}
