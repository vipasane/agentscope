# Cross-Package Integration Test Suite - Planning Documentation

## Overview

This directory contains comprehensive Architecture Decision Records (ADRs) and Domain-Driven Design (DDD) documentation for the AgentScope Cross-Package Integration Test Suite.

## Purpose

The integration test suite validates interactions between 4 core packages:
- **@claude-flow/performance** - Flash Attention, HNSW, caching, profiling
- **@vipasane/agentscope-learning** - ReasoningBank, EWC++, adaptive learning
- **@vipasane/agentscope-security** - Input validation, secret detection, sanitization
- **@claude-flow/cli-framework** - Command parsing, interactive prompts, error handling

## Document Index

### Architecture Decision Records (ADRs)

| ADR | Title | Status | Priority |
|-----|-------|--------|----------|
| [ADR-001](./ADR-001-integration-test-architecture.md) | Integration Test Architecture | Proposed | P0 |
| [ADR-002](./ADR-002-ddd-bounded-contexts.md) | DDD Bounded Contexts | Proposed | P0 |
| [ADR-003](./ADR-003-cicd-integration-strategy.md) | CI/CD Integration Strategy | Proposed | P1 |
| [ADR-004](./ADR-004-coverage-targets-metrics.md) | Coverage Targets and Metrics | Proposed | P1 |
| [ADR-005](./ADR-005-test-data-factory-pattern.md) | Test Data Factory Pattern | Proposed | P2 |
| [ADR-006](./ADR-006-self-learning-optimization.md) | Self-Learning Test Optimization | Proposed | P2 |

### Domain-Driven Design Documentation

| Document | Description |
|----------|-------------|
| [DDD-BOUNDED-CONTEXTS.md](./DDD-BOUNDED-CONTEXTS.md) | Complete DDD architecture with bounded contexts, aggregates, entities, value objects, domain services, and anti-corruption layers |

### Risk Assessment

| Document | Description |
|----------|-------------|
| [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) | Comprehensive risk analysis with mitigation strategies, monitoring, and contingency plans |

## Key Decisions

### 1. Test Architecture (ADR-001)
- **Vitest Workspace**: Multi-project configuration for monorepo testing
- **3-Layer Architecture**: Unit tests → Integration tests → E2E scenarios
- **5 Test Categories**: Performance+Learning, Security+Learning, CLI+Performance, CLI+Security, All-Package Workflows
- **<5 Minute Execution**: Aggressive performance targets with parallelization
- **Self-Learning**: Integration with claude-flow hooks for continuous improvement

### 2. DDD Bounded Contexts (ADR-002)
- **Core Domain**: Test Orchestration (coordinates all test execution)
- **Supporting Domains**: Test Data Generation, Test Validation, Test Reporting
- **Anti-Corruption Layers**: Protect test domain from package implementation details
- **Ubiquitous Language**: Consistent terminology across all test domains

### 3. CI/CD Strategy (ADR-003)
- **GitHub Actions**: Automated test execution on PR and push
- **Matrix Strategy**: Parallel execution across Node versions (20.x, 22.x)
- **Test Sharding**: Split tests across multiple runners for speed
- **Breaking Change Detection**: Automated API contract validation
- **Performance Benchmarking**: Track integration overhead over time

### 4. Coverage Targets (ADR-004)
- **Combined Coverage**: 85% lines/functions, 80% branches
- **Unit Tests**: 90% coverage (high for isolated functions)
- **Integration Tests**: 80% coverage (critical cross-package paths)
- **E2E Tests**: 60% coverage (main user workflows)
- **Security-Critical**: 100% coverage (input/path validation)

### 5. Test Data Patterns (ADR-005)
- **Factory Pattern**: Domain-specific test data creation
- **Builder Pattern**: Complex scenario construction
- **Realistic Generation**: Lightweight data generation (no heavy dependencies)
- **Validation**: All test data validated before use

### 6. Self-Learning (ADR-006)
- **Failure Pattern Learning**: Store failed test patterns in memory
- **Neural Training**: Train on successful test execution patterns
- **Predictive Selection**: Optimize test execution order using predictions
- **Automatic Repair**: Self-healing tests with retry and fix strategies
- **Coverage-Aware Generation**: Auto-generate tests for uncovered paths

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up Vitest workspace configuration
- Create basic integration test structure
- Implement breaking change detection
- Add security validation in test data

### Phase 2: Core Tests (Weeks 3-4)
- Build test data factories
- Implement self-healing retry logic
- Add parallel execution
- Configure CI/CD with sharding

### Phase 3: Optimization (Weeks 5-6)
- Integrate self-learning system
- Add performance benchmarking
- Implement automated cleanup
- Create developer documentation

### Phase 4: Monitoring (Ongoing)
- Continuous performance monitoring
- Regular test review and cleanup
- Feedback collection
- Neural optimization training

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Total Execution Time | <5 minutes | Fast feedback for developers |
| Integration Overhead | <2x unit tests | Reasonable trade-off for integration coverage |
| Flaky Test Rate | <2% | High reliability and trust |
| Coverage (Combined) | >85% | High confidence in quality |
| CI/CD Queue Time | <2 minutes | Minimize developer wait time |

