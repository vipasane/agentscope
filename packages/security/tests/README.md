# Security Package Tests

This directory contains comprehensive test coverage for the `@vipasane/agentscope-security` package.

## Test Structure

```
tests/
├── detectors/               # Detector tests
│   └── prompt-injection.test.ts
├── sanitizers/              # Sanitizer tests
│   └── SecretsSanitizer.test.ts
├── scoring/                 # Risk scoring tests
│   └── dread.test.ts
├── validators/              # Validator tests
│   ├── InputValidator.test.ts
│   ├── PathValidator.test.ts
│   └── SafeExecutor.test.ts
├── integration/             # Integration tests (NEW)
│   ├── validators-integration.test.ts
│   ├── security-workflow.test.ts
│   └── attack-simulation.test.ts
└── README.md
```

## New Integration Tests (Phase 3.5)

### 1. validators-integration.test.ts
**Purpose**: Test integration between InputValidator, PathValidator, and SafeExecutor in real-world scenarios.

**Test Categories**:
- File Operation Security Workflow
  - Complete file operation validation
  - Path traversal blocking
  - Null byte injection prevention
- Command Execution Security Workflow
  - Complete command execution validation
  - Command injection blocking
  - Argument escaping
  - Path + command combination
- API Input Validation Workflow
  - Complex nested object validation
  - Malformed request rejection
  - SQL injection sanitization
- Defense-in-Depth Integration
  - Multiple validation layers
  - Fail-fast behavior
  - Multi-layer sanitization
- Real-World Attack Scenarios
  - File upload path traversal
  - Command injection via filename
  - Unicode normalization attacks
  - XSS in email validation
  - Chained exploits
- Performance Under Attack
  - Bulk validation performance
  - Attack handling without DoS
- Edge Cases and Boundary Conditions
  - Maximum length inputs
  - Empty inputs
  - Deeply nested paths
  - Special character combinations

**Coverage**: ~300 lines, ~25 test cases

### 2. security-workflow.test.ts
**Purpose**: End-to-end security workflows including secret detection, DREAD scoring, and learning coordination.

**Test Categories**:
- Complete Security Assessment Workflow
  - Full agent config assessment
  - High-risk configuration detection
  - Low-risk configuration detection
- Secret Detection Workflow
  - Secret detection and redaction
  - Remediation guidance
  - DREAD scoring for secrets
  - Multiple secret format detection
  - Partial redaction
- DREAD Risk Scoring Workflow
  - Valid score creation
  - Dimension validation
  - Severity mapping
  - Different finding types
  - Risk optimizations
- Input Validation Workflow
  - API request validation
  - Nested data rejection
- Path Security Workflow
  - File upload validation
  - System directory blocking
- Command Security Workflow
  - Safe command construction
  - Dangerous command blocking
  - Argument escaping
- Performance Under Load
  - Multiple security checks
  - Large configuration validation
- Error Handling and Edge Cases
  - Empty configuration
  - Missing optional fields
  - Null/undefined handling
  - Immutability verification

**Coverage**: ~300 lines, ~30 test cases

### 3. attack-simulation.test.ts
**Purpose**: Simulate real-world attack scenarios to verify security controls against OWASP Top 10 and agent-specific attacks.

**Test Categories**:
- OWASP Top 10: Injection Attacks
  - A03:2021 – Injection
    - SQL injection
    - Command injection
    - Path traversal injection
    - LDAP injection
  - A01:2021 – Broken Access Control
    - Path access boundaries
    - Privilege escalation
  - A02:2021 – Cryptographic Failures
    - Exposed API keys
    - Weak credentials
    - Sensitive data in logs
- Agent-Specific Attack Vectors
  - Prompt Injection Attacks
    - Instruction override attempts
    - Role manipulation
    - Payload injection
  - File System Attacks
    - Null byte injection
    - Symlink attacks
    - Directory climbing
    - Path depth limits
  - Code Execution Attacks
    - Shell metacharacter injection
    - Command substitution
    - Eval/exec commands
  - Data Exfiltration Attacks
    - Network exfiltration
    - Secret exfiltration patterns
  - Resource Exhaustion Attacks
    - Path depth DoS
    - Input length DoS
    - Large array handling
- Combined Attack Scenarios
  - Chained injection attacks
  - Obfuscated attacks
  - TOCTOU attacks
  - Social engineering detection
- Attack Detection Performance
  - Fast attack detection
  - ReDoS resistance
- Defense Effectiveness Scoring
  - Attack resistance scoring
  - Security guidance

**Coverage**: ~400 lines, ~45 test cases

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- validators-integration
npm test -- security-workflow
npm test -- attack-simulation
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Coverage Goals

| Component | Before | After | Target |
|-----------|--------|-------|--------|
| Overall | 57% | >90% | 90% |
| InputValidator | ~85% | >95% | 95% |
| PathValidator | ~85% | >95% | 95% |
| SafeExecutor | ~85% | >95% | 95% |
| SecretsSanitizer | ~70% | >90% | 90% |
| DREADScorer | ~65% | >90% | 90% |
| SecurityLearningCoordinator | ~80% | >95% | 95% |
| Integration scenarios | 0% | >80% | 80% |

## Test Patterns

### Unit Tests
- Located in `detectors/`, `sanitizers/`, `scoring/`, `validators/`
- Focus on individual component behavior
- Fast execution (<50ms per test)
- Isolated dependencies (mocks where needed)

### Integration Tests
- Located in `integration/`
- Test component interactions
- Real-world scenario simulations
- Defense-in-depth validation
- Attack simulation

## Key Testing Principles

1. **Security First**: Every test validates security controls
2. **Real-World Scenarios**: Tests based on actual attack patterns
3. **Defense-in-Depth**: Multiple validation layers tested
4. **Performance**: All tests complete quickly (<1s total)
5. **Edge Cases**: Comprehensive boundary testing
6. **Attack Simulation**: OWASP Top 10 coverage

## Continuous Improvement

The integration tests provide:
- Baseline security validation
- Attack resistance verification
- Performance benchmarks
- Defense effectiveness metrics

As new vulnerabilities are discovered, add corresponding test cases to the relevant integration test file.

## Notes

- Integration tests may fail in WSL due to I/O errors with node_modules
- For CI/CD, run tests in GitHub Actions environment
- All test files follow the same structure: describe > it > expect
- Mock external dependencies (child_process for CLI commands)
