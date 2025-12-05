/**
 * Validators tests
 */

import { describe, it, expect } from 'vitest';
import { validateCartItem, validateQuantityUpdate } from '../../src/utils/validators.js';
import { ValidationError, ProductType } from '../../src/models/index.js';

describe('Validators', () => {
  describe('validateCartItem', () => {
    it('should validate valid cart item', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).not.toThrow();
    });

    it('should throw error for missing productId', () => {
      const item = {
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for empty productId', () => {
      const item = {
        productId: '',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for whitespace-only productId', () => {
      const item = {
        productId: '   ',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for missing name', () => {
      const item = {
        productId: 'prod1',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for empty name', () => {
      const item = {
        productId: 'prod1',
        name: '',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for invalid type', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: 'invalid' as ProductType,
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for missing type', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        quantity: 1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for quantity less than 1', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 0,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for negative quantity', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: -1,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for non-integer quantity', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1.5,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for missing quantity', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        price: 999.99,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for negative price', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: -100,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for missing price', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
      };

      expect(() => validateCartItem(item)).toThrow(ValidationError);
    });

    it('should throw error for zero price', () => {
      const item = {
        productId: 'prod1',
        name: 'iPhone',
        type: ProductType.DEVICE,
        quantity: 1,
        price: 0,
      };

      // Zero price is valid (non-negative)
      expect(() => validateCartItem(item)).not.toThrow();
    });

    it('should include all errors in details', () => {
      const item = {
        productId: '',
        name: '',
        type: 'invalid' as ProductType,
        quantity: -1,
        price: -100,
      };

      try {
        validateCartItem(item);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.details).toBeDefined();
          expect(error.details?.fields).toBeDefined();
        }
      }
    });
  });

  describe('validateQuantityUpdate', () => {
    it('should validate valid quantity', () => {
      expect(validateQuantityUpdate(5)).toBe(5);
      expect(validateQuantityUpdate(1)).toBe(1);
      expect(validateQuantityUpdate(100)).toBe(100);
    });

    it('should throw error for quantity less than 1', () => {
      expect(() => validateQuantityUpdate(0)).toThrow(ValidationError);
      expect(() => validateQuantityUpdate(-1)).toThrow(ValidationError);
    });

    it('should throw error for non-integer quantity', () => {
      expect(() => validateQuantityUpdate(1.5)).toThrow(ValidationError);
      expect(() => validateQuantityUpdate(2.99)).toThrow(ValidationError);
    });

    it('should throw error for non-number quantity', () => {
      expect(() => validateQuantityUpdate('5' as unknown as number)).toThrow(ValidationError);
      expect(() => validateQuantityUpdate(null as unknown as number)).toThrow(ValidationError);
      expect(() => validateQuantityUpdate(undefined as unknown as number)).toThrow(ValidationError);
    });
  });
});
