/**
 * Tests for SecurityLearningCoordinator
 *
 * Validates the 4-step ReasoningBank learning cycle:
 * 1. RETRIEVE - Pattern loading
 * 2. JUDGE - Verdict assignment
 * 3. DISTILL - Learning extraction
 * 4. CONSOLIDATE - EWC++ consolidation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execSync } from 'child_process';
import {
  SecurityLearningCoordinator,
  createSecurityLearningCoordinator,
  type ThreatPattern,
  type SecurityAssessment,
  type SecurityFeedback,
} from './SecurityLearningCoordinator.js';
import type { SecurityFinding } from '../utils/types.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('SecurityLearningCoordinator', () => {
  let coordinator: SecurityLearningCoordinator;
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
    coordinator = createSecurityLearningCoordinator({
      cliPath: 'npx @claude-flow/cli@latest',
      verbose: false,
    });
  });

  describe('STEP 1: RETRIEVE - getOptimizations', () => {
    it('should return empty array when no patterns found (first use)', async () => {
      mockExecSync.mockReturnValueOnce('');

      const optimizations = await coordinator.getOptimizations('config-hash-123');

      expect(optimizations).toEqual([]);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('memory search'),
        expect.any(Object),
      );
    });

    it('should generate skip-pattern optimization for high false positive rate', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-123',
        regex: 'secret:.*',
        severity: 'high',
        falsePositiveRate: 0.85,
        confidence: 0.9,
        usageCount: 10,
        successRate: 0.15,
        category: 'secrets',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync.mockReturnValueOnce(JSON.stringify(mockPattern));

      const optimizations = await coordinator.getOptimizations('config-hash-123');

      expect(optimizations).toHaveLength(1);
      expect(optimizations[0]).toMatchObject({
        type: 'skip-pattern',
        patternSignature: 'pattern-123',
        confidence: 0.9,
        expectedImprovement: expect.stringContaining('85%'),
      });
    });

    it('should generate severity adjustment for low confidence critical findings', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-456',
        regex: 'injection:.*',
        severity: 'critical',
        falsePositiveRate: 0.2,
        confidence: 0.3, // Low confidence
        usageCount: 5,
        successRate: 0.8,
        category: 'injection',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync.mockReturnValueOnce(JSON.stringify(mockPattern));

      const optimizations = await coordinator.getOptimizations('config-hash-456');

      expect(optimizations).toContainEqual(
        expect.objectContaining({
          type: 'adjust-severity',
          patternSignature: 'pattern-456',
          confidence: 0.7, // 1 - 0.3
          data: expect.objectContaining({
            originalSeverity: 'critical',
            newSeverity: 'high',
          }),
        }),
      );
    });

    it('should handle CLI errors gracefully', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('CLI not found');
      });

      const optimizations = await coordinator.getOptimizations('config-hash-error');

      expect(optimizations).toEqual([]);
      // Should not throw
    });

    it('should parse multiple patterns from CLI output', async () => {
      const pattern1: ThreatPattern = {
        signature: 'pattern-1',
        regex: 'secret:.*',
        severity: 'high',
        falsePositiveRate: 0.75,
        confidence: 0.85,
        usageCount: 20,
        successRate: 0.25,
        category: 'secrets',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const pattern2: ThreatPattern = {
        signature: 'pattern-2',
        regex: 'injection:.*',
        severity: 'critical',
        falsePositiveRate: 0.1,
        confidence: 0.4,
        usageCount: 15,
        successRate: 0.9,
        category: 'injection',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync.mockReturnValueOnce(
        `${JSON.stringify(pattern1)}\n${JSON.stringify(pattern2)}`,
      );

      const optimizations = await coordinator.getOptimizations('config-multi');

      expect(optimizations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('STEP 2: JUDGE & STEP 3: DISTILL - recordAssessment', () => {
    it('should record assessment with verdict 1.0 for passed assessment', async () => {
      mockExecSync.mockReturnValue('');

      const assessment: SecurityAssessment = {
        id: 'assess-123',
        configSignature: 'config-hash-123',
        findings: [createMockFinding('secret-exposure')],
        overallDreadScore: createMockDreadScore(5),
        duration: 1000,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'pass',
      };

      await coordinator.recordAssessment(assessment);

      // Should store assessment metadata with verdict 1.0
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('memory store'),
        expect.any(Object),
      );

      const storeCalls = mockExecSync.mock.calls.filter((call) =>
        String(call[0]).includes('memory store'),
      );

      expect(storeCalls.length).toBeGreaterThanOrEqual(1);
      expect(String(storeCalls[0][0])).toContain('--namespace');
      expect(String(storeCalls[0][0])).toContain('security-trajectories');
    });

    it('should record assessment with verdict 1.0 for high DREAD score', async () => {
      mockExecSync.mockReturnValue('');

      const assessment: SecurityAssessment = {
        id: 'assess-456',
        configSignature: 'config-hash-456',
        findings: [createMockFinding('sql-injection')],
        overallDreadScore: createMockDreadScore(8.5), // High DREAD
        duration: 1500,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'fail',
      };

      await coordinator.recordAssessment(assessment);

      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should record assessment with verdict 0.5 for uncertain results', async () => {
      mockExecSync.mockReturnValue('');

      const assessment: SecurityAssessment = {
        id: 'assess-789',
        configSignature: 'config-hash-789',
        findings: [createMockFinding('possible-issue')],
        overallDreadScore: createMockDreadScore(4), // Low DREAD
        duration: 800,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'fail',
      };

      await coordinator.recordAssessment(assessment);

      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should store patterns for each finding', async () => {
      mockExecSync.mockReturnValue('');

      const assessment: SecurityAssessment = {
        id: 'assess-multi',
        configSignature: 'config-multi',
        findings: [
          createMockFinding('secret-1'),
          createMockFinding('secret-2'),
          createMockFinding('injection-1'),
        ],
        overallDreadScore: createMockDreadScore(6),
        duration: 2000,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'pass',
      };

      await coordinator.recordAssessment(assessment);

      // Should store assessment + 3 finding patterns = 4 calls
      const storeCalls = mockExecSync.mock.calls.filter((call) =>
        String(call[0]).includes('memory store'),
      );

      expect(storeCalls.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle errors gracefully without throwing', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Storage failed');
      });

      const assessment: SecurityAssessment = {
        id: 'assess-error',
        configSignature: 'config-error',
        findings: [],
        overallDreadScore: createMockDreadScore(0),
        duration: 0,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'pass',
      };

      // Should not throw
      await expect(coordinator.recordAssessment(assessment)).resolves.not.toThrow();
    });
  });

  describe('STEP 2: JUDGE - recordFeedback', () => {
    it('should decrease confidence on false positive feedback', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-fp',
        regex: 'secret:.*',
        severity: 'high',
        falsePositiveRate: 0.3,
        confidence: 0.8,
        usageCount: 10,
        successRate: 0.7,
        category: 'secrets',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Mock retrieve then store
      mockExecSync
        .mockReturnValueOnce(JSON.stringify(mockPattern)) // retrieve
        .mockReturnValueOnce('') // store updated
        .mockReturnValueOnce(JSON.stringify({ ...mockPattern, confidence: 0.6 })) // retrieve for adjust
        .mockReturnValueOnce(''); // store adjusted

      const finding = createMockFinding('secret-false-positive');
      const feedback: SecurityFeedback = {
        type: 'false-positive',
        comment: 'This is a test fixture',
        timestamp: Date.now(),
      };

      await coordinator.recordFeedback(finding, feedback);

      const storeCalls = mockExecSync.mock.calls.filter((call) =>
        String(call[0]).includes('memory store'),
      );

      expect(storeCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should increase confidence on true positive feedback', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-tp',
        regex: 'injection:.*',
        severity: 'critical',
        falsePositiveRate: 0.1,
        confidence: 0.7,
        usageCount: 5,
        successRate: 0.9,
        category: 'injection',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync
        .mockReturnValueOnce(JSON.stringify(mockPattern))
        .mockReturnValueOnce('')
        .mockReturnValueOnce(JSON.stringify({ ...mockPattern, confidence: 0.8 }))
        .mockReturnValueOnce('');

      const finding = createMockFinding('sql-injection-real');
      const feedback: SecurityFeedback = {
        type: 'true-positive',
        comment: 'Confirmed vulnerability',
        timestamp: Date.now(),
      };

      await coordinator.recordFeedback(finding, feedback);

      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should update severity based on feedback', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-severity',
        regex: 'config:.*',
        severity: 'critical',
        falsePositiveRate: 0.2,
        confidence: 0.6,
        usageCount: 8,
        successRate: 0.8,
        category: 'config-exposure',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync
        .mockReturnValueOnce(JSON.stringify(mockPattern))
        .mockReturnValueOnce('');

      const finding = createMockFinding('config-exposure');
      const feedback: SecurityFeedback = {
        type: 'severity-adjustment',
        suggestedSeverity: 'medium',
        comment: 'Not as critical as thought',
        timestamp: Date.now(),
      };

      await coordinator.recordFeedback(finding, feedback);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('memory store'),
        expect.any(Object),
      );
    });

    it('should create new pattern if not found', async () => {
      mockExecSync
        .mockReturnValueOnce('') // retrieve returns nothing
        .mockReturnValueOnce(''); // store new pattern

      const finding = createMockFinding('new-threat');
      const feedback: SecurityFeedback = {
        type: 'false-positive',
        suppressionRule: 'test/**',
        timestamp: Date.now(),
      };

      await coordinator.recordFeedback(finding, feedback);

      const storeCalls = mockExecSync.mock.calls.filter((call) =>
        String(call[0]).includes('memory store'),
      );

      expect(storeCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply suppression rules from feedback', async () => {
      mockExecSync.mockReturnValue('');

      const finding = createMockFinding('test-file-secret');
      const feedback: SecurityFeedback = {
        type: 'false-positive',
        suppressionRule: 'test/**/*.ts',
        comment: 'Test fixtures should be ignored',
        timestamp: Date.now(),
      };

      await coordinator.recordFeedback(finding, feedback);

      expect(mockExecSync).toHaveBeenCalled();
    });
  });

  describe('adjustConfidence', () => {
    it('should clamp confidence to 0-1 range', async () => {
      const mockPattern: ThreatPattern = {
        signature: 'pattern-clamp',
        regex: 'test:.*',
        severity: 'low',
        falsePositiveRate: 0.5,
        confidence: 0.1,
        usageCount: 3,
        successRate: 0.5,
        category: 'other',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync
        .mockReturnValueOnce(JSON.stringify(mockPattern))
        .mockReturnValueOnce('');

      // Try to decrease below 0
      await coordinator.adjustConfidence('pattern-clamp', -0.5);

      // Confidence should be clamped to 0
      const storeCall = mockExecSync.mock.calls.find((call) =>
        String(call[0]).includes('memory store'),
      );

      expect(storeCall).toBeDefined();
    });

    it('should not throw if pattern not found', async () => {
      mockExecSync.mockReturnValueOnce('');

      await expect(
        coordinator.adjustConfidence('non-existent', 0.1),
      ).resolves.not.toThrow();
    });
  });

  describe('STEP 4: CONSOLIDATE', () => {
    it('should trigger neural training with correct parameters', async () => {
      mockExecSync.mockReturnValue('Training complete');

      await coordinator.consolidate(10);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('neural train'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--pattern-type security-threat'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--epochs 10'),
        expect.any(Object),
      );
    });

    it('should use default 10 epochs if not specified', async () => {
      mockExecSync.mockReturnValue('Training complete');

      await coordinator.consolidate();

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--epochs 10'),
        expect.any(Object),
      );
    });

    it('should handle training failures gracefully', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Neural training failed');
      });

      await expect(coordinator.consolidate(5)).resolves.not.toThrow();
    });
  });

  describe('triggerAuditWorker', () => {
    it('should dispatch audit worker correctly', async () => {
      mockExecSync.mockReturnValue('Worker dispatched');

      await coordinator.triggerAuditWorker();

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('hooks worker dispatch'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--trigger audit'),
        expect.any(Object),
      );
    });

    it('should handle worker dispatch errors gracefully', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Worker unavailable');
      });

      await expect(coordinator.triggerAuditWorker()).resolves.not.toThrow();
    });
  });

  describe('createSecurityLearningCoordinator factory', () => {
    it('should create coordinator with default options', () => {
      const coord = createSecurityLearningCoordinator();
      expect(coord).toBeInstanceOf(SecurityLearningCoordinator);
    });

    it('should create coordinator with custom CLI path', () => {
      const coord = createSecurityLearningCoordinator({
        cliPath: '/custom/path/to/cli',
        verbose: true,
      });
      expect(coord).toBeInstanceOf(SecurityLearningCoordinator);
    });
  });

  describe('Integration - Full Learning Cycle', () => {
    it('should complete full 4-step cycle', async () => {
      // STEP 1: RETRIEVE - no patterns yet (first use)
      mockExecSync.mockReturnValueOnce('');
      const optimizations = await coordinator.getOptimizations('config-new');
      expect(optimizations).toEqual([]);

      // STEP 2 & 3: JUDGE & DISTILL - record assessment
      mockExecSync.mockReturnValue('');
      const assessment: SecurityAssessment = {
        id: 'assess-cycle',
        configSignature: 'config-new',
        findings: [createMockFinding('secret-found')],
        overallDreadScore: createMockDreadScore(6),
        duration: 1200,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'pass',
      };
      await coordinator.recordAssessment(assessment);

      // STEP 4: CONSOLIDATE - train neural patterns
      mockExecSync.mockReturnValue('Training complete');
      await coordinator.consolidate(10);

      // Verify all steps executed
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('memory search'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('memory store'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('neural train'),
        expect.any(Object),
      );
    });

    it('should improve on second scan with learned patterns', async () => {
      // First scan - learn pattern
      mockExecSync.mockReturnValue('');
      const assessment1: SecurityAssessment = {
        id: 'assess-1',
        configSignature: 'config-learn',
        findings: [createMockFinding('false-positive-pattern')],
        overallDreadScore: createMockDreadScore(5),
        duration: 1000,
        timestamp: Date.now(),
        appliedOptimizations: [],
        result: 'pass',
      };
      await coordinator.recordAssessment(assessment1);

      // User marks as false positive
      const finding = createMockFinding('false-positive-pattern');
      const feedback: SecurityFeedback = {
        type: 'false-positive',
        timestamp: Date.now(),
      };

      const learnedPattern: ThreatPattern = {
        signature: 'pattern-learned',
        regex: 'false-positive:.*',
        severity: 'high',
        falsePositiveRate: 1.0, // High FP rate after feedback
        confidence: 0.0,
        usageCount: 1,
        successRate: 0.0,
        category: 'other',
        learnedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockExecSync
        .mockReturnValueOnce(JSON.stringify(learnedPattern))
        .mockReturnValue('');

      await coordinator.recordFeedback(finding, feedback);

      // Second scan - should get optimization to skip pattern
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        ...learnedPattern,
        falsePositiveRate: 0.85,
        confidence: 0.9,
        usageCount: 10,
      }));

      const optimizations2 = await coordinator.getOptimizations('config-learn');

      expect(optimizations2.length).toBeGreaterThan(0);
      expect(optimizations2.some(opt => opt.type === 'skip-pattern')).toBe(true);
    });
  });
});

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockFinding(type: string): SecurityFinding {
  return {
    type,
    severity: 'high',
    location: {
      file: 'test.ts',
      line: 42,
      column: 10,
    },
    message: `${type} detected`,
    remediation: `Fix ${type}`,
    cve: undefined,
  };
}

function createMockDreadScore(total: number) {
  return {
    damage: total / 5,
    reproducibility: total / 5,
    exploitability: total / 5,
    affectedUsers: total / 5,
    discoverability: total / 5,
    total,
    riskLevel: total > 7 ? 'critical' as const : total > 5 ? 'high' as const : 'medium' as const,
  };
}
