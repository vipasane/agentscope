# AgentScope Future Roadmap

> **Document Version**: 1.0
> **Created**: January 2026
> **Status**: Living Document
> **Purpose**: Track features deferred from v1.0 MVP for future consideration

---

## Overview

This roadmap captures features intentionally excluded from the v1.0 MVP release. The Lean MVP approach (4 weeks) focuses on delivering maximum value with minimum scope. Features listed here will be prioritized based on user feedback, adoption metrics, and strategic alignment.

**Philosophy**: Ship fast, learn from users, iterate based on evidence.

---

## v1.0 MVP (Days 1-2) - LOCKED

The baseline release that all future versions build upon.

### Included in v1.0

| Component | Description | Acceptance Criteria |
|-----------|-------------|---------------------|
| **Claude Code Scanner** | Parse `.claude/` directory and `CLAUDE.md` | >95% config detection rate |
| **MCP Scanner** | Parse `.mcp.json` server inventory | List all servers, tools, permissions |
| **Component Map Diagram** | Single Mermaid diagram showing all components | Valid Mermaid, renders in GitHub |
| **Workflow Sequence Diagram** | User -> Agent -> Tool -> Response flow | Shows delegation paths |
| **README.md Generator** | Overview doc with embedded diagrams | Auto-generated, human-readable |
| **AGENTS.md Generator** | Detailed agent documentation | Lists all agents with config |
| **CLI: `scan` command** | Main entry point for scanning | `npx agentscope scan` works |
| **CLI: `diagram` command** | Generate specific diagram types | `--type component\|workflow` |
| **npm/npx Distribution** | Standard Node.js package distribution | `npm i -g agentscope` works |

### v1.0 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scan Coverage | >95% of Claude Code configs | Test against 20+ real configs |
| Valid Mermaid | 100% | Mermaid CLI validation |
| Scan Time | <3 seconds | For configs with <50 components |
| GitHub Stars | 100+ in month 1 | GitHub metrics |
| Critical Bugs | <5 | GitHub issues labeled "critical" |

---

## v1.1 (Weeks 1-2 Post-Launch)

**Theme**: Polish and Essential Extensions

Focused on immediate user feedback and completing the core documentation suite.

### Features

#### 1. Additional Diagram Types

**Description**: Expand diagram capabilities beyond Component Map and Workflow Sequence.

**Priority Diagrams**:
| Diagram | Description | Effort |
|---------|-------------|--------|
| Hierarchy Diagram | Agent delegation tree (parent -> child) | 4 hours |
| Hook Lifecycle | Event trigger flow visualization | 6 hours |

**Prerequisite**: v1.0 scan working correctly

**Effort Estimate**: 1-2 days (with agentic coding)

**Trigger to Prioritize**:
- Users asking "how do I see my agent hierarchy?"
- >3 GitHub issues requesting hierarchy view

**Dependencies**:
- Unified config model must capture delegation relationships
- Mermaid flowchart subgraph support

**Acceptance Criteria**:
- [ ] Hierarchy shows all agents in tree structure
- [ ] Hook lifecycle shows event -> hook -> action flow
- [ ] Both render correctly in GitHub
- [ ] CLI `--type hierarchy` and `--type hooks` flags work

---

#### 2. SKILLS.md Documentation

**Description**: Dedicated documentation file for skills/commands with trigger patterns.

**Prerequisite**: Scanner captures skill definitions with triggers

**Effort Estimate**: 4-6 hours

**Trigger to Prioritize**:
- Users manually adding skills to AGENTS.md
- >5 requests for skill documentation

**Dependencies**:
- Skill parser extracts triggers, descriptions, arguments
- Template engine supports skill-specific fields

**Acceptance Criteria**:
- [ ] Lists all skills with slash command triggers
- [ ] Shows which agent can invoke each skill
- [ ] Includes skill file path for reference
- [ ] Auto-links to AGENTS.md agent entries

---

#### 3. HOOKS.md Documentation

**Description**: Dedicated documentation for hooks showing event types and handlers.

**Prerequisite**: Scanner captures hook definitions

**Effort Estimate**: 4-6 hours

**Trigger to Prioritize**:
- Debugging issues related to hooks
- Users asking "what hooks do I have?"

**Dependencies**:
- Hook parser captures event type, matcher, handler
- Understanding of hook execution order

