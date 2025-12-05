/**
 * Validation utilities
 */

import { CartItem, ValidationError, ProductType } from '../models/index.js';
import {
  ErrorMessages,
  ValidationMessages,
} from '../models/error-constants.js';

const VALID_PRODUCT_TYPES = Object.values(ProductType);

export function validateCartItem(item: Partial<CartItem>): void {
  const errors: Record<string, string> = {};

  if (!item.productId || item.productId.trim() === '') {
    errors.productId = ValidationMessages.PRODUCT_ID_REQUIRED;
  }

  if (!item.name || item.name.trim() === '') {
    errors.name = ValidationMessages.PRODUCT_NAME_REQUIRED;
  }

  if (!item.type || !VALID_PRODUCT_TYPES.includes(item.type as any)) {
    errors.type = ValidationMessages.TYPE_MUST_BE_ONE_OF(VALID_PRODUCT_TYPES);
  }

  if (item.quantity === undefined || item.quantity < 1 || !Number.isInteger(item.quantity)) {
    errors.quantity = ValidationMessages.QUANTITY_MUST_BE_INTEGER;
  }

  if (item.price === undefined || item.price < 0) {
    errors.price = ValidationMessages.PRICE_MUST_BE_NON_NEGATIVE;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(ErrorMessages.INVALID_ITEM_DATA, { fields: errors });
  }
}

export function validateQuantityUpdate(quantity: unknown): number {
  if (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
    throw new ValidationError(ErrorMessages.QUANTITY_MUST_BE_INTEGER, {
      fields: { quantity: ValidationMessages.QUANTITY_MUST_BE_INTEGER_FIELD },
    });
  }
  return quantity;
}
