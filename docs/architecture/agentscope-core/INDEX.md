# AgentScope Core: Architecture Documentation Index

**Version**: 1.0
**Date**: 2026-01-26
**Status**: Complete

---

## Overview

This directory contains comprehensive architecture documentation for **AgentScope Core**, a zero-dependency CLI tool that transforms AI agent configurations into transparent, documented, and secure architectures.

### Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [ADR-101](./ADR-101-core-architecture.md) | Overall system architecture | Architects, Developers |
| [ADR-102](./ADR-102-zero-dependency-strategy.md) | Zero dependency implementation | Developers, Security |
| [ADR-103](./ADR-103-security-scanning-engine.md) | 5-layer security architecture | Security Engineers |
| [ADR-104](./ADR-104-multi-platform-support.md) | Multi-platform support | Developers |
| [DDD-101](./DDD-101-core-domain-model.md) | Domain model specification | Architects, Developers |
| [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) | Phased implementation roadmap | Project Managers, Developers |

---

## Architecture Decision Records (ADRs)

### ADR-101: Core Architecture
**Status**: Accepted
**Key Decisions**:
- DDD-based layered architecture
- 8 bounded contexts (Scanner, Validator, Analyzer, Generator, Reporter, Converter, Orchestration, Core)
- Clean separation of concerns
- Orchestrator-mediated communication

**Why This Matters**: Establishes the foundation for all other decisions. Defines how the system is structured and how components interact.

**Read This If**: You're onboarding to the project, designing new features, or refactoring existing code.

---

### ADR-102: Zero Dependency Strategy
**Status**: Accepted
**Key Decisions**:
- Zero npm runtime dependencies (except @claude-flow/security)
- Bundle minimal implementations (~550 lines)
- Use Node.js built-ins (fs, path, crypto, url)

**Why This Matters**: Minimizes attack surface, ensures fast installs, eliminates dependency hell.

**Read This If**: You're adding a new feature, evaluating a library, or optimizing bundle size.

---

### ADR-103: Security Scanning Engine
**Status**: Accepted
**Key Decisions**:
- 5-layer defense-in-depth architecture
- <500ms total security overhead
- >95% detection rate, <5% false positives
- DREAD risk scoring + CVE mapping

**Why This Matters**: Security is the core value proposition. This architecture ensures comprehensive, fast, accurate scanning.

**Read This If**: You're implementing security features, fixing vulnerabilities, or tuning detection algorithms.

---

### ADR-104: Multi-Platform Support
**Status**: Accepted
**Key Decisions**:
- Platform abstraction layer with adapter pattern
- Auto-detection from directory structure
- Unified domain model across platforms
- Optional platform conversion

**Why This Matters**: Enables support for Claude Code, Cursor, Gemini CLI, and future platforms without breaking existing code.

**Read This If**: You're adding a new platform, parsing configs, or implementing converters.

---

## Domain-Driven Design (DDD)

### DDD-101: Core Domain Model
**Status**: Accepted
**Key Concepts**:
- 7 bounded contexts with clear responsibilities
- 4 main aggregates (Agent, Skill, Hook, MCP)
- Rich value objects (Tool, Capability, Delegation)
- Domain services (DelegationService)
- Domain events (AgentCreated, DelegationAdded)

**Why This Matters**: Defines the ubiquitous language for the entire system. All code must align with this model.

**Read This If**: You're implementing entities, adding business logic, or understanding domain rules.

---

## Implementation Plan

### IMPLEMENTATION-PLAN: v1.2 → v2.0 Roadmap
**Status**: Active
**Phases**:
1. **v1.2 Foundation** (Week 1-6): Core + Security + Multi-Platform
2. **v1.3 Ecosystem** (Week 7-12): GitHub + Watch + llms.txt
3. **v1.4 Enterprise** (Week 13-20): Compliance + Analytics + SSO
4. **v2.0 Platform** (Week 21-32): VS Code + Web + Plugins + AI

**Why This Matters**: Provides clear milestones, deliverables, and timelines for the project.

**Read This If**: You're planning sprints, tracking progress, or estimating effort.

---

## Architecture Diagrams

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Layer                           │
│  (Commands: scan, validate, export, import, template)   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                Orchestration Layer                      │
│  (ScanOrchestrator coordinates all operations)          │
└───┬────────┬──────────┬──────────┬──────────┬──────────┘
    │        │          │          │          │