**Acceptance Criteria**:
- [ ] Lists all hooks by event type
- [ ] Shows PreToolUse, PostToolUse, Notification hooks
- [ ] Includes matcher patterns
- [ ] Documents execution order

---

#### 4. Improved Error Messages

**Description**: Enhanced error handling with actionable suggestions.

**Prerequisite**: Basic error handling in v1.0

**Effort Estimate**: 4-8 hours

**Trigger to Prioritize**:
- Users reporting confusing error messages
- Support requests that could be self-served

**Dependencies**:
- Error categorization (fatal/warning/info)
- Knowledge base of common issues

**Acceptance Criteria**:
- [ ] Errors include "did you mean?" suggestions
- [ ] Link to documentation for complex errors
- [ ] Clear distinction between parse errors and missing files
- [ ] Exit codes reflect error categories

---

### v1.1 Release Criteria

- All v1.0 issues resolved
- 4 new diagram types available
- Documentation suite expanded
- <10 open bugs

---

## v1.2 (Weeks 3-4 Post-Launch)

**Theme**: Framework Expansion and Advanced Diagrams

Based on validated user demand from v1.1 feedback.

### Features

#### 1. BMad Method Scanner

**Description**: Parser for BMad YAML-based agent configurations.

**Prerequisite**:
- Plugin architecture foundation (or inline parser)
- Understanding of BMad YAML structure

**Effort Estimate**: 2-3 days

**Trigger to Prioritize**:
- >5 GitHub issues requesting BMad support
- BMad community members requesting integration
- Enterprise customer using BMad

**Dependencies**:
- BMad YAML schema documentation
- Test fixtures from BMad community
- Unified config model mapping for BMad concepts

**Technical Considerations**:
```
BMad Concept -> Unified Model Mapping:
- BMad "agent" (persona) -> Agent (with role flag)
- BMad "workflow" -> No direct equivalent (extend model?)
- BMad "checklist" -> Skill (partial mapping)
- BMad "task" -> Command
```

**Acceptance Criteria**:
- [ ] Detects BMad projects via `_bmad/` directory
- [ ] Parses agent personas from YAML
- [ ] Extracts workflows and tasks
- [ ] Generates compatible diagrams
- [ ] Documentation notes BMad-specific concepts

---

#### 2. DataFlow Diagram

**Description**: Visualize data movement between agents, tools, and external systems.

**Prerequisite**: Understanding of tool permissions and data access

**Effort Estimate**: 1-2 days

**Trigger to Prioritize**:
- Security review requests
- Compliance/audit requirements
- >5 requests for data flow visibility

**Dependencies**:
- MCP server tools mapped to data sources
- File system access patterns identified
- Network/API access documented

**Acceptance Criteria**:
- [ ] Shows data sources (files, APIs, databases)
- [ ] Maps which agents access which data
- [ ] Indicates read vs write operations
- [ ] Flags sensitive data paths

---

#### 3. Claude Code Skill Package

**Description**: Distribute AgentScope as a native Claude Code skill.

**Prerequisite**: v1.1 stable release

**Effort Estimate**: 1 day

**Trigger to Prioritize**:
- Claude Code users preferring skill invocation
- Requests for `/agentscope` command

**Dependencies**:
- Claude Code skill manifest format
- Understanding of skill distribution

**Skill Manifest** (draft):
```yaml
name: agentscope
description: Generate documentation and diagrams for your agent configuration
version: 1.2.0
triggers:
  - /agentscope
  - /scope
  - /agents
commands:
  - scan: Generate all documentation
  - diagram: Generate specific diagram
```

**Acceptance Criteria**:
- [ ] Installable via Claude Code skill system
- [ ] `/agentscope scan` works in conversation
- [ ] Output renders in Claude Code chat
- [ ] Skill published to skill registry (if available)

---

### v1.2 Release Criteria

- BMad scanner functional (if triggered)
- DataFlow diagram available
- Claude Code skill working
- <5 open critical bugs

---

## v1.3 (Month 2)

**Theme**: Enterprise Features and Workflow Alignment

Features for team adoption and process alignment.

### Features

#### 1. Workflow Comparator (Basic)

**Description**: Compare agent setup against a defined company workflow.

**Prerequisite**:
- Workflow definition schema
- Template workflows provided

**Effort Estimate**: 3-4 days

