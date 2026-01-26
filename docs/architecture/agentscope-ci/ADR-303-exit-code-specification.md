# ADR-303: Exit Code Specification

## Status
Proposed

## Context

CI/CD systems rely on exit codes to determine pipeline success/failure. AgentScope-CI needs deterministic, well-defined exit codes that:

1. **Communicate Results Clearly**: Success vs warnings vs critical failures
2. **Enable Conditional Logic**: CI/CD can react differently to different failures
3. **Support Multiple Modes**: Audit (always pass) vs Blocking (fail on violations)
4. **Distinguish Error Types**: Configuration error vs scan error vs policy violation
5. **Follow Unix Conventions**: 0=success, non-zero=failure

### Requirements

**REQ-EXIT-001**: Exit code 0 = All checks passed
**REQ-EXIT-002**: Exit code 1 = Warnings present (configurable if should fail)
**REQ-EXIT-003**: Exit code 2 = Critical issues present (always fails)
**REQ-EXIT-004**: Exit code 3 = Configuration error (invalid agentscope-ci.yml)
**REQ-EXIT-005**: Exit code 4 = Scan error (AgentScope core failed)

### Use Cases

**CI/CD Pipeline**: "If exit code 2, block merge. If exit code 1, create warning comment."
**Pre-commit Hook**: "If exit code 2 or 3, block commit. If exit code 1, allow with warning."
**Developer Workflow**: "Exit code 0 = commit proceeds, non-zero = fix issues first"

## Decision

Define **5 distinct exit codes** with clear semantics and handling rules.

### Exit Code Table

| Code | Name | Meaning | Mode Behavior | CI/CD Action |
|------|------|---------|---------------|--------------|
| 0 | `SUCCESS` | All checks passed, no issues found | Always passes | ✅ Continue pipeline |
| 1 | `WARNINGS` | Non-critical issues (high/medium severity) | Pass if mode=audit/warning, fail if mode=blocking | ⚠️ Optional warning comment |
| 2 | `CRITICAL` | Critical security issues found | **Always fails** regardless of mode | ❌ Block merge/deployment |
| 3 | `CONFIG_ERROR` | Invalid `.agentscope-ci.yml` or policy file | **Always fails** | ❌ Block with config error |
| 4 | `SCAN_ERROR` | AgentScope core scan failed (internal error) | **Always fails** | ❌ Block with scan error |

### Exit Code Logic

```typescript
// src/exit-codes.ts
export enum ExitCode {
  SUCCESS = 0,
  WARNINGS = 1,
  CRITICAL = 2,
  CONFIG_ERROR = 3,
  SCAN_ERROR = 4
}

export interface DetermineExitCodeInput {
  violations: PolicyViolation[];
  mode: 'audit' | 'warning' | 'blocking';
  configError?: Error;
  scanError?: Error;
}

export function determineExitCode(input: DetermineExitCodeInput): ExitCode {
  const { violations, mode, configError, scanError } = input;

  // Priority 1: Configuration errors (highest priority)
  if (configError) {
    return ExitCode.CONFIG_ERROR;
  }

  // Priority 2: Scan errors
  if (scanError) {
    return ExitCode.SCAN_ERROR;
  }

  // Priority 3: Critical violations (always fail)
  const hasCritical = violations.some(v => v.severity === 'critical');
  if (hasCritical) {
    return ExitCode.CRITICAL;
  }

  // Priority 4: High/Medium violations (depend on mode)
  const hasWarnings = violations.some(v =>
    v.severity === 'high' || v.severity === 'medium'
  );

  if (hasWarnings) {
    // Only fail in blocking mode
    if (mode === 'blocking') {
      return ExitCode.WARNINGS;
    }
    // In audit/warning mode, still report but don't fail
    return ExitCode.SUCCESS;
  }

  // Priority 5: Low severity or no violations
  return ExitCode.SUCCESS;
}
```

### Mode-Specific Behavior

```typescript
// Exit code behavior by mode
interface ModeBehavior {
  mode: 'audit' | 'warning' | 'blocking';
  critical: 'pass' | 'fail';
  high: 'pass' | 'fail';
  medium: 'pass' | 'fail';
  low: 'pass' | 'fail';
}

const MODE_BEHAVIORS: Record<string, ModeBehavior> = {
  audit: {
    mode: 'audit',
    critical: 'fail',   // Always fail on critical
    high: 'pass',       // Report but don't fail
    medium: 'pass',
    low: 'pass'
  },
  warning: {
    mode: 'warning',
    critical: 'fail',   // Always fail on critical
    high: 'pass',       // Report but don't fail
    medium: 'pass',
    low: 'pass'
  },
  blocking: {
    mode: 'blocking',
    critical: 'fail',   // Always fail on critical
    high: 'fail',       // Fail on high severity
    medium: 'pass',     // Report but don't fail
    low: 'pass'
  }
};

// Note: Policy can override behavior per severity level
// Example: blockMedium: true in blocking mode
```

