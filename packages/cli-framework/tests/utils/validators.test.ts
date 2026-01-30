/**
 * Tests for validators
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateRequired,
  validateNumber,
  validateBoolean,
  validateChoice,
  validateRange,
  validateEmail,
  validateUrl,
} from '../../src/utils/validators.js';

describe('Validators', () => {
  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('test', 'field')).toBe('test');
      expect(validateRequired(123, 'field')).toBe('123');
    });

    it('should throw on empty values', () => {
      expect(() => validateRequired('', 'field')).toThrow(ValidationError);
      expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
      expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should validate numbers', () => {
      expect(validateNumber(123, 'field')).toBe(123);
      expect(validateNumber('456', 'field')).toBe(456);
      expect(validateNumber('3.14', 'field')).toBe(3.14);
    });

    it('should throw on non-numbers', () => {
      expect(() => validateNumber('abc', 'field')).toThrow(ValidationError);
      
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean values', () => {
      expect(validateBoolean(true, 'field')).toBe(true);
      expect(validateBoolean(false, 'field')).toBe(false);
      expect(validateBoolean('true', 'field')).toBe(true);
      expect(validateBoolean('false', 'field')).toBe(false);
      expect(validateBoolean('yes', 'field')).toBe(true);
      expect(validateBoolean('no', 'field')).toBe(false);
      expect(validateBoolean('1', 'field')).toBe(true);
      expect(validateBoolean('0', 'field')).toBe(false);
    });

    it('should throw on invalid boolean values', () => {
      expect(() => validateBoolean('maybe', 'field')).toThrow(ValidationError);
      expect(() => validateBoolean('', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateChoice', () => {
    it('should validate valid choices', () => {
      expect(validateChoice('a', ['a', 'b', 'c'], 'field')).toBe('a');
      expect(validateChoice(1, [1, 2, 3], 'field')).toBe(1);
    });

    it('should throw on invalid choices', () => {
      expect(() => validateChoice('d', ['a', 'b', 'c'], 'field')).toThrow(ValidationError);
      expect(() => validateChoice(4, [1, 2, 3], 'field')).toThrow(ValidationError);
    });
  });

  describe('validateRange', () => {
    it('should validate values in range', () => {
      expect(validateRange(5, 0, 10, 'field')).toBe(5);
      expect(validateRange(0, 0, 10, 'field')).toBe(0);
      expect(validateRange(10, 0, 10, 'field')).toBe(10);
    });

    it('should throw on values out of range', () => {
      expect(() => validateRange(-1, 0, 10, 'field')).toThrow(ValidationError);
      expect(() => validateRange(11, 0, 10, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should validate valid emails', () => {
      expect(validateEmail('test@example.com', 'field')).toBe('test@example.com');
      expect(validateEmail('user+tag@domain.co.uk', 'field')).toBe('user+tag@domain.co.uk');
    });

    it('should throw on invalid emails', () => {
      expect(() => validateEmail('invalid', 'field')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com', 'field')).toThrow(ValidationError);
      expect(() => validateEmail('test@', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should validate valid URLs', () => {
      expect(validateUrl('https://example.com', 'field')).toBe('https://example.com');
      expect(validateUrl('http://localhost:3000', 'field')).toBe('http://localhost:3000');
    });

    it('should throw on invalid URLs', () => {
      expect(() => validateUrl('not-a-url', 'field')).toThrow(ValidationError);
      expect(() => validateUrl('', 'field')).toThrow(ValidationError);
    });
  });
});
