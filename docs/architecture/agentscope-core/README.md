# AgentScope Core: Architecture Documentation

**📦 Complete Architecture Package**
**📅 Created**: 2026-01-26
**📊 Size**: 156 KB (4,948 lines)
**✅ Status**: Complete

---

## 🚀 Quick Start

### New to AgentScope?
**Start here**: [INDEX.md](./INDEX.md) - Complete navigation guide with diagrams and FAQ

### Looking for Specific Information?

| I want to... | Read this... |
|--------------|--------------|
| Understand overall architecture | [ADR-101: Core Architecture](./ADR-101-core-architecture.md) |
| Learn about zero dependencies | [ADR-102: Zero Dependency Strategy](./ADR-102-zero-dependency-strategy.md) |
| Understand security scanning | [ADR-103: Security Scanning Engine](./ADR-103-security-scanning-engine.md) |
| Add a new platform | [ADR-104: Multi-Platform Support](./ADR-104-multi-platform-support.md) |
| Understand domain model | [DDD-101: Core Domain Model](./DDD-101-core-domain-model.md) |
| Plan implementation | [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) |
| Get a quick overview | [SUMMARY](./SUMMARY.md) |

---

## 📚 Document Inventory

```
agentscope-core/
├── README.md                           # You are here
├── INDEX.md                            # 📖 Navigation guide (17 KB, 453 lines)
├── SUMMARY.md                          # 📊 Executive summary (15 KB, 481 lines)
│
├── ADR-101-core-architecture.md        # 🏗️ System architecture (13 KB, 431 lines)
├── ADR-102-zero-dependency-strategy.md # 📦 Zero dependencies (13 KB, 438 lines)
├── ADR-103-security-scanning-engine.md # 🔒 Security (25 KB, 761 lines)
├── ADR-104-multi-platform-support.md   # 🔌 Multi-platform (20 KB, 695 lines)
│
├── DDD-101-core-domain-model.md        # 🧩 Domain model (24 KB, 985 lines)
└── IMPLEMENTATION-PLAN.md              # 📅 32-week roadmap (16 KB, 704 lines)
```

**Total**: 9 documents, 156 KB, 4,948 lines

---

## 🎯 Architecture at a Glance

### System Architecture (ADR-101)

```
CLI → Orchestration → Domains → Core
                    ┌─────────┐
                    │ Scanner │
                    │Validator│
                    │Analyzer │
                    │Generator│
                    │Reporter │
                    └─────────┘
                         │
                    ┌────▼────┐
                    │  Core   │
                    │ Domain  │
                    └─────────┘
```

**8 Bounded Contexts**: Scanner, Validator, Analyzer, Generator, Reporter, Converter, Orchestration, Core

### Zero Dependencies (ADR-102)

**Runtime Dependencies**: 1 (`@claude-flow/security`)
**Bundled Code**: ~550 lines (validation, templating, CLI)
**Node.js Built-ins**: fs, path, crypto, url

### Security (ADR-103)

**5 Layers**: Input Protection → Validation → Detection → Assessment → Reporting
**Performance**: <500ms overhead
**Accuracy**: >95% detection, <5% false positives

### Multi-Platform (ADR-104)

**Supported**: Claude Code, Cursor, Gemini CLI
**Pattern**: Adapter pattern with auto-detection
**Future**: Windsurf, Copilot, generic format

### Domain Model (DDD-101)

**Aggregates**: Agent, Skill, Hook, MCP
**Value Objects**: Tool, Capability, Delegation, SkillReference
**Services**: DelegationService (cycle detection)

### Implementation (IMPLEMENTATION-PLAN)

**Timeline**: 32 weeks (v1.2 → v2.0)
- **Week 1-6**: v1.2 Foundation
- **Week 7-12**: v1.3 Ecosystem
- **Week 13-20**: v1.4 Enterprise
- **Week 21-32**: v2.0 Platform

---

## 🎓 Learning Paths

### Path 1: Quick Overview (15 minutes)
1. [SUMMARY](./SUMMARY.md) - Executive summary
2. [INDEX](./INDEX.md) - Skim diagrams and FAQ

### Path 2: Architecture Understanding (1 hour)
1. [INDEX](./INDEX.md) - Complete navigation
2. [ADR-101](./ADR-101-core-architecture.md) - System architecture
3. [DDD-101](./DDD-101-core-domain-model.md) - Domain model

### Path 3: Deep Dive (3 hours)
1. [INDEX](./INDEX.md) - Navigation
2. [ADR-101](./ADR-101-core-architecture.md) - System architecture
3. [ADR-102](./ADR-102-zero-dependency-strategy.md) - Dependencies
4. [ADR-103](./ADR-103-security-scanning-engine.md) - Security
5. [ADR-104](./ADR-104-multi-platform-support.md) - Platforms
6. [DDD-101](./DDD-101-core-domain-model.md) - Domain model

### Path 4: Implementation Ready (4+ hours)
Read all documents in order:
1. [INDEX](./INDEX.md)
2. [SUMMARY](./SUMMARY.md)
3. [ADR-101](./ADR-101-core-architecture.md)
4. [ADR-102](./ADR-102-zero-dependency-strategy.md)
5. [ADR-103](./ADR-103-security-scanning-engine.md)
6. [ADR-104](./ADR-104-multi-platform-support.md)
7. [DDD-101](./DDD-101-core-domain-model.md)
8. [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md)

---

## 🔍 Quick Reference

### Performance Targets
- **Scan Time**: <2s (50 agents)
- **Security Scan**: <500ms
- **CLI Startup**: <300ms
- **Memory Usage**: <100MB
- **Test Coverage**: >90%

