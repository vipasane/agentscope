# AgentScope Core: Implementation Plan (v1.2 → v2.0)

**Version**: 1.0
**Date**: 2026-01-26
**Status**: Active
**Owner**: AgentScope Core Team

---

## Executive Summary

This document outlines the phased implementation of AgentScope Core from v1.2 (current) to v2.0 (future vision). The implementation follows the architecture defined in ADR-101 through ADR-104 and DDD-101.

### Timeline Overview

```
Week 1-2:  v1.2 Foundation (Core + Claude Code)
Week 3-4:  v1.2 Multi-Platform (Cursor, Gemini)
Week 5-6:  v1.2 Polish & Testing
─────────────────────────────────────────────────
Week 7-12: v1.3 Ecosystem Integration
Week 13-20: v1.4 Enterprise Features
Week 21-32: v2.0 Platform Expansion
```

### Success Criteria

| Version | Criteria |
|---------|----------|
| **v1.2** | ✅ Zero dependencies, <2s scans, >95% security detection |
| **v1.3** | ✅ GitHub integration, watch mode, llms.txt |
| **v1.4** | ✅ Enterprise features, compliance reports |
| **v2.0** | ✅ VS Code extension, plugin system, AI-powered insights |

---

## Phase 1: v1.2 Foundation (Week 1-2)

### Objectives
1. Implement core domain model
2. Build Claude Code scanner
3. Implement 5-layer security engine
4. Generate basic documentation

### Tasks

#### Week 1: Core Domain + Scanner

**Day 1-2: Domain Model Setup**
```bash
# Create directory structure
mkdir -p src/{core/{entities,value-objects,services,events,errors},scanner,validator,analyzer,generator,reporter,orchestration,cli,utils}

# Implement core entities
touch src/core/entities/{Agent,Skill,Hook,McpServer}.ts
touch src/core/value-objects/{Tool,Capability,Delegation,SkillReference,SourceFile}.ts
touch src/core/services/DelegationService.ts
touch src/core/errors/DomainError.ts
```

**Deliverables**:
- [ ] Agent aggregate with business logic
- [ ] Skill, Hook, MCP aggregates
- [ ] Value objects (Tool, Capability, etc.)
- [ ] DelegationService with cycle detection
- [ ] >90% test coverage for domain model

**Day 3-5: Scanner Implementation**
```bash
# Implement scanner components
touch src/scanner/{PlatformScanner,PlatformDetector,ClaudeCodeScanner}.ts
touch src/utils/{file-utils,validation,template,cli}.ts
```

**Deliverables**:
- [ ] PlatformScanner interface
- [ ] PlatformDetector with auto-detection
- [ ] ClaudeCodeScanner with full parsing
- [ ] Bundled validation library (~300 lines)
- [ ] Bundled template engine (~200 lines)
- [ ] Bundled CLI parser (~50 lines)
- [ ] >85% test coverage for scanner

#### Week 2: Security + Documentation

**Day 6-8: Security Engine**
```bash
# Implement validator components
touch src/validator/{SecretDetector,PromptInjectionDetector,ConfigValidator,McpEndpointValidator,DreadScorer,CveMapper}.ts
```

**Deliverables**:
- [ ] Layer 1: Input Protection
- [ ] Layer 2: Schema Validation
- [ ] Layer 3: Detection (Secrets, Injection, Config, MCP)
- [ ] Layer 4: DREAD Scoring + CVE Mapping
- [ ] Layer 5: Security Report Generation
- [ ] <500ms total security overhead
- [ ] >95% detection rate for known patterns
- [ ] <5% false positive rate

**Day 9-10: Documentation Generation**
```bash
# Implement generator components
touch src/generator/{ReadmeGenerator,DiagramGenerator,TemplateGenerator}.ts
```

**Deliverables**:
- [ ] README generation with Mermaid diagrams
- [ ] Delegation hierarchy diagram
- [ ] Component map diagram
- [ ] Tool access matrix diagram
- [ ] Template generation (agent, skill, hook, MCP)
- [ ] Theme support (light, dark, colorblind)

### Testing & Validation

```bash
# Run tests
npm test

# Performance benchmarks
npm run benchmark

# Security validation
npm run security-audit
```

**Acceptance Criteria**:
- [ ] All tests pass (>90% coverage)
- [ ] Scans complete in <2s (50 agents)
- [ ] Security scans complete in <500ms
- [ ] Zero runtime dependencies (except @claude-flow/security)
- [ ] CLI starts in <300ms

---