**Trigger to Prioritize**:
- Enterprise customers requesting workflow alignment
- >10 requests for "how does my setup map to our process?"
- Team leads needing governance visibility

**Dependencies**:
- Workflow YAML schema design
- Template workflows (Scrum, Kanban, Trunk-based)
- Gap analysis algorithm

**Workflow Schema** (draft):
```yaml
name: scrum-workflow
phases:
  - name: Sprint Planning
    agents: [pm-agent, tech-lead]
    artifacts: [sprint-backlog]
  - name: Development
    agents: [dev-agent]
    hooks: [pre-commit, code-review]
  - name: Review
    agents: [reviewer-agent]
    skills: [code-review]
  - name: Release
    agents: [devops-agent]
    hooks: [pre-release]
```

**Acceptance Criteria**:
- [ ] `agentscope compare --workflow ./my-workflow.yaml` works
- [ ] Gap report shows missing agents/skills/hooks
- [ ] Coverage percentage calculated
- [ ] Suggestions for filling gaps
- [ ] 3+ template workflows provided

---

#### 2. One-Way Export (with Warnings)

**Description**: Export Claude Code config to other framework formats.

**Prerequisite**:
- Deep understanding of target framework semantics
- Clear documentation of conversion limitations

**Effort Estimate**: 4-5 days

**Trigger to Prioritize**:
- Teams migrating between frameworks
- >5 requests for export functionality
- Enterprise multi-framework environments

**Dependencies**:
- BMad format writer (if BMad scanner exists)
- Conversion mapping documentation
- Loss/limitation tracking

**Critical Constraint**: One-way only. No bidirectional sync.

**CLI Interface**:
```bash
agentscope export --to bmad --dry-run     # Preview conversion
agentscope export --to bmad               # Execute with warnings
agentscope export --to bmad --report      # Detailed conversion report
```

**Conversion Report Format**:
```markdown
## Export Report: Claude Code -> BMad

### Summary
- Agents: 5/5 converted (100%)
- Skills: 3/4 converted (75%)
- Hooks: 1/3 converted (33%)

### Warnings
- skill:code-review: BMad trigger format differs (manual adjustment needed)
- hook:PreToolUse: No BMad equivalent (not exported)

### Manual Steps Required
1. Review converted agents in `_bmad/agents/`
2. Adjust skill triggers to match BMad syntax
3. Recreate hooks using BMad workflow system
```

**Acceptance Criteria**:
- [ ] Export to BMad format works
- [ ] Dry-run shows changes without writing
- [ ] Conversion report details what converts and what doesn't
- [ ] Clear warnings about semantic mismatches
- [ ] Documentation explains limitations

---

#### 3. GitHub Action

**Description**: Automated documentation generation in CI/CD pipelines.

**Prerequisite**: Stable CLI interface

**Effort Estimate**: 1-2 days

**Trigger to Prioritize**:
- Users manually running in CI
- >5 requests for official action
- DevOps teams wanting automation

**Dependencies**:
- GitHub Actions workflow format
- Docker image or npm-based action
- Output artifact handling

**Action Definition** (draft):
```yaml
name: AgentScope Documentation
description: Generate agent documentation and diagrams
inputs:
  path:
    description: Project path to scan
    default: '.'
  output:
    description: Output directory
    default: 'docs/agent-architecture'
  diagrams:
    description: Diagram types to generate
    default: 'component,workflow'
runs:
  using: 'node16'
  main: 'dist/action.js'
```

**Usage Example**:
```yaml
# .github/workflows/agent-docs.yml
name: Update Agent Documentation
on:
  push:
    paths:
      - '.claude/**'
      - '.mcp.json'
      - 'CLAUDE.md'

jobs:
  document:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: agentscope/action@v1
        with:
          path: '.'
          diagrams: 'component,workflow,hierarchy'
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'docs: update agent documentation'
```

**Acceptance Criteria**:
- [ ] Action published to GitHub Marketplace
- [ ] Works on ubuntu-latest, macos-latest, windows-latest
- [ ] Configurable output path and diagram types
- [ ] <60 second execution for typical configs
- [ ] Example workflow in documentation

---

### v1.3 Release Criteria

- Workflow comparator functional
- Export to at least 1 framework
- GitHub Action in marketplace
- Adoption metrics show growth

---

## v2.0 (Month 3+)

**Theme**: Platform Evolution

Major features requiring significant investment, deferred until MVP validated.

