# AgentScope v1.2 Master Plan
## Agent-Focused Security & Documentation Enhancement

**Version:** v1.2.0-alpha
**Status:** Planning
**Timeline:** 3-4 weeks
**Focus:** Agent scanning, security validation, and enhanced documentation

---

## Executive Summary

Version 1.2 exclusively focuses on **agent-centric enhancements** - improving how we scan, validate, and document AI agent configurations. This release removes the originally planned DevContainer/Docker features (moved to separate product) and doubles down on what AgentScope does best: **understanding and documenting agent architectures**.

### Core Philosophy

> "One product, one purpose: Make AI agent configurations transparent, secure, and shareable."

DevContainers are infrastructure. AgentScope is about **AI agents**. This release realigns our scope.

---

## v1.2 Scope (Agent-Only)

### 1. Enhanced Documentation Output
**Goal:** Make generated docs more readable, scannable, and useful.

**Features:**
- ✅ Quick stats at the top (already implemented in v1.1)
- ✅ System overview section (already implemented)
- ✅ Multi-file categorization (already implemented)
- 🆕 Improved formatting and visual hierarchy
- 🆕 Cross-reference links between entities
- 🆕 Security summary section
- 🆕 Agent capability matrix

**Deliverables:**
- Enhanced README.md template with better structure
- AGENTS.md with capability matrix
- Security summary in documentation output

---

### 2. Agent-Specific Security Scanning
**Goal:** Detect security risks in agent configurations, not just code.

**Sub-features:**