## Claude-Flow Integration

### Self-Learning Hooks

```bash
# Before test run
npx @claude-flow/cli@latest hooks pre-task --description "integration-test-suite"

# After test run
npx @claude-flow/cli@latest hooks post-task \
  --task-id "integration-tests" \
  --success true \
  --store-results true

# Store successful patterns
npx @claude-flow/cli@latest memory store \
  --namespace "integration-patterns" \
  --key "performance-learning-sync" \
  --value "[test pattern data]"

# Train neural patterns
npx @claude-flow/cli@latest hooks post-edit \
  --file "integration-test.ts" \
  --train-neural true
```

### Performance Optimization

```bash
# Flash Attention optimization (2.49x-7.47x speedup)
npx @claude-flow/cli@latest neural optimize --target flash-attention

# HNSW search (150x-12,500x faster pattern retrieval)
npx @claude-flow/cli@latest memory search \
  --query "similar test failures" \
  --namespace "test-failures"

# Quantization (50-75% memory reduction for test data)
npx @claude-flow/cli@latest neural compress \
  --input test-vectors.json \
  --bits 8
```

### Security Validation

```bash
# Validate test data for secrets
npx @claude-flow/cli@latest security scan \
  --path products/integration-test-suite/fixtures/

# DREAD scoring for test scenarios
npx @claude-flow/cli@latest security audit \
  --target integration-tests
```

## Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/index.html` - Interactive browser view
- **JSON**: `coverage/coverage-final.json` - Machine-readable
- **LCOV**: `coverage/lcov.info` - For Codecov integration
- **Text**: Console output during test runs

View coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## Test Execution

### Local Development

```bash
# Run all integration tests
npm run test:integration

# Run specific category
npm run test:integration -- --grep "Performance+Learning"

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:integration -- --watch

# Run benchmarks
npm run bench:integration
```

### CI/CD

```bash
# Full suite (runs automatically on PR/push)
npm run test:integration -- --reporter=verbose --reporter=json

# Breaking change detection
npm run test:breaking-changes

# Performance benchmarks
npm run bench:integration
```

## Monitoring & Metrics

### Key Metrics Tracked

1. **Execution Time**: p50, p90, p99 percentiles
2. **Flaky Test Rate**: Tests that fail intermittently
3. **Coverage**: Lines, functions, branches, statements
4. **Breaking Changes**: API contract violations detected
5. **Developer Adoption**: % of PRs with integration tests
6. **CI/CD Resources**: Queue time, runner usage

### Dashboards

```bash
# Real-time metrics
npx @claude-flow/cli@latest hooks metrics --v3-dashboard

# Integration test status
npx @claude-flow/cli@latest hooks statusline --json
```

## Risk Mitigation

See [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) for comprehensive risk analysis.

**Top Risks**:
1. **Breaking Changes Not Detected** (P0) - Mitigated by snapshot testing
2. **Test Execution Time > 5min** (P1) - Mitigated by parallel execution
3. **Flaky Tests** (P1) - Mitigated by self-healing retry logic
4. **Maintenance Burden** (P1) - Mitigated by self-learning optimization

## Contributing

When adding new integration tests:

1. **Follow DDD Patterns**: Use bounded context structure
2. **Use Factories**: Leverage test data factories for consistency
3. **Add Benchmarks**: Include performance benchmarks where relevant
4. **Document**: Update this README with new test categories
5. **Coverage**: Ensure tests meet coverage targets
6. **Security**: Validate test data for secrets

## References

### Vitest Documentation
- [Vitest Workspace Guide](https://vitest.dev/guide/workspace)
- [Vitest vs Jest 30: 2026 Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb)
- [Vitest 3 Monorepo Setup](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html)
- [Turborepo Vitest Integration](https://turborepo.dev/docs/guides/tools/vitest)

### DDD Resources
- [Bounded Context - Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html)
- [Domain-driven design - Wikipedia](https://en.wikipedia.org/wiki/Domain-driven_design)
- [Strategic DDD](https://ddd.academy/strategic-ddd-using-bounded-context-canvas-gien-verschatse/)
- [Tactical DDD - Azure](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-ddd)

### Testing Best Practices
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)

### Package Documentation
- Performance: `/workspaces/agentscope/packages/performance/`
- Learning: `/workspaces/agentscope/packages/learning/`
- Security: `/workspaces/agentscope/packages/security/`
- CLI Framework: `/workspaces/agentscope/packages/cli-framework/`

## Support

For questions or issues:
- GitHub Issues: https://github.com/vipasane/agentscope/issues
- Discussions: https://github.com/vipasane/agentscope/discussions

## Metadata
- **Created**: 2026-01-30
- **Authors**: AgentScope Team
- **Version**: 1.0
- **Last Updated**: 2026-01-30
