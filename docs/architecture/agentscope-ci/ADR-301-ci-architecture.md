# ADR-301: CI/CD Integration Architecture

## Status
Proposed

## Context

AgentScope-CI needs to integrate with multiple CI/CD platforms (GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure Pipelines) while maintaining:

1. **Platform Agnostic Design**: Works with any CI/CD system through standard CLI interfaces
2. **Minimal Overhead**: <10s for pre-commit hooks, <30s for CI/CD scans
3. **Clear Exit Codes**: 0=pass, 1=warnings, 2=critical, 3=config error, 4=scan error
4. **Policy Enforcement**: Block commits/merges based on configurable security policies
5. **Gradual Adoption**: Audit → Warning → Blocking mode for phased rollout

### Current Challenges

| Challenge | Impact | Frequency |
|-----------|--------|-----------|
| Manual security reviews | Vulnerabilities slip to production | Every merge |
| Inconsistent enforcement | Different standards per team | Every project |
| Post-merge discovery | Issues found after code merged | Weekly |
| No automation | Developers bypass checks | Daily |
| Tribal knowledge | Policies exist only in heads | Onboarding |

### Integration Points

AgentScope-CI wraps AgentScope Core and integrates with:

- **AgentScope Core** (v1.2+): Security scanning and validation engine
- **@claude-flow/security**: Shared security primitives (CVE remediation)
- **AgentDB**: Policy storage and pattern caching
- **Git Hooks**: Pre-commit, pre-push, commit-msg validation
- **CI/CD Platforms**: Exit codes and report formats for automation

## Decision

Build AgentScope-CI as a **wrapper around AgentScope Core** with three integration layers:

### 1. Hook Layer (Pre-commit/Pre-push)

```typescript
// Hook execution flow
interface HookLayer {
  // Check if AgentScope files changed
  detectChangedFiles(): string[];

  // Load policy from repository/org
  loadPolicy(): PolicyConfig;

  // Run scan with caching
  scanWithCache(files: string[]): ScanResult;

  // Enforce policy rules
  enforcePolicy(result: ScanResult, policy: PolicyConfig): PolicyViolation[];

  // Generate report and exit
  reportAndExit(violations: PolicyViolation[]): never;
}
```

### 2. Policy Layer (Enforcement Engine)

```typescript
// Policy enforcement architecture
interface PolicyLayer {
  // Load policy with inheritance (repo → team → org)
  loadPolicyChain(): PolicyConfig;

  // Validate policy schema
  validatePolicy(policy: unknown): PolicyConfig;

  // Apply policy rules to scan results
  enforceRules(result: ScanResult, policy: PolicyConfig): {
    violations: PolicyViolation[];
    exitCode: 0 | 1 | 2 | 3 | 4;
    passed: boolean;
  };

  // Handle overrides (path-based exceptions)
  applyOverrides(violations: PolicyViolation[], overrides: Override[]): PolicyViolation[];
}
```

### 3. Reporter Layer (Output Formats)

```typescript
// Multi-format reporting
interface ReporterLayer {
  // Human-readable console output
  console(violations: PolicyViolation[]): string;

  // Machine-parseable JSON
  json(violations: PolicyViolation[]): object;

  // JUnit XML for CI/CD test reporters
  junit(violations: PolicyViolation[]): string;

  // SARIF for security tools
  sarif(violations: PolicyViolation[]): object;

  // Markdown for PR comments
  markdown(violations: PolicyViolation[]): string;
}
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Hook / CI/CD                          │
│              (Pre-commit, Pre-push, CI Pipeline)             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  AgentScope-CI CLI                           │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Hook Manager │ Policy Engine│ Report Generator     │    │
│  │  - Detect    │  - Load      │  - Console (color)   │    │
│  │  - Cache     │  - Validate  │  - JSON (structured) │    │
│  │  - Execute   │  - Enforce   │  - JUnit (CI/CD)     │    │
│  │              │  - Override  │  - SARIF (security)  │    │
│  │              │              │  - Markdown (PRs)    │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  AgentScope Core                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Security Scanning (CVEs, Secrets, Injection)     │      │
│  │ Config Validation (MCP, Permissions, Hooks)      │      │
│  │ DREAD Scoring (Risk Assessment)                  │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Common Core (@claude-flow)                      │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Security     │ Memory       │ Performance          │    │
│  │ (Validation) │ (Caching)    │ (HNSW, Quantization) │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Hook Manager** | Detect file changes, run scans with caching | Git hooks, file watching |
| **Policy Engine** | Load, validate, enforce policies | Zod validation, rule engine |
| **Report Generator** | Multi-format output (JSON, JUnit, SARIF, etc.) | Template engines |
| **AgentScope Core** | Security scanning, risk assessment | Existing scanner |
| **Common Core** | Shared security, memory, performance | @claude-flow/* packages |

### Exit Code Specification

```typescript
enum ExitCode {
  SUCCESS = 0,        // All checks passed
  WARNINGS = 1,       // Non-critical issues (fails if mode=blocking)
  CRITICAL = 2,       // Critical security issues (always fails)
  CONFIG_ERROR = 3,   // Invalid agentscope-ci.yml
  SCAN_ERROR = 4      // AgentScope core scan failed
}

