/**
 * @packageDocumentation
 * Tests for LearningConfig
 *
 * @remarks
 * Tests configuration creation, validation, and environment loading
 */

import { describe, it, expect } from '@jest/globals';
import {
  createLearningConfig,
  validateLearningConfig,
  loadConfigFromEnv,
} from '../../src/learning/LearningConfig';
import { DEFAULT_LEARNING_CONFIG } from '../../src/learning/types';

describe('LearningConfig', () => {
  describe('createLearningConfig', () => {
    it('should create config with defaults', () => {
      const config = createLearningConfig();

      expect(config.enabled).toBe(false); // Default from Q28
      expect(config.hnswConfig.M).toBe(16); // From Q32
      expect(config.hnswConfig.efConstruction).toBe(200); // From Q32
      expect(config.suggestions.threshold).toBe(0.75); // From Q33
      expect(config.errorRecovery.threshold).toBe(0.8); // From Q34
    });

    it('should merge overrides', () => {
      const config = createLearningConfig({
        enabled: true,
        suggestions: {
          enabled: true,
          threshold: 0.9,
          maxSuggestions: 10,
        },
      });

      expect(config.enabled).toBe(true);
      expect(config.suggestions.threshold).toBe(0.9);
      expect(config.suggestions.maxSuggestions).toBe(10);
      // Other defaults preserved
      expect(config.hnswConfig.M).toBe(16);
    });
  });

  describe('validateLearningConfig', () => {
    it('should validate correct configuration', () => {
      const config = createLearningConfig();

      expect(() => validateLearningConfig(config)).not.toThrow();
    });

    it('should reject invalid HNSW M parameter', () => {
      const config = createLearningConfig({
        hnswConfig: { M: 1, efConstruction: 200, efSearch: 100 },
      });

      expect(() => validateLearningConfig(config)).toThrow('Invalid HNSW M parameter');
    });

    it('should reject invalid HNSW efConstruction', () => {
      const config = createLearningConfig({
        hnswConfig: { M: 16, efConstruction: 5, efSearch: 100 },
      });

      expect(() => validateLearningConfig(config)).toThrow(
        'Invalid HNSW efConstruction'
      );
    });

    it('should reject invalid suggestion threshold', () => {
      const config = createLearningConfig({
        suggestions: {
          enabled: true,
          threshold: 1.5, // Invalid (must be 0-1)
          maxSuggestions: 5,
        },
      });

      expect(() => validateLearningConfig(config)).toThrow(
        'Invalid suggestion threshold'
      );
    });

    it('should reject invalid error recovery threshold', () => {
      const config = createLearningConfig({
        errorRecovery: { enabled: true, threshold: -0.1 },
      });

      expect(() => validateLearningConfig(config)).toThrow(
        'Invalid error recovery threshold'
      );
    });

    it('should reject too few max patterns', () => {
      const config = createLearningConfig({
        patternStorage: { maxPatterns: 50, persistToDisk: true },
      });

      expect(() => validateLearningConfig(config)).toThrow('Invalid maxPatterns');
    });

    it('should reject invalid embedding dimensions', () => {
      const config = createLearningConfig({
        embeddingDimensions: 16, // Too small
      });

      expect(() => validateLearningConfig(config)).toThrow(
        'Invalid embeddingDimensions'
      );
    });
  });

  describe('loadConfigFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load enabled flag from environment', () => {
      process.env.CLI_LEARNING_ENABLED = 'true';

      const config = loadConfigFromEnv();

      expect(config.enabled).toBe(true);
    });

    it('should load max patterns from environment', () => {
      process.env.CLI_LEARNING_MAX_PATTERNS = '20000';

      const config = loadConfigFromEnv();

      expect(config.patternStorage?.maxPatterns).toBe(20000);
    });

    it('should load suggestion threshold from environment', () => {
      process.env.CLI_LEARNING_SUGGESTION_THRESHOLD = '0.8';

      const config = loadConfigFromEnv();

      expect(config.suggestions?.threshold).toBe(0.8);
    });

    it('should handle missing environment variables', () => {
      const config = loadConfigFromEnv();

      expect(config).toEqual({});
    });

    it('should handle invalid number formats gracefully', () => {
      process.env.CLI_LEARNING_MAX_PATTERNS = 'not-a-number';

      const config = loadConfigFromEnv();

      expect(config.patternStorage).toBeUndefined();
    });
  });

  describe('Review Decision Compliance', () => {
    it('should follow Q28: Learning disabled by default', () => {
      expect(DEFAULT_LEARNING_CONFIG.enabled).toBe(false);
    });

    it('should follow Q32: HNSW M=16, efConstruction=200', () => {
      expect(DEFAULT_LEARNING_CONFIG.hnswConfig.M).toBe(16);
      expect(DEFAULT_LEARNING_CONFIG.hnswConfig.efConstruction).toBe(200);
    });

    it('should follow Q33: Suggestion threshold 0.75', () => {
      expect(DEFAULT_LEARNING_CONFIG.suggestions.threshold).toBe(0.75);
    });

    it('should follow Q34: Error recovery threshold 0.8', () => {
      expect(DEFAULT_LEARNING_CONFIG.errorRecovery.threshold).toBe(0.8);
    });
  });
});