### Exit Code Messages

```typescript
// src/exit-messages.ts
export const EXIT_MESSAGES: Record<ExitCode, string> = {
  [ExitCode.SUCCESS]: 'All security checks passed ✓',

  [ExitCode.WARNINGS]:
    'Security warnings found. Fix before merge in blocking mode.',

  [ExitCode.CRITICAL]:
    'Critical security issues found. Merge blocked.\n' +
    'Review violations below and fix before committing.',

  [ExitCode.CONFIG_ERROR]:
    'Invalid .agentscope-ci.yml policy file.\n' +
    'Run: agentscope-ci validate-policy',

  [ExitCode.SCAN_ERROR]:
    'AgentScope scan failed (internal error).\n' +
    'Check AgentScope core installation and file permissions.'
};

export function getExitMessage(code: ExitCode, details?: string): string {
  const baseMessage = EXIT_MESSAGES[code];
  return details ? `${baseMessage}\n\n${details}` : baseMessage;
}
```

### CLI Exit Handling

```typescript
// src/cli.ts
import { determineExitCode, ExitCode, getExitMessage } from './exit-codes';

async function runCheck(options: CheckOptions): Promise<never> {
  try {
    // 1. Load policy
    const policy = await loadPolicy();

    // 2. Run scan
    const scanResult = await scan(options);

    // 3. Enforce policy
    const enforcement = enforcePolicy(scanResult, policy);

    // 4. Generate reports
    await generateReports(enforcement, options);

    // 5. Determine exit code
    const exitCode = determineExitCode({
      violations: enforcement.violations,
      mode: policy.mode,
      configError: undefined,
      scanError: undefined
    });

    // 6. Print message and exit
    console.log(getExitMessage(exitCode));
    process.exit(exitCode);

  } catch (error) {
    // Handle errors with appropriate exit codes
    if (error instanceof PolicyValidationError) {
      console.error(getExitMessage(ExitCode.CONFIG_ERROR, error.message));
      process.exit(ExitCode.CONFIG_ERROR);
    }

    if (error instanceof ScanError) {
      console.error(getExitMessage(ExitCode.SCAN_ERROR, error.message));
      process.exit(ExitCode.SCAN_ERROR);
    }

    // Unknown error - treat as scan error
    console.error(getExitMessage(ExitCode.SCAN_ERROR, String(error)));
    process.exit(ExitCode.SCAN_ERROR);
  }
}
```

### CI/CD Integration Examples

#### GitHub Actions

```yaml
# .github/workflows/security.yml
name: AgentScope Security Check

on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g agentscope-ci

      - name: Security Scan
        id: scan
        run: agentscope-ci check --mode=blocking --output=json > result.json
        continue-on-error: true

      - name: Handle Exit Code
        run: |
          EXIT_CODE=${{ steps.scan.outcome == 'success' && '0' || steps.scan.outcome }}

          if [ $EXIT_CODE -eq 0 ]; then
            echo "✅ Security scan passed"
          elif [ $EXIT_CODE -eq 1 ]; then
            echo "⚠️ Security warnings found"
            # Post comment on PR (optional)
          elif [ $EXIT_CODE -eq 2 ]; then
            echo "❌ Critical security issues - blocking merge"
            exit 2
          elif [ $EXIT_CODE -eq 3 ]; then
            echo "❌ Invalid policy configuration"
            exit 3
          elif [ $EXIT_CODE -eq 4 ]; then
            echo "❌ Scan error"
            exit 4
          fi
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
agentscope-security:
  stage: test
  script:
    - npm install -g agentscope-ci
    - agentscope-ci check --mode=blocking --output=junit || EXIT_CODE=$?
    - |
      if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Security scan passed"
      elif [ $EXIT_CODE -eq 1 ]; then
        echo "⚠️ Security warnings (allowed in this mode)"
        exit 0  # Don't fail pipeline
      elif [ $EXIT_CODE -eq 2 ]; then
        echo "❌ Critical security issues"
        exit 2
      elif [ $EXIT_CODE -eq 3 ]; then
        echo "❌ Invalid policy"
        exit 3
      elif [ $EXIT_CODE -eq 4 ]; then
        echo "❌ Scan failed"
        exit 4
      fi
  artifacts:
    reports:
      junit: agentscope-junit.xml
  rules:
    - if: $CI_MERGE_REQUEST_ID
```

#### Jenkins Pipeline

