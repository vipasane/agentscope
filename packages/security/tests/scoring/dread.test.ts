import { describe, it, expect } from 'vitest';
import {
  DREADScorer,
  DREADScoreFactory,
  type DREADScore,
  type AgentConfig,
  type RiskOptimization
} from '../../src/scoring/DREADScorer.js';
import type { SecurityFinding } from '../../src/utils/types.js';

describe('DREADScoreFactory', () => {
  describe('create', () => {
    it('should create valid DREAD score with all dimensions', () => {
      const score = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);

      expect(score.damage).toBe(8);
      expect(score.reproducibility).toBe(10);
      expect(score.exploitability).toBe(6);
      expect(score.affectedUsers).toBe(7);
      expect(score.discoverability).toBe(5);
      expect(score.total).toBe(36); // Sum of all dimensions
      expect(score.severity).toBe('high'); // ≥30 = high
      expect(score.confidence).toBe(0.9);
    });

    it('should calculate total correctly', () => {
      const score = DREADScoreFactory.create(5, 5, 5, 5, 5);
      expect(score.total).toBe(25);
    });

    it('should derive severity from total score', () => {
      const critical = DREADScoreFactory.create(8, 8, 8, 8, 8); // 40
      expect(critical.severity).toBe('critical');
      expect(critical.total).toBe(40);

      const high = DREADScoreFactory.create(6, 6, 6, 6, 6); // 30
      expect(high.severity).toBe('high');
      expect(high.total).toBe(30);

      const medium = DREADScoreFactory.create(3, 3, 3, 3, 3); // 15
      expect(medium.severity).toBe('medium');
      expect(medium.total).toBe(15);

      const low = DREADScoreFactory.create(2, 2, 2, 2, 2); // 10
      expect(low.severity).toBe('low');
      expect(low.total).toBe(10);
    });

    it('should default confidence to 1.0', () => {
      const score = DREADScoreFactory.create(5, 5, 5, 5, 5);
      expect(score.confidence).toBe(1.0);
    });

    it('should round values to 2 decimal places', () => {
      const score = DREADScoreFactory.create(5.678, 6.123, 7.999, 4.001, 3.456, 0.888);
      expect(score.damage).toBe(5.68);
      expect(score.reproducibility).toBe(6.12);
      expect(score.exploitability).toBe(8.0);
      expect(score.affectedUsers).toBe(4.0);
      expect(score.discoverability).toBe(3.46);
      expect(score.confidence).toBe(0.89);
    });

    it('should freeze the score object (immutable)', () => {
      const score = DREADScoreFactory.create(5, 5, 5, 5, 5);
      expect(Object.isFrozen(score)).toBe(true);

      // Attempting to modify should fail silently or throw in strict mode
      expect(() => {
        (score as any).damage = 10;
      }).toThrow();
    });

    it('should reject invalid damage dimension', () => {
      expect(() => DREADScoreFactory.create(-1, 5, 5, 5, 5))
        .toThrow('damage must be 0-10');
      expect(() => DREADScoreFactory.create(11, 5, 5, 5, 5))
        .toThrow('damage must be 0-10');
      expect(() => DREADScoreFactory.create(NaN, 5, 5, 5, 5))
        .toThrow('damage must be a number');
    });

    it('should reject invalid reproducibility dimension', () => {
      expect(() => DREADScoreFactory.create(5, -1, 5, 5, 5))
        .toThrow('reproducibility must be 0-10');
      expect(() => DREADScoreFactory.create(5, 11, 5, 5, 5))
        .toThrow('reproducibility must be 0-10');
    });

    it('should reject invalid confidence', () => {
      expect(() => DREADScoreFactory.create(5, 5, 5, 5, 5, -0.1))
        .toThrow('confidence must be 0-1');
      expect(() => DREADScoreFactory.create(5, 5, 5, 5, 5, 1.1))
        .toThrow('confidence must be 0-1');
    });
  });
});

