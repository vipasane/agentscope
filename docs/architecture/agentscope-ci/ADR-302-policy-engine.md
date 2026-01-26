# ADR-302: Policy Engine Design

## Status
Proposed

## Context

AgentScope-CI needs a policy engine to:

1. **Define Security Policies**: What is allowed/denied in agent configurations
2. **Enforce Consistently**: Same rules across all repositories/teams
3. **Support Gradual Adoption**: Audit → Warning → Blocking mode
4. **Enable Customization**: Per-repository, team, and organization policies
5. **Provide Clear Feedback**: Actionable remediation for violations

### Requirements

**REQ-POL-001**: Policy defined in YAML format (human-readable, version-controlled)
**REQ-POL-002**: Support severity thresholds (critical, high, medium, low)
**REQ-POL-003**: Support DREAD score thresholds (0-10 scale)
**REQ-POL-004**: Support deny-list patterns (blocked MCP servers, dangerous tools)
**REQ-POL-005**: Support allow-list patterns (approved MCP servers only)
**REQ-POL-006**: Policy inheritance (repository → team → organization)

### Use Cases

**Security Engineer**: "Block all commits with DREAD score >7.0 or hardcoded secrets"
**Platform Team**: "Only allow approved MCP servers: claude-flow, ruv-swarm"
**DevOps Engineer**: "Start in audit mode, then warning, then blocking over 3 months"
**Developer**: "Need clear error messages: 'Hardcoded API key at line 42 in CLAUDE.md'"

## Decision

Implement a **rule-based policy engine** with YAML schema validation via Zod.

### 1. Policy Schema (YAML)

```yaml
# .agentscope-ci.yml
version: "1.0"

# Enforcement mode
mode: "blocking"  # audit | warning | blocking

# Exit code behavior
exitCodes:
  critical: 2      # Exit 2 on critical violations
  warnings: 1      # Exit 1 on warnings (only if mode=blocking)

# Security policies
policies:
  # Overall security thresholds
  security:
    maxDreadScore: 7.0        # Block if DREAD score >7.0
    blockCritical: true       # Always block critical severity
    blockHigh: true           # Block high severity
    blockMedium: false        # Allow medium severity
    blockLow: false           # Allow low severity

  # Secrets detection
  secrets:
    allowHardcodedSecrets: false
    scanFiles:
      - ".claude/**"
      - "CLAUDE.md"
      - ".mcp.json"
    patterns:
      - name: "Anthropic API Key"
        regex: "sk-ant-[a-zA-Z0-9]{48}"
      - name: "GitHub Token"
        regex: "ghp_[a-zA-Z0-9]{36}"

  # Prompt injection detection
  promptInjection:
    enabled: true
    confidenceThreshold: 0.8  # 0.0-1.0 (block if >0.8 confidence)
    scanFiles:
      - ".claude/**"
      - "CLAUDE.md"

  # Command injection detection
  commandInjection:
    enabled: true
    scanHooks: true
    scanMcpServers: true
    dangerousCommands:
      - "rm -rf"
      - "curl | sh"
      - "eval"

  # MCP server restrictions
  mcpServers:
    mode: "allowlist"  # allowlist | denylist | disabled
    allowed:
      - "claude-flow"
      - "ruv-swarm"
      - "agentdb"
    denied:
      - "untrusted-*"
      - "experimental-*"

  # Permission defaults
  permissions:
    requireDefaultMode: "ask"  # deny | ask | allow
    blockWildcardBash: true
    blockWildcardWrite: true
    blockWildcardRead: false

# Path-based overrides
overrides:
  - path: "legacy/**"
    mode: "audit"  # Don't block for legacy configs
    policies:
      security:
        maxDreadScore: 9.0  # More lenient for legacy

  - path: "experimental/**"
    mode: "warning"
    policies:
      mcpServers:
        mode: "disabled"  # Allow any MCP server

# Custom rules (v2.0 feature)
customRules: []
```

### 2. TypeScript Schema (Zod Validation)