```groovy
pipeline {
  agent any
  stages {
    stage('Security Scan') {
      steps {
        script {
          def exitCode = sh(
            script: 'agentscope-ci check --mode=blocking',
            returnStatus: true
          )

          switch(exitCode) {
            case 0:
              echo '✅ Security scan passed'
              break
            case 1:
              echo '⚠️ Security warnings'
              // Optional: post to PR
              break
            case 2:
              error('❌ Critical security issues - blocking merge')
              break
            case 3:
              error('❌ Invalid policy configuration')
              break
            case 4:
              error('❌ Scan error')
              break
            default:
              error("Unknown exit code: ${exitCode}")
          }
        }
      }
    }
  }
}
```

### Pre-commit Hook

```bash
#!/usr/bin/env bash
# .husky/pre-commit

# Run AgentScope-CI
npx agentscope-ci check --mode=blocking

EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "✅ Security checks passed"
    exit 0
    ;;
  1)
    echo "⚠️ Security warnings (allowed in this mode)"
    exit 0
    ;;
  2)
    echo "❌ Critical security issues - commit blocked"
    echo "Run 'agentscope-ci check' for details"
    exit 1
    ;;
  3)
    echo "❌ Invalid .agentscope-ci.yml"
    echo "Run 'agentscope-ci validate-policy' to fix"
    exit 1
    ;;
  4)
    echo "❌ Scan error - check AgentScope installation"
    exit 1
    ;;
  *)
    echo "Unknown exit code: $EXIT_CODE"
    exit 1
    ;;
esac
```

### Exit Code Testing

```typescript
// tests/exit-codes.test.ts
import { describe, it, expect } from 'vitest';
import { determineExitCode, ExitCode } from '../src/exit-codes';

describe('Exit Code Logic', () => {
  it('should return SUCCESS when no violations', () => {
    const exitCode = determineExitCode({
      violations: [],
      mode: 'blocking',
      configError: undefined,
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.SUCCESS);
  });

  it('should return CONFIG_ERROR when policy invalid', () => {
    const exitCode = determineExitCode({
      violations: [],
      mode: 'blocking',
      configError: new Error('Invalid YAML'),
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.CONFIG_ERROR);
  });

  it('should return CRITICAL when critical violations exist', () => {
    const exitCode = determineExitCode({
      violations: [
        { severity: 'critical', type: 'SECRET_EXPOSURE', /* ... */ }
      ],
      mode: 'audit',
      configError: undefined,
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.CRITICAL);
  });

  it('should return WARNINGS in blocking mode with high severity', () => {
    const exitCode = determineExitCode({
      violations: [
        { severity: 'high', type: 'UNAPPROVED_MCP', /* ... */ }
      ],
      mode: 'blocking',
      configError: undefined,
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.WARNINGS);
  });

  it('should return SUCCESS in audit mode with high severity', () => {
    const exitCode = determineExitCode({
      violations: [
        { severity: 'high', type: 'UNAPPROVED_MCP', /* ... */ }
      ],
      mode: 'audit',
      configError: undefined,
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.SUCCESS);
  });

  it('should prioritize config error over violations', () => {
    const exitCode = determineExitCode({
      violations: [
        { severity: 'critical', type: 'SECRET_EXPOSURE', /* ... */ }
      ],
      mode: 'blocking',
      configError: new Error('Invalid YAML'),
      scanError: undefined
    });

    expect(exitCode).toBe(ExitCode.CONFIG_ERROR);
  });
});
```

## Consequences

### Positive

1. **Clear Semantics**: Each exit code has well-defined meaning
2. **CI/CD Integration**: Platforms can react to different failures
3. **Deterministic**: Same inputs always produce same exit code
4. **Gradual Adoption**: Audit mode can pass with violations (exit 0)
5. **Error Distinction**: Config error vs scan error vs policy violation
6. **Unix Convention**: 0=success, non-zero=failure
7. **Developer Friendly**: Clear messages explain what to fix

### Negative

1. **Limited Range**: Only 5 exit codes (could need more in future)
2. **Mode Complexity**: Behavior differs between audit/warning/blocking
3. **Priority Rules**: Multiple violations require prioritization logic

### Neutral

1. **Documentation**: Need clear docs for each exit code
2. **Testing**: Need comprehensive test coverage for all code paths

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-302: Policy Engine Design (determines violations)
- ADR-304: Pre-Commit Integration (hook behavior based on exit codes)
- ADR-306: Reporting Formats (reports include exit code explanation)

## References

- [Unix Exit Codes Convention](https://tldp.org/LDP/abs/html/exitcodes.html)
- [GitHub Actions Exit Codes](https://docs.github.com/en/actions/creating-actions/setting-exit-codes-for-actions)
- [GitLab CI Exit Codes](https://docs.gitlab.com/ee/ci/yaml/#script)