## Phase 2: v1.2 Multi-Platform (Week 3-4)

### Objectives
1. Add Cursor support
2. Add Gemini CLI support
3. Implement platform conversion
4. Extend test coverage

### Tasks

#### Week 3: Cursor + Gemini Adapters

**Day 11-13: Cursor Scanner**
```bash
touch src/scanner/CursorScanner.ts
```

**Deliverables**:
- [ ] CursorScanner implementing PlatformScanner
- [ ] Parse `.cursor/` directory structure
- [ ] Convert to unified domain model
- [ ] >85% test coverage

**Day 14-15: Gemini Scanner**
```bash
touch src/scanner/GeminiScanner.ts
```

**Deliverables**:
- [ ] GeminiScanner implementing PlatformScanner
- [ ] Parse `.gemini/` directory structure
- [ ] Convert to unified domain model
- [ ] >85% test coverage

#### Week 4: Platform Conversion + Integration

**Day 16-18: Platform Converter**
```bash
touch src/converter/PlatformConverter.ts
```

**Deliverables**:
- [ ] Convert between platforms
- [ ] Preserve semantics where possible
- [ ] Document conversion limitations
- [ ] >80% test coverage

**Day 19-20: Integration Testing**
```bash
mkdir -p tests/integration
touch tests/integration/{claude-code,cursor,gemini}.test.ts
```

**Deliverables**:
- [ ] End-to-end tests for all platforms
- [ ] Real-world config fixtures
- [ ] Platform conversion tests
- [ ] Performance regression tests

### Testing & Validation

**Acceptance Criteria**:
- [ ] All platforms supported (Claude Code, Cursor, Gemini)
- [ ] Platform auto-detection works
- [ ] Conversion preserves 90%+ of config
- [ ] >85% test coverage across all platforms

---

## Phase 3: v1.2 Polish & Testing (Week 5-6)

### Objectives
1. Improve error messages
2. Add comprehensive logging
3. Write documentation
4. Optimize performance

### Tasks

#### Week 5: Error Handling + Logging

**Day 21-23: Error Improvement**
```bash
touch src/utils/error-formatter.ts
touch src/utils/logger.ts
```

**Deliverables**:
- [ ] User-friendly error messages
- [ ] Error codes (E001-E999)
- [ ] Remediation steps for each error
- [ ] Links to documentation
- [ ] Structured logging (JSON mode)

**Day 24-25: CLI Enhancement**
```bash
# Improve CLI commands
touch src/cli/commands/{scan,validate,export,import,template}.ts
```

**Deliverables**:
- [ ] Comprehensive help text
- [ ] Progress indicators
- [ ] Colored output (with --no-color flag)
- [ ] Verbose mode
- [ ] Dry-run mode

#### Week 6: Documentation + Optimization

**Day 26-28: Documentation**
```bash
# Write user documentation
mkdir -p docs/user-guide
touch docs/user-guide/{getting-started,cli-reference,security-guide,platform-support}.md
```

**Deliverables**:
- [ ] Getting Started guide
- [ ] CLI Reference
- [ ] Security Guide
- [ ] Platform Support guide
- [ ] Contributing guide
- [ ] API documentation (JSDoc)

**Day 29-30: Performance Optimization**
```bash
touch src/utils/performance-monitor.ts
```

**Deliverables**:
- [ ] Parallel file parsing
- [ ] Lazy diagram generation
- [ ] Streaming JSON output
- [ ] Memory usage optimization
- [ ] CPU profiling and optimization
- [ ] <2s scans for 50 agents (target met)

### Release Preparation

```bash
# Version bump
npm version 1.2.0

# Build
npm run build

# Package
npm pack

# Publish
npm publish
```

**v1.2.0 Release Checklist**:
- [ ] All tests pass
- [ ] Documentation complete
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] CHANGELOG.md updated
- [ ] README.md polished
- [ ] npm package published
- [ ] GitHub release created
- [ ] Announcement drafted

---

## Phase 4: v1.3 Ecosystem Integration (Week 7-12)

### Objectives
1. GitHub direct scanning
2. Watch mode
3. llms.txt generation
4. BMad Method support
5. GitHub Action

### Tasks

#### Week 7-8: GitHub Integration

```bash
# Add GitHub scanner
npm install --save @octokit/rest
touch src/scanner/GitHubScanner.ts
```

**Deliverables**:
- [ ] GitHubScanner (no local clone needed)
- [ ] GitHub API integration
- [ ] Rate limiting handling
- [ ] Token authentication
- [ ] Export to GitHub (create PR)