#### 2.1 Claude Code Settings Validation
- Validate `.claude/settings.json` schema
- Check for insecure settings (e.g., `allowAllTools: true`)
- Detect missing security constraints
- Validate MCP server URLs (no http://, require https://)
- Check for overly permissive tool access patterns

#### 2.2 CLAUDE.md Prompt Injection Detection
- Scan `CLAUDE.md` for suspicious patterns
- Detect potential prompt injection attempts
- Validate agent instructions for security issues
- Check for unsafe code execution patterns
- Flag suspicious delegation chains

#### 2.3 Agent Configuration Security
- Validate agent definitions for security best practices
- Check skill permissions and access controls
- Detect circular delegation patterns (security risk)
- Validate hook configurations for unsafe operations
- Check plugin sources and integrity

#### 2.4 MCP Server Endpoint Validation
- Validate MCP server URLs (protocol, domain)
- Check for localhost/private IP exposure
- Detect insecure transport configurations
- Validate authentication settings
- Flag missing TLS/encryption

#### 2.5 Secret Detection in Agent Configs
- Scan for hardcoded API keys in agent configs
- Detect credentials in skill parameters
- Find secrets in hook configurations
- Validate environment variable usage
- Check for insecure secret storage patterns

**Deliverables:**
- `AgentSecurityScanner` class with 5 validator modules
- Security report in documentation output
- DREAD scoring for agent-specific risks
- ADR documenting security validation approach

---

### 3. Advanced Agent Analysis
**Goal:** Understand agent relationships, dependencies, and capabilities.

**Sub-features:**

#### 3.1 Delegation Chain Analysis
- Detect circular agent delegation (A → B → C → A)
- Map delegation depth and complexity
- Identify bottleneck agents (too many delegations)
- Calculate delegation risk score
- Visualize delegation chains in diagrams

#### 3.2 Tool Access Matrix
- Generate matrix showing which agents use which tools
- Identify tool permission overlaps
- Detect unused tools (registered but not used)
- Find overprivileged agents (access more than needed)
- Cross-reference with actual tool usage patterns

#### 3.3 Skill Coverage Analysis
- Map which agents have which skills
- Identify skill gaps (capabilities missing)
- Find redundant skill assignments
- Calculate skill distribution across agents
- Suggest skill optimizations

#### 3.4 Hook Security Validation
- Validate hook configurations for security
- Check hook execution order for logic issues
- Detect potentially dangerous hook combinations
- Validate hook permissions and constraints
- Flag hooks with elevated privileges

**Deliverables:**
- `DelegationAnalyzer` class
- `ToolAccessMatrixGenerator` class
- `SkillCoverageAnalyzer` class
- `HookSecurityValidator` class
- New diagram: `delegation-chain.md`
- New diagram: `tool-access-matrix.md`
- Enhanced component-map with skill coverage

---

### 4. Multi-Agent Platform Support
**Goal:** Support scanning configurations from other AI agent platforms.

**Phase 1 (v1.2):**
- ✅ Claude Code (already implemented)
- 🆕 Cursor agent configurations
- 🆕 Gemini CLI configurations

**Phase 2 (v1.3+):**
- GitHub Copilot agent configs
- Windsurf configurations
- Generic agent config format

**Deliverables:**
- `CursorScanner` class for `.cursor/` directories
- `GeminiScanner` class for Gemini CLI configs
- Unified agent model supporting multiple platforms
- Platform detection logic in scanner
- ADR documenting multi-platform support

---

### 5. Template Generation
**Goal:** Help users create better agent configurations.

**Features:**
- ✅ ADR templates (already implemented in v1.1)
- ✅ CONTEXT.md template (already implemented)
- 🆕 Agent definition templates (secure defaults)
- 🆕 Skill template with best practices
- 🆕 Hook template with security constraints
- 🆕 MCP server template with secure config
- 🆕 Permission template following least-privilege

**Deliverables:**
- `TemplateGenerator` class
- CLI command: `agentscope template <type>`
- Templates with inline documentation
- Security-focused defaults

---

## What's Removed from v1.2

These features are **out of scope** for AgentScope and moved to a separate DevContainer-focused product:

- ❌ DevContainer scanning
- ❌ Docker security validation
- ❌ Container lifecycle hooks
- ❌ Dockerfile analysis
- ❌ Docker Compose scanning
- ❌ Container permission analysis

**Rationale:** AgentScope is about **AI agents**, not infrastructure. DevContainers deserve their own focused tool.

---

## Timeline & Phases

### Phase 1: Enhanced Documentation (Week 1)
**Duration:** 5 days
**Focus:** Improve existing documentation output

**Tasks:**
1. Add security summary section to README.md template
2. Create agent capability matrix in AGENTS.md
3. Add cross-reference links between entities
4. Improve visual hierarchy in generated docs
5. Add quick navigation to documentation

**Acceptance Criteria:**
- Generated docs have clear security summary
- Capability matrix shows agent/skill/tool relationships
- Cross-references link entities correctly
- Documentation is more scannable and readable
- All changes backward compatible with v1.1

---

### Phase 2: Agent Security Scanner (Week 2)
**Duration:** 7 days
**Focus:** Implement agent-specific security validation

**Tasks:**
1. Create `AgentSecurityScanner` base class
2. Implement `ClaudeSettingsValidator`
3. Implement `PromptInjectionDetector` for CLAUDE.md
4. Implement `AgentConfigValidator`
5. Implement `McpEndpointValidator`
6. Implement `SecretDetector` for agent configs
7. Integrate security scanner into scan workflow
8. Add security report to documentation output
9. Write ADR-008 documenting security approach
10. Write comprehensive tests (target: 150+ tests)

**Acceptance Criteria:**
- All 5 security validators implemented and tested
- Security report generated in documentation
- DREAD scoring for agent risks
- No false positives on example configs
- ADR-008 approved and merged
- Test coverage > 90%

---

### Phase 3: Advanced Agent Analysis (Week 3)
**Duration:** 7 days
**Focus:** Implement delegation, tool, skill, and hook analysis

**Tasks:**
1. Create `DelegationAnalyzer` class
2. Detect circular delegations
3. Calculate delegation depth and complexity
4. Create `ToolAccessMatrixGenerator` class
5. Generate tool usage matrix
6. Create `SkillCoverageAnalyzer` class
7. Analyze skill distribution and gaps
8. Create `HookSecurityValidator` class
9. Validate hook configurations
10. Generate new diagrams (delegation-chain, tool-access-matrix)
11. Write comprehensive tests (target: 100+ tests)

**Acceptance Criteria:**
- Circular delegation detection working
- Tool access matrix generated correctly
- Skill coverage analysis identifies gaps
- Hook security validation catches unsafe configs
- New diagrams generated and documented
- Test coverage > 90%

---

### Phase 4: Multi-Platform & Templates (Week 4)
**Duration:** 7 days
**Focus:** Support Cursor/Gemini and add templates

**Tasks:**
1. Design unified agent model for multi-platform
2. Implement `CursorScanner` for `.cursor/` configs
3. Implement `GeminiScanner` for Gemini CLI
4. Add platform detection logic
5. Create `TemplateGenerator` class
6. Add agent definition template
7. Add skill/hook/MCP templates
8. Implement `agentscope template` CLI command
9. Write ADR-009 documenting multi-platform support
10. Write comprehensive tests (target: 80+ tests)

**Acceptance Criteria:**
- Cursor and Gemini configs scanned successfully
- Platform auto-detection working
- Templates generated with secure defaults
- CLI command working with all template types
- ADR-009 approved and merged
- Test coverage > 85%

---

## Task Breakdown (Atomic Tasks)

### Phase 1: Enhanced Documentation

#### Task 1.1: Security Summary Section
**Size:** 50 lines (code + tests)
**Files:**
- `src/core/formatters/output/security-summary.ts` (30 lines)
- `tests/unit/formatters/security-summary.test.ts` (20 lines)

**Acceptance:**
- Security summary shows risk levels
- DREAD scores displayed clearly
- Tested with mock config

---

#### Task 1.2: Capability Matrix
**Size:** 80 lines (code + tests)
**Files:**
- `src/core/formatters/output/capability-matrix.ts` (50 lines)
- `tests/unit/formatters/capability-matrix.test.ts` (30 lines)

**Acceptance:**
- Matrix shows agent → skills → tools
- Rendered as markdown table
- Tested with complex configs

---

#### Task 1.3: Cross-Reference Links
**Size:** 60 lines (code + tests)
**Files:**
- `src/core/formatters/output/cross-references.ts` (40 lines)
- `tests/unit/formatters/cross-references.test.ts` (20 lines)

**Acceptance:**
- Links between agents/skills/hooks working
- Anchor generation consistent
- Tested with all entity types

---

#### Task 1.4: Visual Hierarchy
**Size:** 40 lines (code + tests)
**Files:**
- `src/core/formatters/output/document-builder.ts` (20 lines - edit)
- `tests/unit/formatters/document-builder.test.ts` (20 lines - edit)

**Acceptance:**
- Improved heading hierarchy
- Better visual separation
- Backward compatible

---

#### Task 1.5: Quick Navigation
**Size:** 50 lines (code + tests)
**Files:**
- `src/core/formatters/output/navigation.ts` (30 lines - edit)
- `tests/unit/formatters/navigation.test.ts` (20 lines - edit)

**Acceptance:**
- Table of contents generated
- Jump links working
- Tested with long docs

---

### Phase 2: Agent Security Scanner

#### Task 2.1: Base Security Scanner
**Size:** 100 lines (code + tests)
**Files:**
- `src/core/security/agent-security-scanner.ts` (60 lines)
- `tests/unit/security/agent-security-scanner.test.ts` (40 lines)

**Acceptance:**
- Base class with plugin architecture
- DREAD scoring implemented
- Validator registration working

---

#### Task 2.2: Claude Settings Validator
**Size:** 120 lines (code + tests)
**Files:**
- `src/core/security/validators/claude-settings-validator.ts` (70 lines)
- `tests/unit/security/validators/claude-settings.test.ts` (50 lines)

**Acceptance:**
- Detects insecure settings
- Validates MCP URLs
- DREAD scores calculated

---

#### Task 2.3: Prompt Injection Detector
**Size:** 150 lines (code + tests)
**Files:**
- `src/core/security/validators/prompt-injection-detector.ts` (90 lines)
- `tests/unit/security/validators/prompt-injection.test.ts` (60 lines)

**Acceptance:**
- Detects known injection patterns
- Low false positive rate (<5%)
- Tested with adversarial examples

---

#### Task 2.4: Agent Config Validator
**Size:** 130 lines (code + tests)
**Files:**
- `src/core/security/validators/agent-config-validator.ts` (80 lines)
- `tests/unit/security/validators/agent-config.test.ts` (50 lines)

**Acceptance:**
- Validates agent definitions
- Checks permissions
- Detects circular delegations

---

#### Task 2.5: MCP Endpoint Validator
**Size:** 110 lines (code + tests)
**Files:**
- `src/core/security/validators/mcp-endpoint-validator.ts` (70 lines)
- `tests/unit/security/validators/mcp-endpoint.test.ts` (40 lines)

**Acceptance:**
- Validates URLs
- Checks protocols
- Detects localhost exposure

---

#### Task 2.6: Secret Detector
**Size:** 140 lines (code + tests)
**Files:**
- `src/core/security/validators/secret-detector.ts` (85 lines)
- `tests/unit/security/validators/secret-detector.test.ts` (55 lines)

**Acceptance:**
- Detects API keys
- Finds credentials
- Low false positives

---

#### Task 2.7: Integration & Report
**Size:** 100 lines (code + tests)
**Files:**
- `src/core/security/security-report-generator.ts` (60 lines)
- `tests/unit/security/security-report.test.ts` (40 lines)

**Acceptance:**
- Security report generated
- All validators integrated
- Report in documentation

---

#### Task 2.8: ADR-008 Documentation
**Size:** 1 file
**Files:**
- `docs/adr/ADR-008-agent-security-scanner.md`

**Acceptance:**
- Documents security approach
- Explains DREAD scoring
- Lists validators

---

### Phase 3: Advanced Agent Analysis

#### Task 3.1: Delegation Analyzer Base
**Size:** 120 lines (code + tests)
**Files:**
- `src/core/analyzers/delegation-analyzer.ts` (70 lines)
- `tests/unit/analyzers/delegation-analyzer.test.ts` (50 lines)

**Acceptance:**
- Builds delegation graph
- Detects cycles
- Calculates depth

---

#### Task 3.2: Delegation Chain Diagram
**Size:** 100 lines (code + tests)
**Files:**
- `src/core/generators/diagrams/delegation-chain.ts` (60 lines)
- `tests/unit/generators/delegation-chain.test.ts` (40 lines)

**Acceptance:**
- Generates Mermaid diagram
- Shows delegation paths
- Highlights cycles

---

#### Task 3.3: Tool Access Matrix Generator
**Size:** 140 lines (code + tests)
**Files:**
- `src/core/analyzers/tool-access-matrix.ts` (85 lines)
- `tests/unit/analyzers/tool-access-matrix.test.ts` (55 lines)

**Acceptance:**
- Generates agent/tool matrix
- Identifies overlaps
- Finds unused tools

---

#### Task 3.4: Tool Access Matrix Diagram
**Size:** 110 lines (code + tests)
**Files:**
- `src/core/generators/diagrams/tool-access-matrix.ts` (70 lines)
- `tests/unit/generators/tool-access-matrix.test.ts` (40 lines)

**Acceptance:**
- Generates matrix diagram
- Shows tool usage
- Highlights permissions

---

#### Task 3.5: Skill Coverage Analyzer
**Size:** 130 lines (code + tests)
**Files:**
- `src/core/analyzers/skill-coverage-analyzer.ts` (80 lines)
- `tests/unit/analyzers/skill-coverage.test.ts` (50 lines)

**Acceptance:**
- Maps skills to agents
- Identifies gaps
- Calculates coverage

---

#### Task 3.6: Hook Security Validator
**Size:** 120 lines (code + tests)
**Files:**
- `src/core/analyzers/hook-security-validator.ts` (75 lines)
- `tests/unit/analyzers/hook-security.test.ts` (45 lines)

**Acceptance:**
- Validates hook configs
- Checks execution order
- Detects unsafe combos

---

### Phase 4: Multi-Platform & Templates

#### Task 4.1: Unified Agent Model
**Size:** 80 lines (code + tests)
**Files:**
- `src/core/types/unified-agent.ts` (50 lines)
- `tests/unit/types/unified-agent.test.ts` (30 lines)

**Acceptance:**
- Supports multiple platforms
- Backward compatible
- Validated with Zod

---

#### Task 4.2: Cursor Scanner
**Size:** 150 lines (code + tests)
**Files:**
- `src/core/scanners/cursor-scanner.ts` (90 lines)
- `tests/unit/scanners/cursor-scanner.test.ts` (60 lines)

**Acceptance:**
- Scans `.cursor/` configs
- Converts to unified model
- Tested with real Cursor configs

---

#### Task 4.3: Gemini Scanner
**Size:** 140 lines (code + tests)
**Files:**
- `src/core/scanners/gemini-scanner.ts` (85 lines)
- `tests/unit/scanners/gemini-scanner.test.ts` (55 lines)

**Acceptance:**
- Scans Gemini CLI configs
- Converts to unified model
- Tested with real Gemini configs

---

#### Task 4.4: Platform Detection
**Size:** 90 lines (code + tests)
**Files:**
- `src/core/scanners/platform-detector.ts` (55 lines)
- `tests/unit/scanners/platform-detector.test.ts` (35 lines)

**Acceptance:**
- Auto-detects platform
- Handles mixed configs
- Tested with all platforms

---

#### Task 4.5: Template Generator
**Size:** 120 lines (code + tests)
**Files:**
- `src/core/templates/template-generator.ts` (75 lines)
- `tests/unit/templates/template-generator.test.ts` (45 lines)

**Acceptance:**
- Generates all template types
- Secure defaults
- Inline documentation

---

#### Task 4.6: Agent Template
**Size:** 60 lines
**Files:**
- `src/core/templates/templates/agent.template.ts` (60 lines)

**Acceptance:**
- Agent definition template
- Best practices included
- Secure defaults

---

#### Task 4.7: Skill/Hook/MCP Templates
**Size:** 120 lines
**Files:**
- `src/core/templates/templates/skill.template.ts` (40 lines)
- `src/core/templates/templates/hook.template.ts` (40 lines)
- `src/core/templates/templates/mcp.template.ts` (40 lines)

**Acceptance:**
- All templates created
- Secure defaults
- Best practices

---

#### Task 4.8: Template CLI Command
**Size:** 100 lines (code + tests)
**Files:**
- `src/cli/commands/template.ts` (60 lines)
- `tests/integration/cli/template.test.ts` (40 lines)

**Acceptance:**
- `agentscope template` working
- All template types supported
- Help text complete

---

#### Task 4.9: ADR-009 Documentation
**Size:** 1 file
**Files:**
- `docs/adr/ADR-009-multi-platform-support.md`

**Acceptance:**
- Documents platform support
- Explains unified model
- Lists supported platforms

---

## Acceptance Criteria (Overall v1.2)

### Functional Requirements

1. **Enhanced Documentation**
   - [ ] Security summary in README.md
   - [ ] Capability matrix in AGENTS.md
   - [ ] Cross-reference links working
   - [ ] Improved visual hierarchy
   - [ ] Quick navigation implemented

2. **Agent Security Scanner**
   - [ ] All 5 validators implemented
   - [ ] Security report generated
   - [ ] DREAD scoring working
   - [ ] Integration with scan workflow
   - [ ] ADR-008 approved

3. **Advanced Agent Analysis**
   - [ ] Circular delegation detection
   - [ ] Tool access matrix generated
   - [ ] Skill coverage analysis working
   - [ ] Hook security validation
   - [ ] New diagrams generated

4. **Multi-Platform Support**
   - [ ] Cursor configs scanned
   - [ ] Gemini configs scanned
   - [ ] Platform auto-detection working
   - [ ] Unified model implemented
   - [ ] ADR-009 approved

5. **Template Generation**
   - [ ] Agent template created
   - [ ] Skill/hook/MCP templates created
   - [ ] CLI command working
   - [ ] Secure defaults validated

---

### Non-Functional Requirements

1. **Performance**
   - [ ] Security scan <500ms for typical projects
   - [ ] Analysis <200ms per agent
   - [ ] Template generation <50ms
   - [ ] No regression in scan speed

2. **Quality**
   - [ ] Test coverage > 90% overall
   - [ ] Security validators > 95% coverage
   - [ ] All tests passing
   - [ ] No critical bugs in backlog

3. **Security**
   - [ ] False positive rate <5%
   - [ ] All known injection patterns detected
   - [ ] Secret detection working
   - [ ] No security regressions

4. **Compatibility**
   - [ ] Backward compatible with v1.1
   - [ ] Works with Node 18+
   - [ ] No breaking API changes
   - [ ] Migration path documented

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >90% | Jest coverage report |
| Security Scan Speed | <500ms | Performance tests |
| False Positive Rate | <5% | Manual validation |
| Documentation Quality | User feedback | GitHub issues |
| Platform Support | 3 platforms | Cursor, Gemini, Claude |
| Template Usage | >50 users | NPM download stats |

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positives in security scanner | High | Extensive testing, tuning thresholds |
| Platform-specific edge cases | Medium | Test with real configs from each platform |
| Performance regression | Medium | Benchmark tests, profiling |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular delegation complexity | Medium | Incremental implementation, graph algorithms |
| Template adoption | Low | Good documentation, examples |
| Multi-platform maintenance | Medium | Modular scanner architecture |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Documentation clarity | Low | User testing, feedback |
| Template defaults | Low | Security review, best practices |

---

## Dependencies

### Internal
- v1.1 codebase (stable foundation)
- Existing scanner infrastructure
- DREAD security framework
- Theme system

### External
- Node.js 18+ (no change)
- Zod for validation (already used)
- No new dependencies planned

---

## Release Plan

### Pre-Release Checklist
- [ ] All 26+ atomic tasks completed
- [ ] Test coverage >90%
- [ ] ADR-008 and ADR-009 approved
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Migration guide written (if needed)
- [ ] Security review completed
- [ ] Performance benchmarks passing

### Release Steps
1. Merge all feature branches to `main`
2. Update version to `1.2.0-alpha`
3. Run full test suite
4. Generate CHANGELOG
5. Create GitHub release
6. Publish to npm
7. Announce in discussions

---

## Post-Release (v1.3 Planning)

### Potential Features
- GitHub direct scanning
- GitHub export/import
- llms.txt generation
- ADR auto-generation from code
- BMad Method scanner
- Watch mode (real-time updates)
- GitHub Action integration

### Feedback Loop
- Monitor GitHub issues for bugs
- Track feature requests
- Analyze npm download stats
- User interviews for v1.3 priorities

---

## Appendix: Related Documents

- [README.md](../README.md) - Feature matrix
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [ADR-001](adr/ADR-001-unified-config-model.md) - Config model
- [ADR-007](adr/ADR-007-export-import.md) - Export/import
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guide
- [SECURITY.md](../SECURITY.md) - Security policy

---

**Document Status:** Draft
**Last Updated:** 2025-01-25
**Next Review:** Start of Phase 1