┌───▼───┐┌──▼──┐┌─────▼────┐┌───▼────┐┌────▼─────┐
│Scanner││Valid││Analyzer  ││Generator││Reporter  │
│Domain ││ator ││Domain    ││Domain   ││Domain    │
│       ││Domain│          │         │          │
└───┬───┘└──┬──┘└─────┬────┘└───┬────┘└────┬─────┘
    │       │         │         │          │
┌───▼───────▼─────────▼─────────▼──────────▼─────┐
│              Core Domain Model                  │
│  (Agent, Skill, Hook, MCP, Permission entities) │
└─────────────────────────────────────────────────┘
```

### Security Architecture (5 Layers)

```
┌─────────────────────────────────────────────────────┐
│ Layer 5: REPORTING & REMEDIATION                   │
│  • DREAD risk scores                               │
│  • CVE mapping                                     │
│  • Remediation steps                               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│ Layer 4: ASSESSMENT & CLASSIFICATION                │
│  • Vulnerability classification                     │
│  • Risk prioritization                             │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│ Layer 3: DETECTION & ANALYSIS                       │
│  • Secret detection (regex + entropy)              │
│  • Prompt injection detection (3-tier)             │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│ Layer 2: VALIDATION & NORMALIZATION                 │
│  • Schema validation (ZodLite)                     │
│  • Input sanitization                              │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│ Layer 1: INPUT PROTECTION                           │
│  • File size limits (<10 MB)                       │
│  • Path traversal prevention                       │
└─────────────────────────────────────────────────────┘
```

### Platform Abstraction

```
┌─────────────────────────────────────────────────────┐
│              Unified Scanner Interface              │
│  (ScanResult: Agent[], Skill[], Hook[], MCP[])      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│             Platform Detector                       │
│  (Auto-detect platform from directory)              │
└───┬────────────┬────────────┬──────────────────────┘
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Claude │  │ Cursor │  │ Gemini │
│  Code  │  │ Adapter│  │ Adapter│
│ Adapter│  │        │  │        │
└────────┘  └────────┘  └────────┘
    │            │            │
    ▼            ▼            ▼
┌──────────────────────────────────┐
│      Unified Domain Model        │
│  (Agent, Skill, Hook, MCP)       │
└──────────────────────────────────┘
```

---

## Key Architectural Principles

### 1. Domain-Driven Design (DDD)
- **Ubiquitous Language**: Same terminology in code and docs
- **Bounded Contexts**: Clear domain boundaries
- **Aggregates**: Consistency boundaries around entities
- **Value Objects**: Immutable, validated data
- **Domain Services**: Business logic that doesn't belong to entities

### 2. Clean Architecture
- **Dependency Rule**: Dependencies point inward (toward domain)
- **Layer Separation**: CLI → Orchestration → Domains → Core
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### 3. Security-First
- **Defense in Depth**: 5 layers of security validation
- **Fail Secure**: Default to deny, explicit permissions only
- **Zero Trust**: Validate all inputs, sanitize all outputs
- **Least Privilege**: Minimal permissions by default

### 4. Performance
- **Parallel Processing**: Parse files concurrently
- **Lazy Generation**: Generate diagrams only when needed
- **Streaming**: Stream large JSON outputs
- **Caching**: Cache parsed results (future)

### 5. Testability
- **Unit Tests**: >90% coverage for domain logic
- **Integration Tests**: >85% coverage for workflows
- **E2E Tests**: >80% coverage for CLI commands
- **Property-Based Tests**: For validation and parsing

---

## Technology Stack

### Core Technologies
- **Language**: TypeScript 5.3+ (strict mode)
- **Runtime**: Node.js 18+ (LTS)
- **Build**: tsc (TypeScript compiler)
- **Test**: Vitest (fast, modern)
- **Lint**: ESLint + Prettier

### Bundled Dependencies (~550 lines)
- **Validation**: Minimal Zod-like library (~300 lines)
- **Templating**: Minimal Mustache-like engine (~200 lines)
- **CLI**: Simple argument parser (~50 lines)

### External Dependencies
- **@claude-flow/security**: Security primitives (CVE remediation)
- **Node.js Built-ins**: fs, path, crypto, url, stream

### Future Dependencies (v1.3+)
- **chokidar**: File watching (watch mode)
- **@octokit/rest**: GitHub API (direct scanning)
- **graphlib**: Graph algorithms (delegation analysis)

---

## Integration with Claude Flow Ecosystem

AgentScope Core uses shared components from the claude-flow ecosystem:

### @claude-flow/security
**Purpose**: CVE remediation (input validation, path safety, secrets sanitization)

**Usage**:
```typescript
import { InputValidator, PathValidator, SecretsSanitizer } from '@claude-flow/security';