#### Week 9: Watch Mode + llms.txt

```bash
# Add file watching
npm install --save chokidar
touch src/watcher/ConfigWatcher.ts
touch src/generator/LlmsTxtGenerator.ts
```

**Deliverables**:
- [ ] Watch mode (--watch flag)
- [ ] Debounced regeneration (500ms)
- [ ] llms.txt generation (AI discovery)
- [ ] Recursive CLAUDE.md discovery

#### Week 10-11: BMad Method + GitHub Action

```bash
touch src/scanner/BmadMethodScanner.ts
mkdir -p .github/actions/agentscope-scan
touch .github/actions/agentscope-scan/action.yml
```

**Deliverables**:
- [ ] BMad Method scanner
- [ ] GitHub Action (agentscope-action)
- [ ] PR commenting on findings
- [ ] Block PRs on critical issues
- [ ] CI/CD integration examples

#### Week 12: v1.3 Release

**v1.3.0 Release Checklist**:
- [ ] All features complete
- [ ] Tests pass
- [ ] Documentation updated
- [ ] GitHub Action tested
- [ ] npm package published
- [ ] Announcement posted

---

## Phase 5: v1.4 Enterprise Features (Week 13-20)

### Objectives
1. Team collaboration
2. Compliance reports
3. Advanced analytics
4. Custom security rules
5. SSO integration

### Tasks

#### Week 13-14: Team Collaboration

```bash
touch src/team/{AgentRegistry,TeamConfig}.ts
```

**Deliverables**:
- [ ] Shared agent registry
- [ ] Team-level configurations
- [ ] Agent template library
- [ ] Approval workflows

#### Week 15-16: Compliance Reports

```bash
touch src/reporter/{ComplianceReporter,SocReporter,IsoReporter}.ts
```

**Deliverables**:
- [ ] SOC2 compliance reports
- [ ] ISO27001 compliance reports
- [ ] GDPR compliance reports
- [ ] Custom compliance templates

#### Week 17-18: Advanced Analytics

```bash
touch src/analyzer/{UsageAnalyzer,TrendAnalyzer}.ts
```

**Deliverables**:
- [ ] Agent usage trends
- [ ] Security trends
- [ ] Performance metrics
- [ ] Cost analysis

#### Week 19-20: Custom Rules + SSO

```bash
touch src/validator/CustomRuleEngine.ts
touch src/auth/{SsoProvider,SamlProvider,OAuthProvider}.ts
```

**Deliverables**:
- [ ] Custom security rule engine (JSON-based)
- [ ] SSO integration (SAML, OAuth)
- [ ] Audit logs
- [ ] User management

**v1.4.0 Release Checklist**:
- [ ] Enterprise features complete
- [ ] Security audit passed
- [ ] Documentation for enterprises
- [ ] SLA guarantees documented
- [ ] Pricing model (if monetized)

---

## Phase 6: v2.0 Platform Expansion (Week 21-32)

### Objectives
1. VS Code extension
2. Interactive web viewer
3. Plugin system
4. AI-powered insights
5. Generic agent format

### Tasks

#### Week 21-24: VS Code Extension

```bash
mkdir -p vscode-extension
npx yo code
```

**Deliverables**:
- [ ] VS Code extension scaffolding
- [ ] Inline agent documentation
- [ ] Security issue highlighting
- [ ] Quick fixes for common issues
- [ ] Agent template snippets

#### Week 25-26: Web Viewer

```bash
mkdir -p web-viewer
npx create-react-app web-viewer
```

**Deliverables**:
- [ ] Interactive 3D architecture viewer
- [ ] Searchable agent database
- [ ] Security dashboard
- [ ] Export capabilities

#### Week 27-28: Plugin System

```bash
touch src/plugins/{PluginLoader,PluginRegistry,PluginApi}.ts
```

**Deliverables**:
- [ ] Plugin API
- [ ] Plugin loader
- [ ] Plugin registry
- [ ] Example plugins (custom validators, analyzers)

#### Week 29-30: AI-Powered Insights

```bash
touch src/ai/{InsightGenerator,LlmIntegration}.ts
```

**Deliverables**:
- [ ] LLM-powered security analysis
- [ ] Architecture recommendations
- [ ] Code generation suggestions
- [ ] Natural language queries

#### Week 31-32: Generic Agent Format

```bash
touch src/format/{GenericFormat,FormatConverter}.ts
```

