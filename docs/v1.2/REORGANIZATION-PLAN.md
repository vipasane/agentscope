# AgentScope v1.2 Reorganization Plan

> **Critical Correction**: Separate DevContainer Scanning from Agent Scanning
> **Date**: 2026-01-25
> **Status**: Planning Complete - Ready for Execution

---

## Executive Summary

### The Problem

AgentScope v1.2 planning incorrectly included **DevContainer configuration scanning** as a core feature. This violates the product's fundamental purpose and creates architectural confusion.

### Core Mission Clarity

**AgentScope scans CODING AGENTS, not infrastructure:**

| Correct Scope | Incorrect Scope (v1.2 error) |
|---------------|------------------------------|
| ✅ Claude Code agents | ❌ DevContainer configs |
| ✅ Claude Code skills | ❌ Docker images |
| ✅ Claude Code hooks | ❌ Container mounts |
| ✅ MCP servers | ❌ VSCode customizations |
| ✅ Permissions (Tool DSL) | ❌ Post-create commands |
| ✅ Plugins | |
| ✅ Commands | |

### Why DevContainer Scanning is a Separate Product

| Aspect | AgentScope (Agents) | DevContainer Scanner (Different Product) |
|--------|---------------------|------------------------------------------|
| **Target Files** | `.claude/`, `CLAUDE.md`, `.mcp.json` | `.devcontainer/devcontainer.json` |
| **Security Model** | File parsing only | Docker runtime, image inspection |
| **User Base** | AI agent developers | DevOps, container engineers |
| **Scope** | Agent configurations | Infrastructure configurations |
| **Dependencies** | None (pure parser) | Docker daemon, VSCode APIs |
| **Risk Profile** | Low (read-only files) | High (container introspection) |

---

## Reorganization Strategy

### Phase 1: Extract DevContainer Materials (Day 1)

#### 1.1 Identify All DevContainer Work

**Documentation to Extract** (11 files):
```
docs/adr/ADR-008-devcontainer-scanner.md
docs/adr/ADR-008-devcontainer-scanning.md
docs/adr/ADR-009-devcontainer-lifecycle-hooks.md
docs/adr/ADR-011-devcontainer-security.md
docs/adr/DDD-002-devcontainer-domain.md
docs/adr/SUMMARY-v1.2-devcontainer-architecture.md
docs/research/devcontainer-analysis.md
docs/DEVCONTAINER-SECURITY-SUMMARY.md
docs/security/DEVCONTAINER-SECURITY-README.md
docs/security/ARCHITECTURE-DIAGRAM.md (DevContainer sections only)
docs/security/COMPLETION-REPORT.md (DevContainer sections only)
```

**Code to Extract** (2 files):
```
src/core/security/devcontainer-validators.ts
src/core/security/devcontainer-sanitizers.ts
```

**Planning Documents to Update**:
```
docs/v1.2/MASTER-PLAN.md (remove DevContainer sections)
docs/v1.2/ROADMAP.md (remove DevContainer milestones)
docs/v1.2/ADR-INDEX.md (remove DevContainer ADRs)
docs/adr/ADR-009-ddd-bounded-contexts-v12.md (remove DevContainerContext)
```

#### 1.2 Create Export Package

**Directory Structure**:
```
export/devcontainer-scanner/
├── README.md                           # Explains this is a SEPARATE product
├── docs/
│   ├── adr/                            # All DevContainer ADRs
│   ├── research/                       # DevContainer analysis
│   ├── security/                       # DevContainer security docs
│   └── PRODUCT-VISION.md               # Why this is separate
├── src/
│   └── security/                       # DevContainer validators/sanitizers
└── MIGRATION-NOTICE.md                 # For anyone who expected this in v1.2
```

#### 1.3 Update All References

**Files to Update** (remove DevContainer mentions):
- `/workspaces/agentscope/README.md` - Remove DevContainer from roadmap
- `/workspaces/agentscope/docs/v1.2/MASTER-PLAN.md` - Remove DevContainer sections
- `/workspaces/agentscope/docs/v1.2/ROADMAP.md` - Remove DevContainer milestones
- `/workspaces/agentscope/docs/adr/README.md` - Remove DevContainer ADRs
- `/workspaces/agentscope/docs/adr/ADR-009-ddd-bounded-contexts-v12.md` - Remove DevContainerContext

---