function determineExitCode(
  violations: PolicyViolation[],
  policy: PolicyConfig
): ExitCode {
  // Check for config errors first
  if (policy.error) return ExitCode.CONFIG_ERROR;

  // Check for scan errors
  if (violations.some(v => v.scanError)) return ExitCode.SCAN_ERROR;

  // Check for critical violations
  if (violations.some(v => v.severity === 'critical')) {
    return ExitCode.CRITICAL;
  }

  // Check for warnings (only fails in blocking mode)
  if (violations.some(v => v.severity === 'high' || v.severity === 'medium')) {
    return policy.mode === 'blocking' ? ExitCode.WARNINGS : ExitCode.SUCCESS;
  }

  return ExitCode.SUCCESS;
}
```

### Policy Configuration Format

```yaml
# .agentscope-ci.yml (repository root)
version: "1.0"
mode: "blocking"  # audit | warning | blocking

# Severity-based enforcement
policies:
  security:
    maxDreadScore: 7.0
    blockCritical: true
    blockHigh: true
    blockMedium: false
    blockLow: false

  # Secrets detection
  secrets:
    allowHardcodedSecrets: false
    scanFiles: [".claude/**", "CLAUDE.md", ".mcp.json"]

  # Prompt injection
  promptInjection:
    enabled: true
    confidenceThreshold: 0.8

  # MCP server restrictions
  mcpServers:
    mode: "allowlist"  # allowlist | denylist | disabled
    allowed:
      - "claude-flow"
      - "ruv-swarm"
    denied:
      - "untrusted-*"

  # Permission defaults
  permissions:
    requireDefaultMode: "ask"  # deny | ask | allow
    blockWildcardBash: true
    blockWildcardWrite: true

# Path-based overrides
overrides:
  - path: "legacy/**"
    mode: "audit"
    policies:
      security:
        maxDreadScore: 9.0
```

### Integration with Common Core

```typescript
// Use shared security primitives
import { InputValidator, PathValidator, SecretsSanitizer } from '@claude-flow/security';
import { VectorDatabase } from '@claude-flow/memory';

// Policy validation with Zod
const PolicySchema = z.object({
  version: z.literal('1.0'),
  mode: z.enum(['audit', 'warning', 'blocking']),
  policies: z.object({
    security: z.object({
      maxDreadScore: z.number().min(0).max(10),
      blockCritical: z.boolean(),
      // ...
    }),
    // ...
  }),
  overrides: z.array(z.object({
    path: z.string(),
    mode: z.enum(['audit', 'warning', 'blocking']),
  })).optional()
});

// Validate policy file
const policy = InputValidator.validate(PolicySchema, loadedYaml);

// Cache scan results in AgentDB
const cache = new VectorDatabase({
  backend: 'disk',
  hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
  quantization: { enabled: true, bits: 4 }
});

// Store scan result
await cache.insert(
  fileHash,
  scanResultEmbedding,
  { violations, timestamp, passed }
);

// Retrieve cached result
const cached = await cache.search(fileHashEmbedding, 1);
if (cached.length > 0 && cached[0].distance < 0.01) {
  // Use cached result (skip scan)
  return cached[0].metadata as CachedScanResult;
}
```

## Consequences

### Positive

1. **Platform Agnostic**: Works with any CI/CD system through standard CLI and exit codes
2. **Minimal Duplication**: Wraps AgentScope Core instead of reimplementing scanning
3. **Shared Security**: Uses @claude-flow/security for validated input, path safety, secret sanitization
4. **Fast Execution**: <10s pre-commit, <30s CI/CD with caching via AgentDB
5. **Gradual Adoption**: Audit → Warning → Blocking mode enables phased rollout
6. **Policy as Code**: YAML-based policies with inheritance (repo → team → org)
7. **Multi-Format Reports**: JSON, JUnit, SARIF, Markdown for different consumers
8. **Clear Exit Codes**: Deterministic success/failure for CI/CD pipelines

### Negative

1. **Dependency on AgentScope Core**: Breaking changes in v1.2+ require updates
2. **Limited Customization**: Policy schema must cover all use cases (extensible in v2.0)
3. **Cache Invalidation Complexity**: File changes require smart cache invalidation
4. **Additional Maintenance**: New package to maintain alongside AgentScope Core

### Neutral

1. **Learning Curve**: Teams need to understand policy YAML syntax
2. **Configuration Overhead**: Each repository needs .agentscope-ci.yml setup
3. **CI/CD Integration**: Requires YAML examples for 5+ platforms

## Related Decisions

- ADR-302: Policy Engine Design (defines YAML schema and validation)
- ADR-303: Exit Code Specification (details exit code logic)
- ADR-304: Pre-Commit Integration (Husky, lint-staged implementation)
- ADR-305: Caching Strategy (AgentDB-based result caching)
- ADR-306: Reporting Formats (JSON, JUnit, SARIF, Markdown)
- DDD-301: CI Domain Model (bounded contexts and aggregates)

## References

- [AgentScope Core v1.2 Scanning API](../../v1.2/ADR-INDEX.md)
- [@claude-flow/security Package](../COMMON-CORE.md)
- [AgentDB HNSW Indexing](../COMMON-CORE.md)
- [Pre-commit Framework](https://pre-commit.com/)
- [SARIF Specification](https://sarifweb.azurewebsites.net/)
- [JUnit XML Format](https://llg.cubic.org/docs/junit/)