**Deliverables**:
- [ ] Generic agent format (JSON schema)
- [ ] Converters for all platforms
- [ ] Format validation
- [ ] Interoperability testing

**v2.0.0 Release Checklist**:
- [ ] All features complete
- [ ] VS Code extension published
- [ ] Plugin ecosystem launched
- [ ] AI features tested
- [ ] Generic format ratified
- [ ] Major announcement

---

## Continuous Tasks (All Phases)

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run coverage
```

**Targets**:
- Unit test coverage: >90%
- Integration test coverage: >85%
- E2E test coverage: >80%

### Performance Monitoring

```bash
# Benchmarks
npm run benchmark

# Profiling
npm run profile

# Memory analysis
npm run analyze-memory
```

**Targets**:
- Scan time: <2s (50 agents)
- Security scan: <500ms
- CLI startup: <300ms
- Memory usage: <100MB

### Security Auditing

```bash
# npm audit
npm audit

# Security scan
npm run security-scan

# Dependency check
npm outdated
```

**Targets**:
- Zero critical vulnerabilities
- Zero high vulnerabilities
- All dependencies up-to-date

### Documentation

```bash
# Generate API docs
npm run docs:generate

# Validate docs
npm run docs:validate

# Spell check
npm run docs:spell-check
```

**Deliverables**:
- [ ] API documentation (JSDoc)
- [ ] User guides
- [ ] Architecture documentation
- [ ] Contribution guides
- [ ] Security advisories

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **High false positives** | Medium | High | Extensive testing, user feedback loop |
| **Performance degradation** | Medium | Medium | Parallel processing, caching |
| **Platform edge cases** | High | Medium | Real-world config testing |
| **Zero-day injection** | Medium | Critical | Fast patch process, AI detection |

### Schedule Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Delayed v1.2** | Low | Medium | Buffer time in schedule |
| **Scope creep** | Medium | High | Strict feature gating |
| **Testing delays** | Medium | High | Continuous testing |

---

## Success Metrics

### Adoption Metrics

| Metric | v1.2 Target | v1.3 Target | v1.4 Target | v2.0 Target |
|--------|-------------|-------------|-------------|-------------|
| **NPM Downloads** | 500+ | 2,000+ | 5,000+ | 10,000+ |
| **GitHub Stars** | 100+ | 300+ | 500+ | 1,000+ |
| **Active Users** | 50+ | 200+ | 500+ | 1,000+ |
| **Projects Scanned** | 300+ | 1,000+ | 2,500+ | 5,000+ |

### Quality Metrics

| Metric | Target |
|--------|--------|
| **Test Coverage** | >90% |
| **Security Detection** | >95% |
| **False Positive Rate** | <5% |
| **Scan Speed** | <2s |
| **Bug Reports** | <5/week |

### Business Metrics

| Metric | Target |
|--------|--------|
| **NPS Score** | >50 |
| **Issue Resolution** | <48h |
| **Community PRs** | 5+/month |
| **Support Burden** | <5 issues/week |

---

## Team Structure

### Core Team

| Role | Responsibilities | Headcount |
|------|-----------------|-----------|
| **Tech Lead** | Architecture, code review | 1 |
| **Backend Dev** | Scanner, validator, analyzer | 2 |
| **Security Engineer** | Security engine, CVE mapping | 1 |
| **Frontend Dev** | Web viewer, VS Code extension | 1 |
| **DevOps** | CI/CD, deployment, monitoring | 1 |
| **Technical Writer** | Documentation, guides | 1 |

**Total**: 7 people

### External Contributors

- **Open Source Contributors**: 10-20 expected
- **Security Researchers**: 5-10 expected
- **Plugin Developers**: 5-10 expected

---

## Conclusion

This implementation plan provides a clear roadmap from v1.2 (foundation) to v2.0 (platform expansion). Each phase builds on the previous, with clear deliverables and success criteria.

**Key Principles**:
1. **Incremental Delivery**: Ship v1.2 fast, iterate based on feedback
2. **Quality First**: >90% test coverage, <5% false positives
3. **Community Driven**: Open source, accept PRs, listen to users
4. **Security Focus**: Security is not optional, it's the core value proposition

**Next Steps**:
1. Review and approve this plan
2. Set up project management (GitHub Projects, Jira, etc.)
3. Kick off Week 1 implementation
4. Weekly sync meetings to track progress
5. Monthly retrospectives to adjust course

---

**Approved by**: AgentScope Core Team
**Start Date**: 2026-01-26
**Estimated Completion**: 2026-08-26 (v2.0)
**Review Frequency**: Weekly
