# ADR-001: Cross-Package Integration Test Suite Architecture

## Status
Proposed

## Context

The AgentScope monorepo consists of 4 core packages that must work together seamlessly:
- **@claude-flow/performance** - Performance optimization, caching, profiling, Flash Attention
- **@vipasane/agentscope-learning** - ReasoningBank adaptive learning with 4-step pipeline
- **@vipasane/agentscope-security** - Zero-dependency security validation and sanitization
- **@claude-flow/cli-framework** - Zero-dependency CLI framework for command patterns

### Current State
- Each package has isolated unit tests
- No formal cross-package integration testing
- Manual testing required for feature interactions
- Risk of breaking changes across package boundaries
- No automated validation of data flows between packages

### Requirements
1. Test interactions between all 4 packages
2. Validate data flows across package boundaries
3. Test real-world scenarios using multiple packages together
4. Measure integration test coverage
5. Detect breaking changes across packages
6. Fast execution (<5 minutes for full suite)
7. CI/CD integration for automated validation
8. Self-learning from test failures
9. Security validation of cross-package data passing
10. Performance benchmarking of integration overhead

## Decision

### 1. Vitest Workspace Configuration

Use Vitest's workspace feature to define cross-package test projects with integration tests targeting <5 minutes execution time.

### 2. Test Architecture Layers

**Layer 1: Unit Tests** - Individual package functionality (existing)
**Layer 2: Integration Tests** - Cross-package interactions (new)
**Layer 3: E2E Scenarios** - Complete workflows using all packages (new)

### 3. Integration Test Categories

- **Performance + Learning**: Flash Attention with ReasoningBank, HNSW with EWC++
- **Security + Learning**: Input validation with pattern learning, secret detection
- **CLI + Performance**: Command execution profiling, argument caching
- **CLI + Security**: Injection prevention, path validation
- **All-Package Workflows**: Complete CLI → Security → Performance → Learning flows

### 4. Self-Learning Integration

Use claude-flow hooks to learn from test failures and store successful patterns in memory.

### 5. Coverage Targets

- Unit Tests: 90%+
- Integration Tests: 80%+
- E2E Scenarios: 60%+
- Combined: 85%+

## Consequences

### Positive
✅ Early detection of breaking changes
✅ Higher confidence in refactoring
✅ Living documentation through tests
✅ Self-learning improvements

### Negative
⚠️ Additional infrastructure complexity
⚠️ Slower execution than unit tests
⚠️ Potential for flaky tests

## References
- [Vitest Workspace Guide](https://vitest.dev/guide/workspace)
- [Bounded Context - Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html)
- [Strategic DDD](https://ddd.academy/strategic-ddd-using-bounded-context-canvas-gien-verschatse/)