### Security Metrics
- **Detection Rate**: >95%
- **False Positives**: <5%
- **CVEs Covered**: 4 (CVE-AGENTSCOPE-001 through 004)
- **Layers**: 5 (defense in depth)

### Code Metrics (v1.2)
- **Total Lines**: ~5,000
- **Test Lines**: ~4,500
- **Files**: ~50
- **Bounded Contexts**: 8
- **Aggregates**: 4

---

## 📖 Reading by Role

### For Product Managers
1. [SUMMARY](./SUMMARY.md) - Executive overview
2. [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) - Roadmap and milestones
3. [ADR-101](./ADR-101-core-architecture.md) - Architecture overview

### For Software Architects
1. [INDEX](./INDEX.md) - Complete navigation
2. [ADR-101](./ADR-101-core-architecture.md) - System architecture
3. [ADR-102](./ADR-102-zero-dependency-strategy.md) - Dependencies
4. [DDD-101](./DDD-101-core-domain-model.md) - Domain model

### For Developers
1. [INDEX](./INDEX.md) - Quick reference
2. [DDD-101](./DDD-101-core-domain-model.md) - Domain model
3. [ADR-101](./ADR-101-core-architecture.md) - Architecture
4. [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) - Tasks

### For Security Engineers
1. [ADR-103](./ADR-103-security-scanning-engine.md) - Security architecture
2. [SUMMARY](./SUMMARY.md) - Security metrics
3. [DDD-101](./DDD-101-core-domain-model.md) - Security entities

### For DevOps Engineers
1. [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) - Deployment timeline
2. [ADR-102](./ADR-102-zero-dependency-strategy.md) - Build requirements
3. [INDEX](./INDEX.md) - Performance targets

---

## 🛠️ Architecture Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Domain-Driven Design** | Core domain | Rich domain model, ubiquitous language |
| **Layered Architecture** | Overall system | Separation of concerns |
| **Adapter Pattern** | Platform support | Extensible multi-platform |
| **Mediator Pattern** | Orchestration | Decouple domains |
| **Strategy Pattern** | Security validators | Pluggable validators |
| **Repository Pattern** | Future | Data access abstraction |
| **Factory Pattern** | Entity creation | Consistent validation |

---

## 🎯 Key Architectural Principles

1. **Domain-Driven Design**: Ubiquitous language, bounded contexts, aggregates
2. **Clean Architecture**: Dependency inversion, interface segregation
3. **Security-First**: Defense in depth, fail secure, zero trust
4. **Performance**: Parallel processing, lazy generation, streaming
5. **Testability**: >90% coverage, unit/integration/E2E tests

---

## 📊 Architecture Statistics

| Metric | Value |
|--------|-------|
| **Total Documentation** | 156 KB |
| **Total Lines** | 4,948 |
| **ADR Documents** | 4 |
| **DDD Documents** | 1 |
| **Planning Documents** | 1 |
| **Supporting Documents** | 3 |
| **Diagrams** | 10+ |
| **Code Examples** | 50+ |

---

## 🔗 External References

### Architecture Resources
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)

### Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [DREAD Risk Assessment](https://en.wikipedia.org/wiki/DREAD_(risk_assessment_model))
- [Prompt Injection (Simon Willison)](https://simonwillison.net/2023/Apr/14/worst-that-can-happen/)

### Project Resources
- [PRD: AgentScope Core](/workspaces/agentscope/docs/PRD-AgentScope-Core.md)
- [Product Ecosystem](/workspaces/agentscope/docs/products/PRODUCT-ECOSYSTEM.md)
- [Common Core](/workspaces/agentscope/docs/products/COMMON-CORE.md)

---

## ✅ Deliverables Summary

### Required Documents (All Complete ✅)

| # | Document | Lines | Size | Status |
|---|----------|-------|------|--------|
| 1 | ADR-101: Core Architecture | 431 | 13 KB | ✅ Complete |
| 2 | ADR-102: Zero Dependency Strategy | 438 | 13 KB | ✅ Complete |
| 3 | ADR-103: Security Scanning Engine | 761 | 25 KB | ✅ Complete |
| 4 | ADR-104: Multi-Platform Support | 695 | 20 KB | ✅ Complete |
| 5 | DDD-101: Core Domain Model | 985 | 24 KB | ✅ Complete |
| 6 | IMPLEMENTATION-PLAN | 704 | 16 KB | ✅ Complete |

### Supporting Documents (Bonus ✅)

| # | Document | Lines | Size | Status |
|---|----------|-------|------|--------|
| 7 | INDEX | 453 | 17 KB | ✅ Complete |
| 8 | SUMMARY | 481 | 15 KB | ✅ Complete |
| 9 | README (this file) | - | - | ✅ Complete |

---

## 🎉 Package Status

✅ **All Required Deliverables Complete**
✅ **Comprehensive Documentation** (156 KB)
✅ **Production-Ready Architecture**
✅ **Implementation-Ready Roadmap**
✅ **Full Code Examples**
✅ **Multiple Diagrams**
✅ **Complete DDD Model**

**Ready for**: Implementation (Week 1 can begin immediately)

---

## 📞 Contact & Support

**Project**: AgentScope Core
**Repository**: https://github.com/vipasane/agentscope
**Issues**: https://github.com/vipasane/agentscope/issues
**Discussions**: https://github.com/vipasane/agentscope/discussions

**Architecture Team**: ADR Architect Agent
**Review Date**: 2026-02-15
**Next Review**: 2026-03-15

---

**📖 Start Reading**: [INDEX.md](./INDEX.md)
**📊 Quick Overview**: [SUMMARY.md](./SUMMARY.md)
**🏗️ Architecture**: [ADR-101](./ADR-101-core-architecture.md)
