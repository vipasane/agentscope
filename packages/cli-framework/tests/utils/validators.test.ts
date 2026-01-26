/**
 * Tests for validators
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
      assert.equal(validateRequired('test', 'field'), 'test');
      assert.equal(validateRequired(123, 'field'), '123');
    });

    it('should throw on empty values', () => {
      assert.throws(() => validateRequired('', 'field'), ValidationError);
      assert.throws(() => validateRequired(null, 'field'), ValidationError);
      assert.throws(() => validateRequired(undefined, 'field'), ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should validate numbers', () => {
      assert.equal(validateNumber(123, 'field'), 123);
      assert.equal(validateNumber('456', 'field'), 456);
      assert.equal(validateNumber('3.14', 'field'), 3.14);
    });

    it('should throw on non-numbers', () => {
      assert.throws(() => validateNumber('abc', 'field'), ValidationError);
      assert.throws(() => validateNumber('', 'field'), ValidationError);
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean values', () => {
      assert.equal(validateBoolean(true, 'field'), true);
      assert.equal(validateBoolean(false, 'field'), false);
      assert.equal(validateBoolean('true', 'field'), true);
      assert.equal(validateBoolean('false', 'field'), false);
      assert.equal(validateBoolean('yes', 'field'), true);
      assert.equal(validateBoolean('no', 'field'), false);
      assert.equal(validateBoolean('1', 'field'), true);
      assert.equal(validateBoolean('0', 'field'), false);
    });

    it('should throw on invalid boolean values', () => {
      assert.throws(() => validateBoolean('maybe', 'field'), ValidationError);
      assert.throws(() => validateBoolean('', 'field'), ValidationError);
    });
  });

  describe('validateChoice', () => {
    it('should validate valid choices', () => {
      assert.equal(validateChoice('a', ['a', 'b', 'c'], 'field'), 'a');
      assert.equal(validateChoice(1, [1, 2, 3], 'field'), 1);
    });

    it('should throw on invalid choices', () => {
      assert.throws(() => validateChoice('d', ['a', 'b', 'c'], 'field'), ValidationError);
      assert.throws(() => validateChoice(4, [1, 2, 3], 'field'), ValidationError);
    });
  });

  describe('validateRange', () => {
    it('should validate values in range', () => {
      assert.equal(validateRange(5, 0, 10, 'field'), 5);
      assert.equal(validateRange(0, 0, 10, 'field'), 0);
      assert.equal(validateRange(10, 0, 10, 'field'), 10);
    });

    it('should throw on values out of range', () => {
      assert.throws(() => validateRange(-1, 0, 10, 'field'), ValidationError);
      assert.throws(() => validateRange(11, 0, 10, 'field'), ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should validate valid emails', () => {
      assert.equal(validateEmail('test@example.com', 'field'), 'test@example.com');
      assert.equal(validateEmail('user+tag@domain.co.uk', 'field'), 'user+tag@domain.co.uk');
    });

    it('should throw on invalid emails', () => {
      assert.throws(() => validateEmail('invalid', 'field'), ValidationError);
      assert.throws(() => validateEmail('@example.com', 'field'), ValidationError);
      assert.throws(() => validateEmail('test@', 'field'), ValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should validate valid URLs', () => {
      assert.equal(validateUrl('https://example.com', 'field'), 'https://example.com');
      assert.equal(validateUrl('http://localhost:3000', 'field'), 'http://localhost:3000');
    });

    it('should throw on invalid URLs', () => {
      assert.throws(() => validateUrl('not-a-url', 'field'), ValidationError);
      assert.throws(() => validateUrl('', 'field'), ValidationError);
    });
  });
});