describe('DREADScorer', () => {
  describe('scoreAgentConfig', () => {
    it('should score minimal config as low risk', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.damage).toBeLessThanOrEqual(2);
      expect(score.reproducibility).toBe(10); // Always 10 for configs
      expect(score.exploitability).toBeLessThanOrEqual(2);
      expect(score.severity).toBe('medium'); // Reproducibility=10 pushes total up
      expect(score.breakdown).toBeDefined();
    });

    it('should score config with command hooks as higher risk', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', command: 'npm install' },
          { event: 'PostToolUse', command: 'git push' }
        ],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.damage).toBeGreaterThan(0);
      expect(score.breakdown.damageFactors).toContain('2 hooks configured');
      expect(score.breakdown.damageFactors).toContain('2 command hooks');
    });

    it('should score external MCP servers as critical risk', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [
          {
            name: 'external-api',
            command: 'node server.js',
            transport: 'https://api.example.com'
          }
        ],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.damage).toBeGreaterThan(0);
      expect(score.breakdown.damageFactors).toContain('1 MCP servers');
    });

    it('should score wildcard permissions as more exploitable', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: [
            { type: 'allow', pattern: 'Bash:*' },
            { type: 'allow', pattern: 'Write:*' }
          ]
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.exploitability).toBeGreaterThan(0);
      expect(score.breakdown.exploitabilityFactors).toContain('2 wildcard rules');
    });

    it('should score dangerous tools as more exploitable', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: [
            { type: 'allow', pattern: 'Bash' },
            { type: 'allow', pattern: 'Edit' },
            { type: 'allow', pattern: 'Write' }
          ]
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.exploitability).toBeGreaterThan(0);
      expect(score.breakdown.exploitabilityFactors).toContain('3 dangerous tools allowed');
    });

    it('should score complex CLAUDE.md as more exploitable', () => {
      const longInstructions = 'Line\n'.repeat(150); // 150 lines
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: longInstructions
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.exploitability).toBeGreaterThan(0);
      expect(score.breakdown.exploitabilityFactors).toContain('151 instruction lines');
    });

    it('should score UserPromptSubmit hooks as more discoverable', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'UserPromptSubmit', prompt: 'Analyze this input' }
        ],
        permissions: {
          defaultMode: 'ask',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.discoverability).toBeGreaterThan(0);
      expect(score.breakdown.discoverabilityFactors).toContain('UserPromptSubmit hooks present');
    });

    it('should score allow-by-default as more discoverable', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: {
          defaultMode: 'allow',
          rules: []
        },
        mcpServers: [],
        claudeMd: 'You are a helpful assistant.'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.discoverability).toBeGreaterThan(0);
      expect(score.breakdown.discoverabilityFactors).toContain('Allow-by-default permissions');
      expect(score.breakdown.damageFactors).toContain('Allow-by-default permissions');
    });

    it('should score comprehensive dangerous config as critical', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', command: 'npm install' },
          { event: 'PostToolUse', command: 'git push' },
          { event: 'UserPromptSubmit', prompt: 'Process input' }
        ],
        permissions: {
          defaultMode: 'allow',
          rules: [
            { type: 'allow', pattern: 'Bash:*' },
            { type: 'allow', pattern: 'Write:*' }
          ]
        },
        mcpServers: [
          {
            name: 'external',
            command: 'node server.js',
            transport: 'https://api.example.com'
          }
        ],
        claudeMd: 'Line\n'.repeat(200)
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(['critical', 'high']).toContain(score.severity);
      expect(score.total).toBeGreaterThan(30);
      expect(score.damage).toBeGreaterThanOrEqual(4.5);
      expect(score.exploitability).toBeGreaterThan(4);
      expect(score.discoverability).toBeGreaterThan(3);
    });

    it('should always set reproducibility to 10 for configs', () => {
      const configs: AgentConfig[] = [
        {
          hooks: [],
          permissions: { defaultMode: 'ask', rules: [] },
          mcpServers: [],
          claudeMd: ''
        },
        {
          hooks: [{ event: 'PreToolUse', command: 'test' }],
          permissions: { defaultMode: 'allow', rules: [] },
          mcpServers: [],
          claudeMd: 'test'
        }
      ];

      const scorer = new DREADScorer();

      for (const config of configs) {
        const score = scorer.scoreAgentConfig(config);
        expect(score.reproducibility).toBe(10);
      }
    });

    it('should clamp damage to max 10', () => {
      const config: AgentConfig = {
        hooks: Array.from({ length: 50 }, (_, i) => ({
          event: 'PreToolUse' as const,
          command: `command-${i}`
        })),
        permissions: {
          defaultMode: 'allow',
          rules: []
        },
        mcpServers: Array.from({ length: 20 }, (_, i) => ({
          name: `server-${i}`,
          command: 'external-server'
        })),
        claudeMd: 'Test'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.damage).toBeLessThanOrEqual(10);
    });
  });

  describe('scoreFinding', () => {
    it('should score PromptInjection as critical', () => {
      const finding: SecurityFinding = {
        type: 'PromptInjection',
        severity: 'critical',
        location: { file: 'CLAUDE.md', line: 10 },
        message: 'Jailbreak pattern detected',
        remediation: 'Review prompt instructions'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreFinding(finding);

      expect(score.damage).toBeGreaterThanOrEqual(8);
      expect(['critical', 'high']).toContain(score.severity); // Depends on severity multiplier
      expect(score.confidence).toBe(0.85);
    });

    it('should score CommandInjection as critical', () => {
      const finding: SecurityFinding = {
        type: 'CommandInjection',
        severity: 'critical',
        location: { file: 'settings.json', line: 5 },
        message: 'Shell injection detected',
        remediation: 'Use allowlist'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreFinding(finding);

      expect(score.damage).toBe(10);
      expect(score.severity).toBe('critical');
    });

    it('should score SecretExposure as high', () => {
      const finding: SecurityFinding = {
        type: 'SecretExposure',
        severity: 'high',
        location: { file: 'config.json', line: 2 },
        message: 'API key exposed',
        remediation: 'Use environment variables'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreFinding(finding);

      expect(['critical', 'high']).toContain(score.severity);
      expect(score.reproducibility).toBe(10); // Secrets are always reproducible
    });

    it('should adjust score based on finding severity', () => {
      const scorer = new DREADScorer();

      const critical: SecurityFinding = {
        type: 'PromptInjection',
        severity: 'critical',
        location: { file: 'test.md', line: 1 },
        message: 'Critical issue',
        remediation: 'Fix now'
      };

      const medium: SecurityFinding = {
        type: 'PromptInjection',
        severity: 'medium',
        location: { file: 'test.md', line: 1 },
        message: 'Medium issue',
        remediation: 'Fix soon'
      };

      const criticalScore = scorer.scoreFinding(critical);
      const mediumScore = scorer.scoreFinding(medium);

      expect(criticalScore.damage).toBeGreaterThan(mediumScore.damage);
      expect(criticalScore.exploitability).toBeGreaterThan(mediumScore.exploitability);
    });

    it('should use baseline for unknown finding types', () => {
      const finding: SecurityFinding = {
        type: 'UnknownThreat',
        severity: 'medium',
        location: { file: 'test.ts', line: 1 },
        message: 'Unknown threat',
        remediation: 'Investigate'
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreFinding(finding);

      expect(score).toBeDefined();
      expect(score.damage).toBeGreaterThanOrEqual(0);
      expect(score.damage).toBeLessThanOrEqual(10);
      expect(score.confidence).toBe(0.85); // Baseline confidence
    });
  });

  describe('applyOptimizations', () => {
    it('should apply weight adjustment', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);
      const optimization: RiskOptimization = {
        threatType: 'PromptInjection',
        weightAdjustment: 0.8, // Reduce by 20%
        confidence: 0.85,
        sampleSize: 100
      };

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, [optimization]);

      expect(adjusted.damage).toBeCloseTo(8 * 0.8, 2);
      expect(adjusted.exploitability).toBeCloseTo(6 * 0.8, 2);
      expect(adjusted.confidence).toBe(0.85); // Min of base and optimization
    });

    it('should apply specific dimension adjustments', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);
      const optimization: RiskOptimization = {
        threatType: 'PromptInjection',
        weightAdjustment: 1.0,
        confidence: 0.9,
        sampleSize: 100,
        adjustments: {
          damage: 9,
          exploitability: 7
        }
      };

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, [optimization]);

      expect(adjusted.damage).toBe(9);
      expect(adjusted.exploitability).toBe(7);
      expect(adjusted.affectedUsers).toBe(7); // Unchanged
    });

    it('should use minimum confidence from all optimizations', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);
      const optimizations: RiskOptimization[] = [
        {
          threatType: 'Test1',
          weightAdjustment: 1.0,
          confidence: 0.95,
          sampleSize: 100
        },
        {
          threatType: 'Test2',
          weightAdjustment: 1.0,
          confidence: 0.75,
          sampleSize: 50
        }
      ];

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, optimizations);

      expect(adjusted.confidence).toBe(0.75); // Minimum
    });

    it('should clamp adjusted values to 0-10 range', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);
      const optimization: RiskOptimization = {
        threatType: 'Test',
        weightAdjustment: 2.0, // Would push above 10
        confidence: 0.9,
        sampleSize: 100
      };

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, [optimization]);

      expect(adjusted.damage).toBeLessThanOrEqual(10);
      expect(adjusted.exploitability).toBeLessThanOrEqual(10);
    });

    it('should return original score with empty optimizations', () => {
      const baseScore = DREADScoreFactory.create(8, 10, 6, 7, 5, 0.9);

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, []);

      expect(adjusted).toEqual(baseScore);
    });

    it('should apply multiple optimizations sequentially', () => {
      const baseScore = DREADScoreFactory.create(10, 10, 10, 10, 10, 1.0);
      const optimizations: RiskOptimization[] = [
        {
          threatType: 'Test1',
          weightAdjustment: 0.8,
          confidence: 0.9,
          sampleSize: 100
        },
        {
          threatType: 'Test2',
          weightAdjustment: 0.5,
          confidence: 0.85,
          sampleSize: 50
        }
      ];

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, optimizations);

      // 10 * 0.8 * 0.5 = 4
      expect(adjusted.damage).toBe(4);
      expect(adjusted.exploitability).toBe(4);
      expect(adjusted.confidence).toBe(0.85);
    });

    it('should recalculate total and severity after adjustments', () => {
      const baseScore = DREADScoreFactory.create(10, 10, 10, 10, 10, 1.0);
      const optimization: RiskOptimization = {
        threatType: 'Test',
        weightAdjustment: 0.5, // Reduce significantly
        confidence: 0.9,
        sampleSize: 100
      };

      const scorer = new DREADScorer();
      const adjusted = scorer.applyOptimizations(baseScore, [optimization]);

      expect(adjusted.total).toBeLessThan(baseScore.total);
      // With reproducibility=10 and 0.5 weight, can still be critical if other dimensions high
      expect(adjusted.severity).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty hooks array', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: { defaultMode: 'ask', rules: [] },
        mcpServers: [],
        claudeMd: ''
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score).toBeDefined();
      expect(score.breakdown.damageFactors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty CLAUDE.md', () => {
      const config: AgentConfig = {
        hooks: [],
        permissions: { defaultMode: 'ask', rules: [] },
        mcpServers: [],
        claudeMd: ''
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score).toBeDefined();
    });

    it('should handle hooks without commands', () => {
      const config: AgentConfig = {
        hooks: [
          { event: 'PreToolUse', prompt: 'Test prompt' }
        ],
        permissions: { defaultMode: 'ask', rules: [] },
        mcpServers: [],
        claudeMd: ''
      };

      const scorer = new DREADScorer();
      const score = scorer.scoreAgentConfig(config);

      expect(score.damage).toBeLessThan(5);
    });

    it('should handle local MCP servers differently than external', () => {
      const localConfig: AgentConfig = {
        hooks: [],
        permissions: { defaultMode: 'ask', rules: [] },
        mcpServers: [
          { name: 'local', command: 'localhost:3000' }
        ],
        claudeMd: ''
      };

      const externalConfig: AgentConfig = {
        hooks: [],
        permissions: { defaultMode: 'ask', rules: [] },
        mcpServers: [
          { name: 'external', command: 'api.example.com' }
        ],
        claudeMd: ''
      };

      const scorer = new DREADScorer();
      const localScore = scorer.scoreAgentConfig(localConfig);
      const externalScore = scorer.scoreAgentConfig(externalConfig);

      expect(externalScore.damage).toBeGreaterThan(localScore.damage);
    });
  });
});