### Features

#### 1. Plugin Architecture

**Description**: Extensibility system for community-contributed parsers, diagrams, and exporters.

**Prerequisite**:
- Stable core API
- Community demand for extensions
- Clear extension points identified

**Effort Estimate**: 1-2 weeks

**Trigger to Prioritize**:
- Users requesting unsupported framework
- Community members offering contributions
- >3 frameworks requested not in roadmap

**Dependencies**:
- Plugin loading mechanism
- Plugin API versioning
- Plugin registry/discovery

**Plugin Types**:
| Type | Purpose | Interface |
|------|---------|-----------|
| Parser | Add framework support | `ParserPlugin` |
| Diagram | Add visualization type | `DiagramPlugin` |
| Exporter | Add output format | `ExporterPlugin` |
| Validator | Add validation rules | `ValidatorPlugin` |

**Plugin Interface** (draft):
```typescript
interface ParserPlugin {
  name: string;
  version: string;
  frameworks: string[];

  detect(projectPath: string): Promise<boolean>;
  parse(projectPath: string): Promise<PartialConfig>;
}

interface DiagramPlugin {
  name: string;
  version: string;
  diagramType: string;

  generate(config: UnifiedConfig): Promise<string>;
  validate(output: string): Promise<boolean>;
}
```

**Acceptance Criteria**:
- [ ] Plugin loading from `~/.agentscope/plugins/`
- [ ] Plugin API documented with examples
- [ ] At least 1 community plugin published
- [ ] Plugin version compatibility checking
- [ ] Graceful degradation if plugin fails

---

#### 2. VS Code Extension

**Description**: IDE integration for real-time agent visualization.

**Prerequisite**:
- Stable library core
- User demand for IDE integration
- Watch mode functional

**Effort Estimate**: 2-3 weeks

**Trigger to Prioritize**:
- >20 requests for VS Code integration
- Competitive pressure from native IDE tools
- Enterprise customers requiring IDE workflow

**Dependencies**:
- VS Code extension API knowledge
- Webview for diagram rendering
- File watcher integration
- Language server (optional)

**Extension Features** (priority order):
1. Command palette: "AgentScope: Generate Documentation"
2. Status bar indicator showing agent count
3. Webview panel with interactive diagrams
4. Hover information on agent/skill references
5. Go-to-definition for agent/skill files
6. Automatic regeneration on config change

**Acceptance Criteria**:
- [ ] Published to VS Code Marketplace
- [ ] Works with VS Code 1.80+
- [ ] <500ms response for command palette actions
- [ ] Webview renders Mermaid diagrams
- [ ] File watching updates diagrams automatically

---

#### 3. Watch Mode

**Description**: Automatic documentation regeneration when configs change.

**Prerequisite**:
- Performance optimization
- Incremental generation capability

**Effort Estimate**: 1 week

**Trigger to Prioritize**:
- Users requesting real-time updates
- IDE extension development
- Significant performance improvements

**Dependencies**:
- File watching library (chokidar)
- Incremental diff detection
- Debouncing mechanism
- Resource usage optimization

**Technical Considerations**:
```
Challenges:
1. File system watching is platform-dependent
2. Incremental regeneration requires dependency graph
3. Resource usage for long-running processes
4. Conflict with IDE file watchers

Alternatives considered:
- Git hooks (pre-commit regeneration)
- CI/CD only (GitHub Action)
- IDE extension (VS Code file events)
```

**Acceptance Criteria**:
- [ ] `agentscope watch` command starts watcher
- [ ] Detects changes in <100ms
- [ ] Regenerates affected outputs only
- [ ] <10% CPU usage when idle
- [ ] Graceful shutdown on Ctrl+C

---

#### 4. Gemini CLI Scanner

**Description**: Parser for Google's Gemini CLI agent configurations.

**Prerequisite**:
- Gemini CLI config format documentation
- User demand validation

**Effort Estimate**: 2-3 days

**Trigger to Prioritize**:
- >10 requests for Gemini support
- Gemini CLI market share growth
- Google partnership opportunity

**Dependencies**:
- Gemini CLI config schema
- Mapping to unified model
- Test fixtures from Gemini users

**Risk Assessment**:
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Format undocumented | HIGH | Reverse engineer from examples |
| Format changes frequently | MEDIUM | Version pinning, rapid response |
| Limited adoption | MEDIUM | Wait for market signals |

