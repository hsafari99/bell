/**
 * Error model tests
 */

import { describe, it, expect } from 'vitest';
import {
  CartError,
  ValidationError,
  CartNotFoundError,
  ItemNotFoundError,
  CheckoutError,
  EmptyCartError,
  ConcurrencyError,
  ExternalProviderError,
  ExternalProviderContextExpiredError,
} from '../../src/models/errors.js';
import { ErrorCode, ErrorMessages } from '../../src/models/error-constants.js';

describe('Error Models', () => {
  describe('CartError', () => {
    it('should create CartError with all properties', () => {
      const error = new CartError('Test error', 'TEST_CODE', 400, { field: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'value' });
      expect(error.name).toBe('CartError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with default message', () => {
      const error = new ValidationError();

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with custom message and details', () => {
      const error = new ValidationError('Custom message', { fields: { name: 'Required' } });

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ fields: { name: 'Required' } });
    });
  });

  describe('CartNotFoundError', () => {
    it('should create CartNotFoundError with default message', () => {
      const error = new CartNotFoundError();

      expect(error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('CartNotFoundError');
    });

    it('should create CartNotFoundError with custom message', () => {
      const error = new CartNotFoundError('Custom message');

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe(ErrorCode.CART_NOT_FOUND);
    });
  });

  describe('ItemNotFoundError', () => {
    it('should create ItemNotFoundError with productId', () => {
      const error = new ItemNotFoundError('prod123');

      expect(error.code).toBe(ErrorCode.ITEM_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ productId: 'prod123' });
      expect(error.name).toBe('ItemNotFoundError');
    });
  });

  describe('CheckoutError', () => {
    it('should create CheckoutError with default message', () => {
      const error = new CheckoutError();

      expect(error.code).toBe(ErrorCode.CHECKOUT_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('CheckoutError');
    });

    it('should create CheckoutError with custom message and details', () => {
      const error = new CheckoutError('Checkout failed', { reason: 'timeout' });

      expect(error.message).toBe('Checkout failed');
      expect(error.code).toBe(ErrorCode.CHECKOUT_ERROR);
      expect(error.details).toEqual({ reason: 'timeout' });
    });
  });

  describe('EmptyCartError', () => {
    it('should create EmptyCartError', () => {
      const error = new EmptyCartError();

      expect(error.code).toBe(ErrorCode.EMPTY_CART);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('EmptyCartError');
    });
  });

  describe('ConcurrencyError', () => {
    it('should create ConcurrencyError with default message', () => {
      const error = new ConcurrencyError();

      expect(error.code).toBe(ErrorCode.OPERATION_TIMEOUT);
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('ConcurrencyError');
    });

    it('should create ConcurrencyError with custom message', () => {
      const error = new ConcurrencyError('Operation timeout');

      expect(error.message).toBe('Operation timeout');
      expect(error.code).toBe(ErrorCode.OPERATION_TIMEOUT);
    });
  });

  describe('ExternalProviderError', () => {
    it('should create ExternalProviderError with default message', () => {
      const error = new ExternalProviderError();

      expect(error.code).toBe(ErrorCode.EXTERNAL_PROVIDER_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('ExternalProviderError');
    });

    it('should create ExternalProviderError with custom message and details', () => {
      const error = new ExternalProviderError('Provider unavailable', { provider: 'salesforce' });

      expect(error.message).toBe('Provider unavailable');
      expect(error.code).toBe(ErrorCode.EXTERNAL_PROVIDER_ERROR);
      expect(error.details).toEqual({ provider: 'salesforce' });
    });
  });

  describe('ExternalProviderContextExpiredError', () => {
    it('should create ExternalProviderContextExpiredError', () => {
      const error = new ExternalProviderContextExpiredError('ctx_123');

      expect(error.message).toContain('ctx_123');
      expect(error.name).toBe('ExternalProviderContextExpiredError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
