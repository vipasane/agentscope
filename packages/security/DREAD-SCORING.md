# DREAD Risk Scoring

Comprehensive risk assessment implementation following Microsoft's DREAD methodology, adapted for AI agent configurations.

## Overview

DREAD is a qualitative risk assessment model that scores threats across 5 dimensions:

| Dimension | Description | Range |
|-----------|-------------|-------|
| **D**amage | How bad would an attack be? | 0-10 |
| **R**eproducibility | How easy to reproduce? | 0-10 |
| **E**xploitability | How much work required? | 0-10 |
| **A**ffected Users | How many users impacted? | 0-10 |
| **D**iscoverability | How easy to discover? | 0-10 |

**Total Risk** = (D + R + E + A + D) / 5 (average across all dimensions)

**Risk = Sum** = D + R + E + A + D (0-50 total)

### Severity Mapping

| Total Score | Severity | Action Required |
|-------------|----------|-----------------|
| ≥40 | **Critical** | Immediate remediation required |
| ≥30 | **High** | Urgent remediation needed |
| ≥15 | **Medium** | Schedule remediation |
| <15 | **Low** | Monitor and review |

## Installation

```bash
npm install @claude-flow/security
```

## Basic Usage

### Score an Agent Configuration

```typescript
import { DREADScorer } from '@claude-flow/security';

const scorer = new DREADScorer();

const config = {
  hooks: [
    { event: 'PreToolUse', command: 'npm install' }
  ],
  permissions: {
    defaultMode: 'ask',
    rules: [
      { type: 'allow', pattern: 'Bash:*' }
    ]
  },
  mcpServers: [
    {
      name: 'external-api',
      command: 'node server.js',
      transport: 'https://api.example.com'
    }
  ],
  claudeMd: 'You are a helpful coding assistant...'
};

const score = scorer.scoreAgentConfig(config);

console.log('Risk Assessment:');
console.log(`  Severity: ${score.severity}`);
console.log(`  Total Risk: ${score.total}/50`);
console.log(`  Damage: ${score.damage}/10`);
console.log(`  Reproducibility: ${score.reproducibility}/10`);
console.log(`  Exploitability: ${score.exploitability}/10`);
console.log(`  Affected Users: ${score.affectedUsers}/10`);
console.log(`  Discoverability: ${score.discoverability}/10`);
console.log(`  Confidence: ${score.confidence}`);

// View breakdown of factors
console.log('\nDamage Factors:', score.breakdown.damageFactors);
console.log('Exploitability Factors:', score.breakdown.exploitabilityFactors);
console.log('Discoverability Factors:', score.breakdown.discoverabilityFactors);
```

**Output:**
```
Risk Assessment:
  Severity: high
  Total Risk: 32.67/50
  Damage: 4.93/10
  Reproducibility: 10/10
  Exploitability: 8/10
  Affected Users: 5/10
  Discoverability: 4/10
  Confidence: 1

Damage Factors: [ '1 hooks configured', '1 command hooks', '1 MCP servers', '1 external servers' ]
Exploitability Factors: [ '1 wildcard rules' ]
Discoverability Factors: [ 'External MCP servers' ]
```

### Score a Security Finding

```typescript
import { DREADScorer } from '@claude-flow/security';

const scorer = new DREADScorer();

const finding = {
  type: 'PromptInjection',
  severity: 'critical',
  location: { file: 'CLAUDE.md', line: 42 },
  message: 'Jailbreak pattern detected: "ignore previous instructions"',
  remediation: 'Review and sanitize prompt instructions'
};

const score = scorer.scoreFinding(finding);

console.log(`Finding Risk: ${score.severity} (${score.total}/50)`);
console.log(`Confidence: ${score.confidence}`);
```

**Output:**
```
Finding Risk: high (38/50)
Confidence: 0.85
```

## Learning-Enhanced Scoring

Apply learned risk adjustments from historical data (ReasoningBank integration):

```typescript
import { DREADScorer } from '@claude-flow/security';

const scorer = new DREADScorer();
const baseScore = scorer.scoreAgentConfig(config);

// Load optimizations from ReasoningBank
const optimizations = [
  {
    threatType: 'CommandInjection',
    weightAdjustment: 0.8, // Reduce risk by 20% based on learning
    confidence: 0.92,
    sampleSize: 150,
    adjustments: {
      damage: 7,  // Override specific dimensions
      exploitability: 6
    }
  }
];

const optimizedScore = scorer.applyOptimizations(baseScore, optimizations);

console.log('Base Score:', baseScore.total);
console.log('Optimized Score:', optimizedScore.total);
console.log('Confidence:', optimizedScore.confidence);
```

## DREAD Calculation Examples

### Minimal Configuration (Low Risk)