**Acceptance Criteria**:
- [ ] Detects Gemini projects
- [ ] Parses agent definitions
- [ ] Generates compatible diagrams
- [ ] Documented mapping differences

---

#### 5. Interactive Web Viewer

**Description**: Browser-based interactive diagram exploration.

**Prerequisite**:
- Static diagrams proven useful
- User demand for interactivity

**Effort Estimate**: 2-3 weeks

**Trigger to Prioritize**:
- Large configs overwhelming static diagrams
- >15 requests for interactive exploration
- Team collaboration use cases

**Dependencies**:
- Frontend framework (React/Vue/Svelte)
- Graph visualization library (D3, Cytoscape)
- Static site generation
- Optional: hosting solution

**Features** (priority order):
1. Pan and zoom on diagrams
2. Click to expand/collapse nodes
3. Filter by agent/skill/hook
4. Search across components
5. Side panel with component details
6. Export to PNG/SVG

**Acceptance Criteria**:
- [ ] `agentscope serve` starts local viewer
- [ ] Works with configs up to 100+ components
- [ ] Filter/search functional
- [ ] Export maintains quality
- [ ] Optional: static site generation

---

### v2.0 Release Criteria

- Plugin architecture operational
- At least 1 major IDE integration
- Community contributions enabled
- Sustainable maintenance model

---

## Icebox (No Timeline)

Features with unclear demand or significant complexity. Will only be prioritized with strong user signals.

### 1. Bidirectional Export/Sync

**Description**: Two-way synchronization between framework configs.

**Why Icebox**:
- Semantic mismatch between frameworks makes true bidirectional sync infeasible
- Different frameworks have fundamentally different concepts
- Would require constant maintenance as frameworks evolve
- Better to provide one-way export with clear limitations

**Would Require to Prioritize**:
- Framework vendors creating interoperability standards
- >50 enterprise customers demanding it
- Significant funding for dedicated maintenance team

**Estimated Effort**: 2-3 months (if ever feasible)

---

### 2. Optimizer Module

**Description**: AI-powered suggestions for improving agent configurations.

**Why Icebox**:
- Undefined scope ("optimization" means different things)
- Requires deep domain expertise per framework
- Risk of bad suggestions causing problems
- Better handled by framework-specific linters

**Would Require to Prioritize**:
- Clear definition of what "optimization" means
- Validated best practices database
- User research showing specific pain points
- Framework vendor partnerships

**Estimated Effort**: 4-6 weeks (scope-dependent)

---

### 3. Community Template Library

**Description**: Shared library of agent configurations for common use cases.

**Why Icebox**:
- Needs user base before content
- Quality control and curation overhead
- Security review for shared configs
- Versioning and compatibility challenges

**Would Require to Prioritize**:
- >1000 active users
- Community contributors offering templates
- Moderation/review process defined
- Hosting and CDN infrastructure

**Estimated Effort**: 2-4 weeks initial, ongoing maintenance

---

### 4. Claude-flow Scanner

**Description**: Parser for Claude-flow multi-agent orchestration configs.

**Why Icebox**:
- Claude-flow is a niche framework (low adoption)
- Rapidly evolving (alpha/beta stage)
- Config structure may change significantly
- Limited user requests

**Would Require to Prioritize**:
- >10 explicit requests
- Claude-flow reaching stable release
- Documented config schema
- Partnership with claude-flow maintainers

**Estimated Effort**: 2-3 days

---

### 5. Permission Matrix Diagram

**Description**: Visualization of agent permissions and tool access.

**Why Icebox**:
- Rarely requested
- Security teams prefer audit reports over diagrams
- Can be generated on-demand by Claude Code itself

**Would Require to Prioritize**:
- Compliance/audit requirements
- >5 security-focused requests
- Enterprise security team partnerships

**Estimated Effort**: 4-6 hours

---

### 6. Hook Lifecycle Diagram (Advanced)

**Description**: Detailed timing and execution order visualization for hooks.

**Why Icebox**:
- Niche use case (debugging hooks)
- Static diagram can't show runtime behavior
- Claude Code may add native debugging tools

**Would Require to Prioritize**:
- Users debugging complex hook setups
- >5 requests specifically for hook timing
- No native debugging solution from Claude Code

**Estimated Effort**: 6-8 hours

---