### Phase 2: Refocus v1.2 on Agent Scanning (Days 2-3)

#### 2.1 Core v1.2 Scope (Agent-Focused Only)

**What v1.2 SHOULD include**:

| Feature | Why It Belongs in v1.2 | Complexity | Effort |
|---------|------------------------|------------|--------|
| **Enhanced Documentation Output** | Better docs for agent configs | Low | 3-4 days |
| **Multi-File Diagram Support** | Large agent systems need category views | Medium | 3-4 days |
| **Category-Based Documentation** | Organize agents by type (GitHub, Security, etc.) | Low | 2-3 days |
| **Dataflow Diagram Enhancement** | Show how data flows through agents | Medium | 2-3 days |
| **Claude Code Settings Deep Scan** | Parse `.claude/settings.json` deeply | Medium | 2-3 days |
| **CLAUDE.md Enhanced Parsing** | Extract more metadata from agent docs | Low | 1-2 days |
| **ADR Template Generation** | Document architectural decisions | Low | 1-2 days |
| **CONTEXT.md Generation** | arc42 documentation | Low | 1-2 days |

**Total Effort**: 2-3 weeks (SAME as before, just refocused)

#### 2.2 New v1.2 Features (Agent-Specific)

**Claude Code Settings Deep Scan**:
- Parse `.claude/settings.json` for additional agent metadata
- Extract skill configurations
- Identify hook bindings
- Map permission rules

**CLAUDE.md Enhanced Parsing**:
- Extract agent documentation sections
- Parse skill usage examples
- Identify delegation patterns
- Extract capability matrices

#### 2.3 Updated v1.2 Bounded Contexts

**DDD Model (corrected)**:
```
Core Domains:
- DiagramGeneration (unchanged)
- OutputFormatting (unchanged)
- LearningContext (NEW - neural patterns for agent configs)

Supporting Domains:
- ConfigParsing (unchanged)
- ThemeSystem (unchanged)
- IntegrationContext (NEW - claude-flow hooks)
- AgentMetadataContext (NEW - deep .claude/ parsing)

REMOVED:
- DevContainerContext (moved to separate product)
```

---

### Phase 3: Create DevContainer Scanner Product Vision (Day 3)

#### 3.1 Export Package README

```markdown
# DevContainer Configuration Scanner

> **NOTICE**: This is a SEPARATE product from AgentScope.

## Why This is Not Part of AgentScope

AgentScope scans **coding agent configurations** (Claude Code, Cursor, Gemini CLI).

DevContainer scanning is a **different problem domain**:
- Different target files (`.devcontainer/` vs `.claude/`)
- Different security model (Docker runtime vs file parsing)
- Different user base (DevOps vs AI developers)
- Different dependencies (Docker daemon vs none)

## Product Vision

A standalone tool for scanning DevContainer configurations to:
- Document container-based development environments
- Validate DevContainer JSON schemas
- Detect security issues in container configs
- Generate infrastructure documentation

## Development Status

**Research and architecture complete. Implementation deferred.**

If you're interested in building this, see `/docs/adr/` for:
- ADR-008: DevContainer Configuration Scanner
- ADR-011: DevContainer Security Model
- DDD-002: DevContainer Domain Model

## Relationship to AgentScope

If a DevContainer includes Claude Code agent configurations:
1. **AgentScope** scans the `.claude/` directory (agent configs)
2. **DevContainer Scanner** (this project) scans `.devcontainer/` (infrastructure)

These are complementary but separate concerns.
```

#### 3.2 Migration Notice

For users who expected DevContainer scanning in v1.2:

```markdown
# Migration Notice: DevContainer Scanning

## What Happened

AgentScope v1.2 planning initially included DevContainer scanning.

After architectural review, we determined DevContainer scanning is a
**separate product** with different scope, security model, and user base.

## What This Means

- **AgentScope v1.2** focuses on agent configurations (`.claude/`, `CLAUDE.md`)
- **DevContainer scanning** is available as research/architecture in `/export/`
- If you need DevContainer scanning, you can build it using our ADRs

## Core Mission Clarity

**AgentScope scans coding agents**, not infrastructure.

## Contact

Questions? Open an issue at https://github.com/vipasane/agentscope/issues
```

---

## Reorganization Task Breakdown

### Atomic Tasks (All <200 lines)

#### Task 1: Create Export Directory Structure
- **Files**: Create `export/devcontainer-scanner/` hierarchy
- **Effort**: 30 minutes
- **Acceptance**: Directory structure matches plan

