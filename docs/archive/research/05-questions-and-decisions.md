# AgentScope: Requirements Questions and Architectural Decisions

> **Purpose**: This document captures critical decisions that must be made before implementation begins. Each question includes options, tradeoffs, and recommendations to guide the development team.

---

## Table of Contents

1. [Target Audience](#question-1-target-audience)
2. [Framework Priority](#question-2-framework-priority)
3. [Output Format](#question-3-output-format)
4. [Diagram Philosophy](#question-4-diagram-philosophy)
5. [Documentation Style](#question-5-documentation-style)
6. [CLI vs Library](#question-6-cli-vs-library)
7. [Watch Mode](#question-7-watch-mode)
8. [Workflow Comparator](#question-8-workflow-comparator)
9. [Export Feature](#question-9-export-feature)
10. [Distribution Strategy](#question-10-distribution-strategy)
11. [Configuration Discovery](#question-11-configuration-discovery)
12. [Error Handling Philosophy](#question-12-error-handling-philosophy)
13. [Extensibility Model](#question-13-extensibility-model)
14. [Testing Strategy](#question-14-testing-strategy)

---

## Question 1: Target Audience

**Context**: AgentScope serves different user types with varying needs. The primary audience determines feature priority, UX complexity, default behaviors, and documentation depth. Getting this wrong means building features nobody uses or making the tool too complex for actual users.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Individual Developer** | Simplest UX, fastest adoption, minimal config needed | May lack team/enterprise features, smaller market | Good starting point |
| **B: Team Lead / Tech Lead** | Focuses on overview/comparison features, enables team adoption | More complex requirements (permissions, workflows) | Secondary priority |
| **C: Solutions Architect** | Deep analysis features valuable, higher willingness to pay | Smaller user base, complex requirements | Tertiary priority |
| **D: DevOps / Platform Engineer** | CI/CD integration valuable, automation focus | Different mental model, may conflict with dev UX | Feature add-on |

**Dependencies**: This decision affects:
- Default output verbosity
- CLI command complexity
- Documentation depth
- Feature prioritization in roadmap
- Marketing and positioning

**Recommendation**: **Option A (Individual Developer) as primary, with B (Team Lead) as secondary**.

Rationale: Individual developers are the entry point - they discover the tool, try it, and then advocate to their teams. The viral loop is: dev tries it -> shares diagram with team -> team adopts. Team lead features (workflow comparison, CI integration) become valuable only after individual adoption. Design for the solo developer first, then layer on team features.

---

## Question 2: Framework Priority

**Context**: The PRD lists 5 frameworks (Claude Code, BMad, Claude-flow, Spec-kit, Gemini CLI). Building parsers for all simultaneously is resource-intensive and delays initial release. However, releasing with only one framework may limit initial appeal.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Claude Code First** | Largest current user base, most mature config structure, clearest docs | Users of other frameworks may not try it | **RECOMMENDED** |
| **B: BMad First** | Strong community, well-documented YAML structure | Smaller user base than Claude Code | Not recommended |
| **C: All Frameworks at Once** | Broad appeal from day one, unified marketing | 3-4x development time, delayed launch, quality risk | Not recommended |
| **D: Framework-Agnostic Core First** | Future-proof architecture, clean abstractions | No usable output until parsers added, abstract over-engineering risk | Partial - good for architecture |

**Dependencies**: This decision affects:
- Initial development timeline (Phase 1)
- Parser architecture design
- Test fixture requirements
- Documentation examples
- Community feedback timing

**Recommendation**: **Option A (Claude Code First) with D (Framework-Agnostic Core) architecture**.

Rationale: Claude Code has the largest active user base as of January 2026. The `.claude/` directory structure is well-documented and stable. Starting here provides:
1. Fastest path to usable tool
2. Largest potential early adopter pool
3. Real-world feedback to refine the unified config model before adding frameworks

Architecture should be framework-agnostic from day one (plugin-based parsers), but ship with Claude Code parser only in v0.1.

---

## Question 3: Output Format

**Context**: Users need to consume AgentScope output in different contexts - terminal, documentation, presentations, dashboards. The output format choice affects both implementation complexity and user adoption.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: stdout Only (Text/ASCII)** | Zero dependencies, works everywhere, pipe-friendly | No rich diagrams, limited visualization | CLI default only |
| **B: Mermaid Markdown Files** | GitHub renders natively, version-controllable, text-based | Requires viewer support, no interactivity | **RECOMMENDED as default** |
| **C: SVG/PNG Export** | Universal image support, presentation-ready | Larger files, not text-diffable, regeneration needed | Optional export |
| **D: Interactive HTML** | Rich UX, clickable diagrams, filtering | Requires hosting/serving, more complex | Phase 5 feature |
| **E: All of the Above** | Maximum flexibility | Implementation complexity, maintenance burden | Long-term goal |

**Dependencies**: This decision affects:
- Required dependencies (mermaid-cli, puppeteer for PNG)
- Output directory structure
- CI/CD integration approach
- Documentation hosting requirements

**Recommendation**: **Option B (Mermaid Markdown) as default, with C (SVG/PNG) as optional flag**.

Rationale: Mermaid strikes the perfect balance:
- GitHub/GitLab render it natively in README files
- Text-based means git-diffable and reviewable in PRs
- No external services required
- Easy to copy into Notion, Confluence, etc.

Command structure:
```bash
agentscope scan                    # Mermaid markdown (default)
agentscope scan --format svg       # SVG export
agentscope scan --format png       # PNG export (requires puppeteer)
agentscope scan --format json      # Raw unified config model
```

---

## Question 4: Diagram Philosophy

**Context**: AgentScope can generate diagrams automatically on every scan, or provide on-demand generation for specific diagram types. This affects scan performance, output size, and user workflow.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Auto-Generate All Diagrams** | Complete documentation on every run, no user decisions needed | Slower scans, larger output, may include irrelevant diagrams | Default behavior |
| **B: On-Demand Only** | Faster scans, user controls output, minimal footprint | Requires user to know what diagrams exist | Power user mode |
| **C: Smart Defaults (Subset)** | Balance of convenience and performance | Still requires deciding which diagrams are "essential" | **RECOMMENDED** |
| **D: Static vs Interactive Split** | Static for docs, interactive for exploration | Two code paths to maintain | Phase 5 consideration |

**Dependencies**: This decision affects:
- Default scan command behavior
- CLI flag design
- Output directory structure
- Performance benchmarks

**Recommendation**: **Option C (Smart Defaults) with A available via flag**.

Rationale: Generate a curated set of essential diagrams by default:
1. **Component Map** - Always useful, shows what exists
2. **Agent Hierarchy** - Shows delegation structure
3. **Hook Lifecycle** - Critical for understanding behavior

Optional diagrams via flags:
```bash
agentscope scan                           # Essential diagrams only
agentscope scan --all-diagrams            # Generate all 6 diagram types
agentscope scan --diagram workflow        # Generate specific diagram
agentscope scan --diagram permissions     # Generate specific diagram
```

This keeps scan time under 5 seconds for most projects while allowing full generation when needed.

---

## Question 5: Documentation Style

**Context**: The PRD specifies output to `docs/agent-architecture/` with multiple files. However, some users prefer a single comprehensive README, while others want modular docs. The structure affects discoverability, maintainability, and GitHub rendering.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Single README.md** | Easy to find, single link to share, complete context | Can become very long, harder to maintain sections | Small projects only |
| **B: Multiple Files (PRD Structure)** | Modular, focused documents, easier to update | More files to navigate, linking complexity | **RECOMMENDED** |
| **C: README + Detailed Subfiles** | Best of both - overview + deep dives | Duplication risk, sync issues | Hybrid approach |
| **D: Configurable Structure** | User chooses their preference | Implementation complexity, inconsistent outputs | Not recommended |

**Code Examples Sub-Decision**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Include Code Examples** | Practical, copy-pasteable, educational | Increases doc size, may become stale | Yes for configs |
| **Exclude Code Examples** | Cleaner, shorter docs | Less practical value | Not recommended |
| **Link to Source Files** | Always current, no duplication | Requires file navigation | Hybrid approach |

**Dependencies**: This decision affects:
- Output file structure
- README template design
- Cross-linking implementation
- GitHub rendering approach

**Recommendation**: **Option C (README + Detailed Subfiles) with code examples for configurations**.

Structure:
```
docs/agent-architecture/
├── README.md              # Overview with summary + TOC linking to subfiles
├── agents/
│   ├── index.md           # Agent summary table
│   └── [agent-name].md    # Per-agent detail (if >3 agents)
├── diagrams/
│   ├── component-map.md   # Diagram + explanation
│   ├── hierarchy.md
│   └── dataflow.md
├── SKILLS.md              # Skill catalog
├── HOOKS.md               # Hook documentation
├── MCPS.md                # MCP inventory
└── raw/
    └── agentscope.json    # Raw unified config (for tooling)
```

Code examples should be included for configuration snippets (YAML/JSON) but link to source files for implementation code.

---

## Question 6: CLI vs Library

**Context**: AgentScope could be a CLI tool only, an importable library, or both. This affects how other tools can integrate with it and the maintenance burden.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: CLI Tool Only** | Simpler API surface, easier to maintain, clear UX | Can't be imported by other tools, no programmatic access | Not recommended |
| **B: Library Only** | Maximum flexibility, other tools can build on it | Requires users to write code to use it | Not recommended |
| **C: CLI with Library Core** | Best of both - CLI for users, library for tools | More API surface to maintain, versioning complexity | **RECOMMENDED** |
| **D: CLI + Library + MCP Server** | Maximum integration options | Highest maintenance burden | Long-term goal |

**Dependencies**: This decision affects:
- Package structure (monorepo vs single package)
- Export strategy (what's public API)
- Version management
- Documentation requirements

**Recommendation**: **Option C (CLI with Library Core)**.

Architecture:
```
@agentscope/core     # Library - parsers, unified model, generators
@agentscope/cli      # CLI - wraps core, handles I/O
agentscope           # Meta-package installing both
```

Library usage:
```typescript
import { scan, generateDiagram } from '@agentscope/core';

const config = await scan('./my-project');
const diagram = generateDiagram(config, 'hierarchy');
```

This enables:
- VS Code extension to use library directly
- GitHub Action to use library without CLI overhead
- Other tools to embed AgentScope functionality
- MCP server to wrap library

---

## Question 7: Watch Mode

**Context**: Watch mode would automatically regenerate documentation when config files change. This is valuable for development but adds complexity.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: No Watch Mode** | Simpler implementation, explicit user control | Manual re-runs needed, docs can become stale | MVP approach |
| **B: Watch Mode (Regenerate All)** | Always-current docs, good for development | Performance impact, file system complexity | Not recommended |
| **C: Watch Mode (Incremental)** | Efficient updates, minimal regeneration | Complex dependency tracking, harder to implement | Ideal but complex |
| **D: IDE Integration Instead** | Leverages existing watch infrastructure | Requires extension per IDE | Complementary |

**Dependencies**: This decision affects:
- CLI command structure
- File watching dependencies (chokidar, etc.)
- Performance requirements
- Resource usage

**Recommendation**: **Option A (No Watch Mode) for v1.0, with D (IDE Integration) as the long-term solution**.

Rationale: Watch mode is a "nice to have" that adds significant complexity:
- File watching is platform-dependent
- Incremental regeneration requires dependency graph
- Resource usage concerns for large projects
- Users can run `agentscope scan` when needed

Better alternatives:
1. **Git hook**: Regenerate on commit
2. **CI/CD**: Regenerate on push (already in PRD)
3. **VS Code extension**: Watch via IDE (Phase 5)

If watch mode is demanded by users post-launch, implement Option C with debouncing.

---

## Question 8: Workflow Comparator

**Context**: The PRD includes a workflow comparator that checks agent setup against a company workflow definition. This is a differentiating feature but requires users to define their workflow first.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Core Feature (Required)** | Key differentiator, drives adoption | Requires workflow definition, chicken-egg problem | Not for MVP |
| **B: Optional Add-On** | Available for those who need it, no barrier | May be overlooked, underutilized | **RECOMMENDED** |
| **C: Deferred to Phase 4** | Focus on core scanning/docs first | Delays key differentiator | Acceptable |
| **D: Template-Based (Pre-built Workflows)** | Lower barrier, users pick from templates | May not match actual company workflows | Good onboarding |

**Workflow Definition Source Sub-Decision**:

| Source | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **YAML File** | Explicit, version-controllable, flexible | Requires manual creation | Primary method |
| **Infer from Git History** | Zero config, based on actual behavior | Complex implementation, may be inaccurate | Future feature |
| **Import from PM Tools** | Realistic workflows, Jira/Linear integration | API complexity, authentication | Future feature |

**Dependencies**: This decision affects:
- Phase 4 scope
- Schema design for workflow definitions
- CLI command structure
- Documentation requirements

**Recommendation**: **Option B (Optional Add-On) with D (Templates) for onboarding, deferred to Phase 4**.

Implementation approach:
1. Phase 1-3: Ship without workflow comparator
2. Phase 4: Add `agentscope compare` command
3. Provide template workflows:
   - `scrum-workflow.yaml` - Sprint-based development
   - `kanban-workflow.yaml` - Continuous flow
   - `trunk-based-workflow.yaml` - Trunk-based development
4. Users can customize templates or create from scratch

This avoids the chicken-egg problem while still delivering the feature.

---

## Question 9: Export Feature

**Context**: The PRD proposes exporting configurations between frameworks (Claude Code to BMad, etc.). This could reduce framework lock-in but is technically challenging.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Full Bidirectional Export** | Maximum flexibility, reduces lock-in | Extremely complex, semantic gaps between frameworks | Not feasible |
| **B: Export to Unified JSON Only** | Simpler implementation, useful for analysis | Doesn't solve lock-in, limited practical value | Intermediate step |
| **C: One-Way Export (Major Frameworks Only)** | Practical migration path, focused scope | Still complex, may have lossy conversions | **RECOMMENDED** |
| **D: No Export Feature** | Simplest, focus on documentation | Misses opportunity, users still locked in | Not recommended |

**Lock-In Concern Reality Check**:

| Consideration | Assessment |
|---------------|------------|
| How often do teams switch frameworks? | Rarely - high switching cost regardless of tooling |
| Is perfect conversion possible? | No - frameworks have different mental models |
| What's the real value? | Migration assistance, not seamless switching |
| User expectation management | Must be clear about conversion limitations |

**Dependencies**: This decision affects:
- Unified config model completeness
- Parser bidirectionality requirements
- Documentation requirements (what converts, what doesn't)
- Phase 4 scope

**Recommendation**: **Option C (One-Way Export, Major Frameworks) with clear limitations documented**.

Implementation:
```bash
agentscope export --to bmad           # Export current config to BMad format
agentscope export --to gemini         # Export to Gemini format
agentscope export --dry-run           # Show what would be converted
agentscope export --to bmad --report  # Show conversion report with warnings
```

Conversion report example:
```
Export to BMad Format
=====================
Converting: 5 agents, 3 skills, 2 hooks

Fully Converted:
  ✓ pm-agent -> _bmad/agents/pm-agent.md
  ✓ dev-agent -> _bmad/agents/dev-agent.md

Partially Converted (manual review needed):
  ⚠ code-review-skill: BMad uses different trigger format

Not Convertible:
  ✗ pre-commit-hook: No BMad equivalent
```

This sets realistic expectations while still providing value.

---

## Question 10: Distribution Strategy

**Context**: How users install and run AgentScope affects adoption, update frequency, and integration possibilities. Multiple distribution channels may be needed.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: npm Global Install Only** | Standard Node.js approach, versioned | Requires npm, global install permissions | Primary method |
| **B: npx Only** | Zero install, always latest | Slower startup, no offline use, version pinning harder | Secondary method |
| **C: Claude Code Skill** | Native integration, discoverable | Requires Claude Code, limited to skill capabilities | **RECOMMENDED add-on** |
| **D: MCP Server** | Deep integration, tool access | Complex setup, requires MCP infrastructure | Phase 5 |
| **E: Standalone Binary** | No Node.js required, single file | Larger size, separate build pipeline | Future consideration |
| **F: All of the Above** | Maximum reach | Maintenance burden, consistency challenges | Long-term goal |

**Dependencies**: This decision affects:
- Build pipeline complexity
- Release process
- Documentation structure
- User onboarding flow

**Recommendation**: **Multi-channel approach, phased rollout**:

| Phase | Distribution Channel | Priority |
|-------|---------------------|----------|
| Phase 1 | npm global install (`npm i -g agentscope`) | Primary |
| Phase 1 | npx support (`npx agentscope scan`) | Primary |
| Phase 4 | Claude Code skill | High |
| Phase 5 | MCP server | Medium |
| Phase 5 | GitHub Action | Medium |
| Future | Standalone binary (pkg/nexe) | Low |

npm + npx covers 90% of use cases. Claude Code skill provides native integration for the primary user base. MCP server enables advanced integrations.

---

## Question 11: Configuration Discovery

**Context**: AgentScope must discover configuration files across different frameworks and locations (project vs user level). The discovery strategy affects completeness and performance.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Project Directory Only** | Fast, predictable, no permission issues | Misses user-level configs | Not recommended |
| **B: Project + User Directories** | Complete picture, includes global agents | Permission complexity, platform differences | **RECOMMENDED** |
| **C: Full System Scan** | Finds everything | Slow, privacy concerns, permission issues | Not recommended |
| **D: Configurable Paths** | User controls scope | Requires configuration, complexity | Power user option |

**Platform Considerations**:

| Platform | User Config Location | Project Location |
|----------|---------------------|------------------|
| macOS | `~/.claude/`, `~/Library/Application Support/` | `.claude/` |
| Linux | `~/.claude/`, `~/.config/claude/` | `.claude/` |
| Windows | `%APPDATA%\claude\` | `.claude/` |

**Dependencies**: This decision affects:
- Platform-specific code requirements
- Permission handling
- Test fixture complexity
- Documentation requirements

**Recommendation**: **Option B (Project + User Directories) with D (Configurable) as override**.

Default behavior:
1. Scan current directory for project configs
2. Scan user directory for global configs
3. Merge with clear labeling (project vs global)

Override via flag:
```bash
agentscope scan                           # Project + user
agentscope scan --project-only            # Project only
agentscope scan --paths ./custom,~/.alt   # Custom paths
```

---

## Question 12: Error Handling Philosophy

**Context**: When AgentScope encounters invalid configs, missing files, or parse errors, the response affects user experience and debugging.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Fail Fast (Strict)** | Clear errors, no partial state | Single error blocks all output | Not recommended |
| **B: Best Effort (Lenient)** | Always produces output, partial results | May hide problems, incomplete docs | Not recommended |
| **C: Categorized Errors** | Clear reporting, continues where possible | More complex implementation | **RECOMMENDED** |
| **D: Validation Mode Separate** | Explicit validation when wanted | Users may skip validation | Complementary |

**Error Categories**:

| Category | Behavior | Example |
|----------|----------|---------|
| **Fatal** | Stop scan, report error | Invalid JSON in .mcp.json |
| **Warning** | Continue, include in report | Agent references missing skill |
| **Info** | Continue, optional report | Deprecated config format |

**Dependencies**: This decision affects:
- CLI exit codes
- Output format (errors section)
- Logging implementation
- CI/CD integration

**Recommendation**: **Option C (Categorized Errors) with D (Validation Mode) as additional command**.

Implementation:
```bash
agentscope scan                    # Best effort with warnings in output
agentscope scan --strict           # Fail on any warning
agentscope validate                # Validation only, no doc generation
```

Output includes errors section:
```markdown
## Scan Status

Scan completed with warnings.

### Errors (0)
None

### Warnings (2)
- `agents/dev-agent.md`: References skill `code-review` not found in skills/
- `.mcp.json`: Server `github-mcp` has no tools defined

### Info (1)
- `CLAUDE.md`: Using deprecated `allowed_tools` format, consider updating
```

---

## Question 13: Extensibility Model

**Context**: Users may want to add support for custom frameworks, diagram types, or output formats. The extensibility model affects long-term maintainability and community contributions.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: No Extensibility** | Simpler codebase, consistent output | Limited to built-in frameworks, slow to add new ones | Not recommended |
| **B: Plugin System** | Community can extend, modular | Plugin API maintenance, version compatibility | **RECOMMENDED** |
| **C: Fork-Based** | Maximum flexibility | Fragmentation, no upstream improvements | Not recommended |
| **D: Configuration-Only** | Simple extension via config | Limited power, complex configs | Complementary |

**Plugin Types**:

| Plugin Type | Purpose | Example |
|-------------|---------|---------|
| **Parser** | Add framework support | `agentscope-parser-cursor` |
| **Diagram** | Add diagram type | `agentscope-diagram-timeline` |
| **Exporter** | Add output format | `agentscope-export-confluence` |
| **Validator** | Add validation rules | `agentscope-validator-security` |

**Dependencies**: This decision affects:
- Core architecture (plugin loading)
- API stability requirements
- Documentation (plugin development guide)
- Community management

**Recommendation**: **Option B (Plugin System) with clear plugin API, starting Phase 3**.

Plugin API design:
```typescript
// Parser plugin interface
interface ParserPlugin {
  name: string;
  version: string;
  frameworks: string[];  // e.g., ['cursor', 'cursor-ai']

  detect(projectPath: string): Promise<boolean>;
  parse(projectPath: string): Promise<PartialConfig>;
}

// Plugin registration
// ~/.agentscope/plugins/cursor-parser/index.js
export default {
  name: 'agentscope-parser-cursor',
  version: '1.0.0',
  frameworks: ['cursor'],
  detect: async (path) => existsSync(join(path, '.cursor')),
  parse: async (path) => { /* ... */ }
};
```

---

## Question 14: Testing Strategy

**Context**: AgentScope parses arbitrary user configurations and generates documentation. Testing strategy affects reliability, maintenance burden, and contribution ease.

**Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Unit Tests Only** | Fast, isolated, easy to write | Misses integration issues | Insufficient |
| **B: Integration Tests Only** | Tests real scenarios | Slow, harder to debug | Insufficient |
| **C: Unit + Integration** | Balanced coverage | More tests to maintain | **RECOMMENDED** |
| **D: Snapshot Testing** | Catches regressions, easy to update | Can mask intentional changes | Complementary |
| **E: Property-Based Testing** | Finds edge cases | Complex to write, slower | For parsers |

**Test Fixture Strategy**:

| Fixture Type | Purpose | Location |
|--------------|---------|----------|
| **Minimal** | Basic happy path | `test/fixtures/minimal/` |
| **Complete** | All features used | `test/fixtures/complete/` |
| **Multi-Framework** | Multiple frameworks | `test/fixtures/multi/` |
| **Edge Cases** | Error conditions | `test/fixtures/edge/` |
| **Real-World** | Anonymized real configs | `test/fixtures/real/` |

**Dependencies**: This decision affects:
- CI/CD pipeline duration
- Contribution guidelines
- Test fixture maintenance
- Code coverage requirements

**Recommendation**: **Option C (Unit + Integration) with D (Snapshot) for diagram output**.

Test structure:
```
test/
├── unit/
│   ├── parsers/
│   │   ├── claude-code.test.ts
│   │   └── bmad.test.ts
│   ├── generators/
│   │   └── mermaid.test.ts
│   └── model/
│       └── unified-config.test.ts
├── integration/
│   ├── scan.test.ts
│   ├── diagram.test.ts
│   └── export.test.ts
├── snapshots/
│   └── diagrams/
│       ├── component-map.snap.md
│       └── hierarchy.snap.md
└── fixtures/
    ├── minimal/
    ├── complete/
    └── multi-framework/
```

Coverage targets:
- Unit tests: 80%+ line coverage
- Integration tests: All CLI commands covered
- Snapshot tests: All diagram types

---

## Decision Summary

| # | Question | Recommendation | Phase |
|---|----------|----------------|-------|
| 1 | Target Audience | Individual Developer primary | - |
| 2 | Framework Priority | Claude Code first | Phase 1 |
| 3 | Output Format | Mermaid default, SVG/PNG optional | Phase 1-2 |
| 4 | Diagram Philosophy | Smart defaults (3 essential diagrams) | Phase 1 |
| 5 | Documentation Style | README + subfiles + code examples | Phase 2 |
| 6 | CLI vs Library | CLI with library core | Phase 1 |
| 7 | Watch Mode | Deferred, use CI/IDE instead | Phase 5 |
| 8 | Workflow Comparator | Optional add-on, Phase 4 | Phase 4 |
| 9 | Export Feature | One-way with limitations | Phase 4 |
| 10 | Distribution | npm + npx now, skill + MCP later | Phased |
| 11 | Config Discovery | Project + User directories | Phase 1 |
| 12 | Error Handling | Categorized (fatal/warning/info) | Phase 1 |
| 13 | Extensibility | Plugin system | Phase 3 |
| 14 | Testing | Unit + Integration + Snapshots | Phase 1 |

---

## Open Questions for Stakeholder Input

1. **Pricing Model**: Is this free forever, or freemium with enterprise features?
2. **Telemetry**: Should anonymous usage data be collected for improvement?
3. **Framework Partnerships**: Should we coordinate with Claude Code / BMad teams?
4. **Branding**: Is "AgentScope" the final name? Any trademark concerns?
5. **Support Model**: GitHub issues only, or Discord/Slack community?

---

## Next Steps

1. Review and validate recommendations with stakeholders
2. Lock decisions before Phase 1 implementation begins
3. Update PRD with finalized decisions
4. Create detailed technical specifications based on decisions

---

*Document Version: 1.0 | January 2026 | Status: Pending Review*