```typescript
// src/policy/schema.ts
import { z } from 'zod';

export const PolicySchema = z.object({
  version: z.literal('1.0'),

  mode: z.enum(['audit', 'warning', 'blocking']).default('audit'),

  exitCodes: z.object({
    critical: z.number().min(0).max(255).default(2),
    warnings: z.number().min(0).max(255).default(1)
  }).optional(),

  policies: z.object({
    security: z.object({
      maxDreadScore: z.number().min(0).max(10).default(7.0),
      blockCritical: z.boolean().default(true),
      blockHigh: z.boolean().default(true),
      blockMedium: z.boolean().default(false),
      blockLow: z.boolean().default(false)
    }).optional(),

    secrets: z.object({
      allowHardcodedSecrets: z.boolean().default(false),
      scanFiles: z.array(z.string()).default(['.claude/**', 'CLAUDE.md']),
      patterns: z.array(z.object({
        name: z.string(),
        regex: z.string()
      })).optional()
    }).optional(),

    promptInjection: z.object({
      enabled: z.boolean().default(true),
      confidenceThreshold: z.number().min(0).max(1).default(0.8),
      scanFiles: z.array(z.string()).optional()
    }).optional(),

    commandInjection: z.object({
      enabled: z.boolean().default(true),
      scanHooks: z.boolean().default(true),
      scanMcpServers: z.boolean().default(true),
      dangerousCommands: z.array(z.string()).optional()
    }).optional(),

    mcpServers: z.object({
      mode: z.enum(['allowlist', 'denylist', 'disabled']).default('disabled'),
      allowed: z.array(z.string()).optional(),
      denied: z.array(z.string()).optional()
    }).optional(),

    permissions: z.object({
      requireDefaultMode: z.enum(['deny', 'ask', 'allow']).default('ask'),
      blockWildcardBash: z.boolean().default(true),
      blockWildcardWrite: z.boolean().default(true),
      blockWildcardRead: z.boolean().default(false)
    }).optional()
  }),

  overrides: z.array(z.object({
    path: z.string(),
    mode: z.enum(['audit', 'warning', 'blocking']).optional(),
    policies: z.any().optional()
  })).optional(),

  customRules: z.array(z.any()).optional()
});

export type PolicyConfig = z.infer<typeof PolicySchema>;
```

### 3. Policy Loading (Inheritance Chain)

```typescript
// src/policy/loader.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { InputValidator } from '@claude-flow/security';
import { PolicySchema, PolicyConfig } from './schema';

export class PolicyLoader {
  /**
   * Load policy with inheritance chain:
   * Organization → Team → Repository
   */
  async loadPolicyChain(repoPath: string): Promise<PolicyConfig> {
    const policies: PolicyConfig[] = [];

    // 1. Organization policy (lowest priority)
    const orgPolicy = await this.loadOrgPolicy();
    if (orgPolicy) policies.push(orgPolicy);

    // 2. Team policy (medium priority)
    const teamPolicy = await this.loadTeamPolicy(repoPath);
    if (teamPolicy) policies.push(teamPolicy);

    // 3. Repository policy (highest priority)
    const repoPolicy = await this.loadRepoPolicy(repoPath);
    if (repoPolicy) policies.push(repoPolicy);

    // Merge policies (later policies override earlier)
    return this.mergePolicies(policies);
  }

  private async loadOrgPolicy(): Promise<PolicyConfig | null> {
    const orgPath = path.join(
      process.env.HOME || '~',
      '.agentscope',
      'policy.yml'
    );

    return this.loadPolicyFile(orgPath);
  }

  private async loadTeamPolicy(repoPath: string): Promise<PolicyConfig | null> {
    // Check for team policy in parent directories
    // Example: /workspace/.agentscope-team.yml
    const teamPath = path.join(
      path.dirname(repoPath),
      '.agentscope-team.yml'
    );

    return this.loadPolicyFile(teamPath);
  }

  private async loadRepoPolicy(repoPath: string): Promise<PolicyConfig | null> {
    const repoPath = path.join(repoPath, '.agentscope-ci.yml');
    return this.loadPolicyFile(repoPolicyPath);
  }

  private async loadPolicyFile(filePath: string): Promise<PolicyConfig | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = yaml.load(content);

      // Validate with Zod
      return InputValidator.validate(PolicySchema, parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw new Error(`Invalid policy file ${filePath}: ${error}`);
    }
  }

  private mergePolicies(policies: PolicyConfig[]): PolicyConfig {
    // Deep merge with later policies taking precedence
    return policies.reduce((merged, policy) => {
      return {
        ...merged,
        ...policy,
        policies: {
          ...merged.policies,
          ...policy.policies
        },
        overrides: [
          ...(merged.overrides || []),
          ...(policy.overrides || [])
        ]
      };
    }, {} as PolicyConfig);
  }
}
```

### 4. Policy Enforcement