```typescript
const minimalConfig = {
  hooks: [],
  permissions: {
    defaultMode: 'ask',
    rules: []
  },
  mcpServers: [],
  claudeMd: 'You are a helpful assistant.'
};

const score = scorer.scoreAgentConfig(minimalConfig);
// Severity: medium (due to reproducibility=10)
// Total: ~15-20/50
```

### High-Risk Configuration

```typescript
const riskyConfig = {
  hooks: [
    { event: 'PreToolUse', command: 'npm install' },
    { event: 'UserPromptSubmit', prompt: 'Process input' }
  ],
  permissions: {
    defaultMode: 'allow',  // Dangerous!
    rules: [
      { type: 'allow', pattern: 'Bash:*' },
      { type: 'allow', pattern: 'Write:*' }
    ]
  },
  mcpServers: [
    {
      name: 'external',
      command: 'api.example.com',
      transport: 'https://api.example.com'
    }
  ],
  claudeMd: 'x'.repeat(10000) // Large instruction set
};

const score = scorer.scoreAgentConfig(riskyConfig);
// Severity: critical
// Total: 40+/50
```

## Integration with Security Scanning

Combine DREAD scoring with security validators:

```typescript
import {
  DREADScorer,
  InputValidator,
  PathValidator,
  SafeExecutor,
  SecretsSanitizer
} from '@claude-flow/security';

async function assessAgentSecurity(configPath: string) {
  // 1. Load and validate configuration
  const config = await loadConfig(configPath);

  // 2. Run security validators
  const findings = [];

  // Check for secrets
  const secrets = SecretsSanitizer.detect(JSON.stringify(config));
  findings.push(...secrets.map(s => ({
    type: 'SecretExposure',
    severity: 'high' as const,
    location: { file: configPath, line: 0 },
    message: `${s.secretType} detected`,
    remediation: 'Move to environment variables'
  })));

  // Check hooks for command injection
  for (const hook of config.hooks) {
    if (hook.command) {
      const safe = SafeExecutor.validate(hook.command, {
        allowedCommands: ['npm', 'node', 'git']
      });
      if (!safe.success) {
        findings.push({
          type: 'CommandInjection',
          severity: 'critical' as const,
          location: { file: configPath, line: 0 },
          message: 'Unsafe command in hook',
          remediation: safe.error || 'Use allowlisted commands only'
        });
      }
    }
  }

  // 3. Calculate DREAD scores
  const scorer = new DREADScorer();
  const configScore = scorer.scoreAgentConfig(config);
  const findingScores = findings.map(f => ({
    finding: f,
    score: scorer.scoreFinding(f)
  }));

  // 4. Generate report
  return {
    overallScore: configScore,
    findings: findingScores,
    recommendation: configScore.severity === 'critical'
      ? 'BLOCK: Critical security issues detected'
      : configScore.severity === 'high'
      ? 'WARN: High-risk configuration'
      : 'PASS: Acceptable risk level'
  };
}
```

## Factory Pattern for Type-Safe Scores

```typescript
import { DREADScoreFactory } from '@claude-flow/security';

// Create validated scores
const score = DREADScoreFactory.create(
  8,  // damage
  10, // reproducibility (always 10 for configs)
  6,  // exploitability
  7,  // affectedUsers
  5,  // discoverability
  0.9 // confidence
);

// Immutable - cannot be modified
console.log(Object.isFrozen(score)); // true

// Auto-calculated total and severity
console.log(score.total);    // 36
console.log(score.severity); // "high"

// Validation ensures all dimensions are 0-10
try {
  DREADScoreFactory.create(15, 10, 5, 5, 5); // Error!
} catch (e) {
  console.error(e.message); // "damage must be 0-10, got 15"
}
```

## Threat Category Baseline Scores

Default DREAD scores for common threats:

| Threat Type | D | R | E | A | D | Total | Severity |
|-------------|---|---|---|---|---|-------|----------|
| **PromptInjection** | 9 | 8 | 7 | 8 | 6 | 38 | Critical |
| **CommandInjection** | 10 | 9 | 8 | 9 | 7 | 43 | Critical |
| **SecretExposure** | 8 | 10 | 5 | 7 | 8 | 38 | Critical |
| **PathTraversal** | 7 | 7 | 6 | 6 | 5 | 31 | High |
| **InsecureSettings** | 5 | 8 | 4 | 5 | 6 | 28 | Medium |
| **InsecureEndpoint** | 6 | 9 | 5 | 6 | 7 | 33 | High |

## References

- **Microsoft DREAD Methodology**: [Security Development Lifecycle](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/security-policy-settings)
- **ADR-023**: Security Package Architecture
- **DDD-005**: Security Domain Model
- **OWASP Risk Rating**: [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)

## API Reference

See [API Documentation](./README.md#api-reference) for complete API details.

## License

MIT - See LICENSE file for details.