#### Task 2: Move DevContainer Documentation
- **Files**: Move 11 ADRs and docs to export package
- **Effort**: 1 hour
- **Acceptance**: All DevContainer docs in export/, original locations deleted

#### Task 3: Move DevContainer Code
- **Files**: Move 2 TypeScript files to export package
- **Effort**: 30 minutes
- **Acceptance**: Code moved, imports updated

#### Task 4: Create Export Package README
- **Files**: `export/devcontainer-scanner/README.md`
- **Effort**: 1 hour
- **Acceptance**: Clear explanation of separation

#### Task 5: Create Migration Notice
- **Files**: `export/devcontainer-scanner/MIGRATION-NOTICE.md`
- **Effort**: 30 minutes
- **Acceptance**: Users understand what happened

#### Task 6: Update Master Plan (Remove DevContainer)
- **Files**: `docs/v1.2/MASTER-PLAN.md`
- **Effort**: 1 hour
- **Acceptance**: No DevContainer references

#### Task 7: Update Roadmap (Remove DevContainer)
- **Files**: `docs/v1.2/ROADMAP.md`
- **Effort**: 30 minutes
- **Acceptance**: No DevContainer milestones

#### Task 8: Update DDD Bounded Contexts
- **Files**: `docs/adr/ADR-009-ddd-bounded-contexts-v12.md`
- **Effort**: 1 hour
- **Acceptance**: DevContainerContext removed, AgentMetadataContext added

#### Task 9: Update ADR Index
- **Files**: `docs/adr/README.md`, `docs/v1.2/ADR-INDEX.md`
- **Effort**: 30 minutes
- **Acceptance**: DevContainer ADRs removed from index

#### Task 10: Update Main README
- **Files**: `README.md`
- **Effort**: 30 minutes
- **Acceptance**: No DevContainer references in roadmap

#### Task 11: Add New v1.2 Features Documentation
- **Files**: New ADRs for Claude Code settings deep scan
- **Effort**: 2 hours
- **Acceptance**: Clear documentation of agent-focused features

#### Task 12: Update Security Documentation
- **Files**: Remove DevContainer sections from security docs
- **Effort**: 1 hour
- **Acceptance**: Only agent-related security concerns

**Total Reorganization Effort**: 1 day (8 hours)

---

## Updated v1.2 Scope

### Features Confirmed for v1.2 (Agent-Focused)

| Feature | Status | Belongs in v1.2? | Reason |
|---------|--------|------------------|--------|
| Enhanced Documentation Output | ✅ Keep | Yes | Core value proposition |
| Multi-File Diagram Support | ✅ Keep | Yes | Scalability for large agent systems |
| Category-Based Documentation | ✅ Keep | Yes | Organize agents by type |
| Dataflow Diagram Enhancement | ✅ Keep | Yes | Show agent interactions |
| Claude Code Settings Deep Scan | ✅ Add | Yes | Extract more agent metadata |
| CLAUDE.md Enhanced Parsing | ✅ Add | Yes | Better agent documentation |
| ADR Template Generation | ✅ Keep | Yes | Document decisions |
| CONTEXT.md Generation | ✅ Keep | Yes | arc42 docs |
| **DevContainer Scanner** | ❌ **Remove** | **No** | **Separate product** |
| DevContainer Security | ❌ **Remove** | **No** | **Different scope** |
| DevContainer Lifecycle Hooks | ❌ **Remove** | **No** | **Infrastructure, not agents** |

### New v1.2 Timeline (Same 2-3 weeks)

**Week 1: Enhanced Documentation**
- Days 1-2: README enhancement
- Day 3: Capabilities Matrix & Delegation Hierarchy
- Days 4-5: Component Map & Hierarchy enhancements

**Week 2: Multi-File & Agent Metadata**
- Days 1-2: Category detection & diagrams
- Days 3-4: Claude Code settings deep scan
- Day 5: CLAUDE.md enhanced parsing

**Week 2-3: Advanced Features**
- Days 1-2: Enhanced dataflow diagram
- Day 3: ADR template generation
- Day 4: CONTEXT.md generation
- Day 5: Integration testing

**Week 3: Testing & Release**
- Days 1-2: Comprehensive testing
- Day 3: Performance benchmarking
- Days 4-5: Release preparation

---

## Success Criteria