### 7. Hierarchy Diagram (Advanced)

**Description**: Multi-level agent hierarchy with permission inheritance.

**Why Icebox**:
- Basic hierarchy diagram covers most needs
- Permission inheritance is framework-specific
- Complex to visualize without interactivity

**Would Require to Prioritize**:
- Enterprise multi-team setups
- >5 requests for inheritance visualization
- Clear use cases documented

**Estimated Effort**: 1-2 days

---

## User Feedback Triggers

How user signals inform roadmap prioritization.

### GitHub Issues

| Threshold | Action |
|-----------|--------|
| 3+ issues | Add to "Under Consideration" |
| 5+ issues | Schedule for next minor release |
| 10+ issues | Expedite to current sprint |
| 20+ issues | Critical - drop other work |

**Issue Template Questions**:
1. What are you trying to accomplish?
2. What framework(s) do you use?
3. How often would you use this feature?
4. Any workarounds you're currently using?

### Usage Analytics (if implemented)

| Signal | Interpretation | Action |
|--------|----------------|--------|
| >50% scan failures | Parser issues | Prioritize error handling |
| >30% use specific diagram | Popular feature | Enhance that diagram |
| <5% use feature | Low value | Consider deprecation |
| High CLI error rate | UX issues | Improve error messages |

### Direct Feedback Channels

| Channel | Response Time | Weight |
|---------|---------------|--------|
| GitHub Issues | 48 hours | High |
| Community Discord (if exists) | 24 hours | Medium |
| Enterprise Customers | 4 hours | Critical |
| Twitter/Social | Best effort | Low |

### Quarterly Review Process

1. **Collect**: Aggregate all feedback sources
2. **Categorize**: Group by feature area
3. **Prioritize**: Score by frequency + impact
4. **Plan**: Add top items to next quarter
5. **Communicate**: Update roadmap publicly

---

## Technical Debt Tracking

Known limitations to address as the tool matures.

### P1 (Address in v1.x)

| Item | Description | Effort |
|------|-------------|--------|
| Config versioning | Handle multiple Claude Code config versions | 4 hours |
| Large config performance | Optimize for 100+ component configs | 1 day |
| Error message consistency | Standardize error format | 4 hours |

### P2 (Address in v2.x)

| Item | Description | Effort |
|------|-------------|--------|
| Plugin API stability | Define stable plugin interface | 1 week |
| Incremental scanning | Only rescan changed files | 2-3 days |
| Caching layer | Cache parsed configs | 1 day |

### P3 (Future)

| Item | Description | Effort |
|------|-------------|--------|
| Multi-project support | Scan monorepo with multiple configs | 1 week |
| Offline mode | Bundle all dependencies | 2 days |
| Telemetry opt-in | Anonymous usage analytics | 2-3 days |

---

## Competitive Response Plan

How to respond if competitors ship similar functionality.

### Scenario: Claude Code Adds Native Visualization

**Likelihood**: HIGH (6-12 months)
**Response**:
1. Pivot to cross-framework unique value
2. Focus on features native tools won't have (workflow comparator)
3. Position as "enterprise" or "team" tool
4. Consider integration vs competition

### Scenario: DeepWiki Adds Agent Intelligence

**Likelihood**: MEDIUM
**Response**:
1. Highlight offline/local operation
2. Emphasize framework-specific accuracy
3. Consider partnership or integration

### Scenario: New Competitor Emerges

**Likelihood**: HIGH
**Response**:
1. Accelerate unique feature development
2. Build community moat (templates, plugins)
3. Consider acquisition or merger

---

## Resource Planning

Estimated resources for future phases.

### Maintenance Load

| Version | Weekly Hours | Focus |
|---------|--------------|-------|
| v1.0-v1.1 | 10-15 | Bug fixes, user support |
| v1.2-v1.3 | 15-20 | Feature development + maintenance |
| v2.0+ | 20-30 | Platform development + community |

### Sustainability Model

**Must define before v2.0**:
1. **Funding**: Sponsorship, grants, or freemium?
2. **Governance**: Single maintainer or team?
3. **Contribution**: How to accept community PRs?
4. **Support**: Paid support for enterprise?

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Initial roadmap created | Strategic Planning Agent |

---

*This roadmap is a living document. Features may be reprioritized based on user feedback and market conditions. Check [CHANGELOG.md] for the latest updates.*