```typescript
// src/policy/enforcer.ts
import { ScanResult, Violation } from '@vipasane/agentscope';
import { PolicyConfig } from './schema';

export interface PolicyViolation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  policy: string;
  file: string;
  line?: number;
  message: string;
  remediation: string;
  dreadScore?: number;
}

export class PolicyEnforcer {
  constructor(private policy: PolicyConfig) {}

  /**
   * Enforce policy rules on scan result
   */
  enforce(scanResult: ScanResult): {
    violations: PolicyViolation[];
    exitCode: 0 | 1 | 2 | 3 | 4;
    passed: boolean;
  } {
    const violations: PolicyViolation[] = [];

    // 1. Check DREAD score
    if (this.policy.policies.security?.maxDreadScore !== undefined) {
      const dreadViolations = this.checkDreadScore(scanResult);
      violations.push(...dreadViolations);
    }

    // 2. Check severity thresholds
    const severityViolations = this.checkSeverity(scanResult);
    violations.push(...severityViolations);

    // 3. Check secrets
    if (this.policy.policies.secrets?.allowHardcodedSecrets === false) {
      const secretViolations = this.checkSecrets(scanResult);
      violations.push(...secretViolations);
    }

    // 4. Check MCP servers
    if (this.policy.policies.mcpServers?.mode !== 'disabled') {
      const mcpViolations = this.checkMcpServers(scanResult);
      violations.push(...mcpViolations);
    }

    // 5. Check prompt injection
    if (this.policy.policies.promptInjection?.enabled) {
      const injectionViolations = this.checkPromptInjection(scanResult);
      violations.push(...injectionViolations);
    }

    // 6. Apply path-based overrides
    const filteredViolations = this.applyOverrides(violations);

    // 7. Determine exit code
    const exitCode = this.determineExitCode(filteredViolations);

    return {
      violations: filteredViolations,
      exitCode,
      passed: exitCode === 0
    };
  }

  private checkDreadScore(scanResult: ScanResult): PolicyViolation[] {
    const maxScore = this.policy.policies.security!.maxDreadScore;

    if (scanResult.dreadScore > maxScore) {
      return [{
        severity: 'critical',
        type: 'DREAD_SCORE_EXCEEDED',
        policy: 'security.maxDreadScore',
        file: scanResult.configPath,
        message: `DREAD score ${scanResult.dreadScore.toFixed(1)} exceeds maximum ${maxScore}`,
        remediation: `Reduce DREAD score by addressing high-risk vulnerabilities`,
        dreadScore: scanResult.dreadScore
      }];
    }

    return [];
  }

  private checkSeverity(scanResult: ScanResult): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const { security } = this.policy.policies;

    for (const issue of scanResult.issues) {
      const shouldBlock = (
        (issue.severity === 'critical' && security?.blockCritical) ||
        (issue.severity === 'high' && security?.blockHigh) ||
        (issue.severity === 'medium' && security?.blockMedium) ||
        (issue.severity === 'low' && security?.blockLow)
      );

      if (shouldBlock) {
        violations.push({
          severity: issue.severity,
          type: issue.type,
          policy: `security.block${issue.severity.charAt(0).toUpperCase()}${issue.severity.slice(1)}`,
          file: issue.file,
          line: issue.line,
          message: issue.message,
          remediation: issue.remediation || 'No remediation provided'
        });
      }
    }

    return violations;
  }

  private checkSecrets(scanResult: ScanResult): PolicyViolation[] {
    return scanResult.issues
      .filter(issue => issue.type === 'SECRET_EXPOSURE')
      .map(issue => ({
        severity: 'critical' as const,
        type: 'SECRET_EXPOSURE',
        policy: 'secrets.allowHardcodedSecrets',
        file: issue.file,
        line: issue.line,
        message: issue.message,
        remediation: 'Replace hardcoded secret with environment variable'
      }));
  }

  private checkMcpServers(scanResult: ScanResult): PolicyViolation[] {
    const { mode, allowed = [], denied = [] } = this.policy.policies.mcpServers!;
    const violations: PolicyViolation[] = [];

    for (const server of scanResult.mcpServers || []) {
      if (mode === 'allowlist' && !allowed.includes(server.name)) {
        violations.push({
          severity: 'high',
          type: 'UNAPPROVED_MCP_SERVER',
          policy: 'mcpServers.allowed',
          file: '.mcp.json',
          message: `MCP server "${server.name}" is not in allowlist`,
          remediation: `Use approved MCP servers: ${allowed.join(', ')}`
        });
      }

      if (mode === 'denylist' && denied.some(pattern => this.matchPattern(server.name, pattern))) {
        violations.push({
          severity: 'high',
          type: 'DENIED_MCP_SERVER',
          policy: 'mcpServers.denied',
          file: '.mcp.json',
          message: `MCP server "${server.name}" is in denylist`,
          remediation: `Remove denied MCP server`
        });
      }
    }

    return violations;
  }

  private checkPromptInjection(scanResult: ScanResult): PolicyViolation[] {
    const threshold = this.policy.policies.promptInjection!.confidenceThreshold;

    return scanResult.issues
      .filter(issue =>
        issue.type === 'PROMPT_INJECTION' &&
        (issue.confidence || 0) > threshold
      )
      .map(issue => ({
        severity: 'critical' as const,
        type: 'PROMPT_INJECTION',
        policy: 'promptInjection.confidenceThreshold',
        file: issue.file,
        line: issue.line,
        message: issue.message,
        remediation: 'Sanitize user input or use input validation'
      }));
  }

  private applyOverrides(violations: PolicyViolation[]): PolicyViolation[] {
    if (!this.policy.overrides?.length) return violations;

    return violations.filter(violation => {
      // Check if file matches any override path
      const override = this.policy.overrides!.find(o =>
        this.matchPattern(violation.file, o.path)
      );

      if (!override) return true; // No override, keep violation

      // If override mode is audit, don't block
      if (override.mode === 'audit') return false;

      // If override mode is warning, downgrade severity
      if (override.mode === 'warning') {
        violation.severity = 'medium';
      }

      return true;
    });
  }

  private determineExitCode(violations: PolicyViolation[]): 0 | 1 | 2 | 3 | 4 {
    // Critical violations always fail
    if (violations.some(v => v.severity === 'critical')) {
      return this.policy.exitCodes?.critical ?? 2;
    }

    // Warnings only fail in blocking mode
    if (violations.some(v => v.severity === 'high' || v.severity === 'medium')) {
      return this.policy.mode === 'blocking'
        ? (this.policy.exitCodes?.warnings ?? 1)
        : 0;
    }

    return 0; // No violations
  }

  private matchPattern(value: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }
}
```