### Reorganization Complete When:

- [ ] All DevContainer materials in `export/devcontainer-scanner/`
- [ ] Export package has clear README explaining separation
- [ ] Migration notice created for users
- [ ] All AgentScope docs updated (no DevContainer references)
- [ ] v1.2 Master Plan refocused on agent scanning
- [ ] v1.2 Roadmap reflects agent-only features
- [ ] DDD bounded contexts corrected
- [ ] ADR index updated
- [ ] Main README updated
- [ ] New v1.2 agent-focused features documented

### v1.2 Focused When:

- [ ] All features are agent-scanning related
- [ ] No infrastructure/DevOps concerns
- [ ] Clear separation between agents and containers
- [ ] Documentation emphasizes core mission
- [ ] Examples show agent configurations only

---

## Communication Plan

### Internal (Agents)

**Memory Pattern**:
```bash
npx @claude-flow/cli@latest memory store \
  --namespace v1.2-reorganization \
  --key "scope-correction-$(date +%s)" \
  --value "AgentScope scans AGENTS, not infrastructure. DevContainer = separate product."
```

### External (Users)

**GitHub Issue**: Create issue explaining scope correction
**Migration Notice**: In export package
**README Update**: Clarify core mission

---

## Risk Assessment

### Reorganization Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| User confusion (expected DevContainer) | Medium | Low | Clear migration notice |
| Lost DevContainer research | Low | Low | All preserved in export package |
| Scope creep prevention | High | Medium | Strict adherence to agent-only scope |
| Timeline impact | Low | Low | Reorganization is 1 day, v1.2 still 2-3 weeks |

### Benefits of Reorganization

1. **Clear Mission**: AgentScope = agent scanner, not infrastructure scanner
2. **Better Architecture**: No conflation of agent and container concerns
3. **Security Clarity**: Different threat models for agents vs containers
4. **User Focus**: AI developers, not DevOps engineers
5. **Maintainability**: Smaller, focused codebase

---

## Appendix A: Files Affected

### Documentation to Move

```
docs/adr/ADR-008-devcontainer-scanner.md → export/devcontainer-scanner/docs/adr/
docs/adr/ADR-008-devcontainer-scanning.md → export/devcontainer-scanner/docs/adr/
docs/adr/ADR-009-devcontainer-lifecycle-hooks.md → export/devcontainer-scanner/docs/adr/
docs/adr/ADR-011-devcontainer-security.md → export/devcontainer-scanner/docs/adr/
docs/adr/DDD-002-devcontainer-domain.md → export/devcontainer-scanner/docs/adr/
docs/adr/SUMMARY-v1.2-devcontainer-architecture.md → export/devcontainer-scanner/docs/adr/
docs/research/devcontainer-analysis.md → export/devcontainer-scanner/docs/research/
docs/DEVCONTAINER-SECURITY-SUMMARY.md → export/devcontainer-scanner/docs/security/
docs/security/DEVCONTAINER-SECURITY-README.md → export/devcontainer-scanner/docs/security/
```

### Code to Move

```
src/core/security/devcontainer-validators.ts → export/devcontainer-scanner/src/security/
src/core/security/devcontainer-sanitizers.ts → export/devcontainer-scanner/src/security/
```

### Documentation to Update (Remove DevContainer)

```
README.md
docs/v1.2/MASTER-PLAN.md
docs/v1.2/ROADMAP.md
docs/v1.2/ADR-INDEX.md
docs/adr/README.md
docs/adr/ADR-009-ddd-bounded-contexts-v12.md
docs/adr/V12-SUMMARY.md
docs/security/COMPLETION-REPORT.md
docs/security/ARCHITECTURE-DIAGRAM.md
```

---

## Appendix B: Agent Assignments

| Agent Type | Responsibility | Tasks |
|------------|----------------|-------|
| **Strategic Planner** | Coordinate reorganization | This plan, progress tracking |
| **Researcher** | Identify all DevContainer work | File audits, dependency mapping |
| **System Architect** | Update DDD model | Bounded contexts, aggregate roots |
| **Coder** | Move files, update references | File moves, import updates |
| **Reviewer** | Verify separation | Check for DevContainer leakage |
| **Technical Writer** | Update documentation | READMEs, migration notices |

---

*Reorganization Plan Version: 1.0*
*Created: 2026-01-25*
*Coordinated by Strategic Planning Agent*