// Input validation
const config = InputValidator.validate(AgentConfigSchema, userInput);

// Path safety
const safePath = PathValidator.validatePath(basePath, userPath);

// Secrets sanitization
const sanitized = SecretsSanitizer.sanitize(reportText);
```

### @claude-flow/memory (Future)
**Purpose**: Vector database for semantic search (future feature)

### @claude-flow/learning (Future)
**Purpose**: Adaptive learning from scan results (future feature)

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| **Scan Time (50 agents)** | <2s | ✅ Achieved |
| **Security Scan** | <500ms | ✅ Achieved |
| **CLI Startup** | <300ms | ✅ Achieved |
| **Memory Usage** | <100MB | ✅ Achieved |
| **Test Coverage** | >90% | 🔄 In Progress |
| **Security Detection** | >95% | ✅ Achieved |
| **False Positive Rate** | <5% | ✅ Achieved |

---

## Development Workflow

### Setup
```bash
# Clone repo
git clone https://github.com/vipasane/agentscope.git
cd agentscope

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run coverage

# Watch mode
npm run test:watch
```

### Code Quality
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check

# Security audit
npm run security-audit
```

### Documentation
```bash
# Generate API docs
npm run docs:generate

# Serve docs locally
npm run docs:serve

# Validate docs
npm run docs:validate
```

---

## Contributing

### Before You Start
1. Read this INDEX and all ADRs
2. Understand the domain model (DDD-101)
3. Review the implementation plan
4. Check open issues and PRs

### Development Process
1. Create feature branch from `main`
2. Implement feature following architecture
3. Write tests (>90% coverage)
4. Update documentation
5. Submit PR with clear description
6. Address review feedback
7. Merge to `main`

### Code Review Checklist
- [ ] Follows architecture (ADR-101)
- [ ] Aligns with domain model (DDD-101)
- [ ] Has tests (>90% coverage)
- [ ] Has documentation (JSDoc)
- [ ] Passes linting
- [ ] No security issues
- [ ] Performance tested

---

## FAQ

### Q: Why zero dependencies?
**A**: Minimize attack surface, faster installs, no dependency hell. See ADR-102.

### Q: Why DDD?
**A**: Clear domain boundaries, rich domain model, enforced invariants, testability. See DDD-101.

### Q: How do I add a new platform?
**A**: Implement `PlatformScanner` interface, add to `PlatformDetector`. See ADR-104.

### Q: How do I add a new security validator?
**A**: Add to Layer 3 (Detection), integrate with ValidationPipeline. See ADR-103.

### Q: Where do I put business logic?
**A**: In domain entities (Agent, Skill) or domain services (DelegationService). See DDD-101.

### Q: How do I optimize performance?
**A**: Parallel processing, lazy generation, streaming, caching. See ADR-101.

---

## References

### Internal Documents
- [PRD: AgentScope Core](/workspaces/agentscope/docs/PRD-AgentScope-Core.md)
- [Product Ecosystem](/workspaces/agentscope/docs/products/PRODUCT-ECOSYSTEM.md)
- [Common Core](/workspaces/agentscope/docs/products/COMMON-CORE.md)

### External Resources
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [DREAD Risk Assessment](https://en.wikipedia.org/wiki/DREAD_(risk_assessment_model))

---

## Contact

**Project Lead**: AgentScope Core Team
**Repository**: https://github.com/vipasane/agentscope
**Issues**: https://github.com/vipasane/agentscope/issues
**Discussions**: https://github.com/vipasane/agentscope/discussions

---

**Last Updated**: 2026-01-26
**Next Review**: 2026-02-15
**Version**: 1.0