### 5. Policy Storage (AgentDB)

```typescript
// src/policy/storage.ts
import { VectorDatabase } from '@claude-flow/memory';

export class PolicyStorage {
  constructor(private db: VectorDatabase) {}

  /**
   * Store policy for cross-repository sharing
   */
  async storePolicy(
    organization: string,
    team: string,
    policy: PolicyConfig
  ): Promise<void> {
    const policyId = `${organization}:${team}:policy`;
    const embedding = await this.embedPolicy(policy);

    await this.db.insert(policyId, embedding, {
      organization,
      team,
      policy,
      timestamp: Date.now()
    });
  }

  /**
   * Search for similar policies
   */
  async searchSimilarPolicies(
    policy: PolicyConfig,
    k = 5
  ): Promise<PolicyConfig[]> {
    const embedding = await this.embedPolicy(policy);
    const results = await this.db.search(embedding, k);

    return results.map(r => r.metadata.policy as PolicyConfig);
  }

  private async embedPolicy(policy: PolicyConfig): Promise<Float32Array> {
    // Simple embedding: hash of policy JSON
    const json = JSON.stringify(policy);
    const hash = this.simpleHash(json);

    // Convert to embedding (simplified)
    const embedding = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      embedding[i] = (hash >> i) & 1;
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
```

## Consequences

### Positive

1. **Human-Readable**: YAML format is easy to read and edit
2. **Version Controlled**: Policies live in repository, track changes via Git
3. **Validated**: Zod schemas prevent invalid configurations
4. **Flexible**: Inheritance chain allows organization/team/repo policies
5. **Gradual Adoption**: Audit → Warning → Blocking mode
6. **Path Overrides**: Legacy code can have different rules
7. **Shared Patterns**: AgentDB stores policies for cross-repo sharing
8. **Clear Violations**: Actionable remediation guidance

### Negative

1. **YAML Complexity**: Developers need to learn policy schema
2. **Validation Overhead**: ~1ms per policy load (acceptable)
3. **Override Complexity**: Path-based overrides can be confusing
4. **Limited Extensibility**: Custom rules deferred to v2.0

### Neutral

1. **Schema Evolution**: Need backward compatibility for schema changes
2. **Documentation**: Comprehensive policy reference guide required
3. **Testing**: Need extensive test coverage for policy edge cases

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-303: Exit Code Specification (exit code logic)
- ADR-305: Caching Strategy (cache policy validation results)
- DDD-301: CI Domain Model (Policy aggregate)

## References

- [Zod Schema Validation](https://zod.dev/)
- [YAML Specification](https://yaml.org/)
- [Policy as Code Best Practices](https://www.openpolicyagent.org/docs/latest/policy-language/)
