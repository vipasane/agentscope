# AgentScope Research: Executive Summary

> **Research Date**: January 2026
> **Documents**: 5 research reports from parallel swarm analysis
> **Verdict**: Promising concept with significant scope concerns - recommend pivoting to a **4-week Lean MVP**

---

## TL;DR Verdict

| Aspect | Assessment | Action |
|--------|------------|--------|
| **Problem** | Valid - teams struggle to understand complex agent setups | Proceed |
| **Solution** | Overscoped - 20 weeks, 5 frameworks is too ambitious | **Reduce by 75%** |
| **Competition** | Moderate risk - DeepWiki exists, native features coming | Move fast |
| **Timeline** | Unrealistic - Phase 3 alone needs 12+ weeks | **4-week MVP** |
| **Architecture** | Unified model is naive across heterogeneous frameworks | Plugin-based |
| **Bidirectional Export** | Fantasy - semantic gaps make this a separate product | **Remove from v1** |

---

## Key Findings Across All Research

### 1. Critical Issues (STOP and Reconsider)

| Issue | Severity | Source | Recommendation |
|-------|----------|--------|----------------|
| **Framework volatility** | CRITICAL | Critical Analysis | Frameworks change monthly with no API contracts |
| **20-week timeline unrealistic** | CRITICAL | Critical Analysis | Phase 3 alone (4 parsers) needs 12+ weeks |
| **Bidirectional export is fantasy** | CRITICAL | Critical Analysis | Semantic mismatches make this a product, not a feature |
| **Native competition imminent** | CRITICAL | Alternatives | Anthropic likely adds visualization in 6-12 months |
| **Unified config model won't work** | CRITICAL | Critical Analysis | BMad "agents" ≠ Claude Code "agents" |

### 2. What Actually Works

| Finding | Source | Implication |
|---------|--------|-------------|
| No tool does multi-framework agent scanning | Alternatives | Unique value proposition exists |
| 60-70% can be built with existing npm packages | Components | Fast development possible |
| Claude Code has largest user base | Questions | Start here for maximum impact |
| 80% of value comes from 20% of features | Simplification | Cut scope aggressively |
| DeepWiki covers 45% but lacks agent intelligence | Alternatives | Differentiation opportunity |

### 3. Existing Tools That Solve Parts

| Tool | Overlap | What It Does | Gap AgentScope Fills |
|------|---------|--------------|---------------------|
| **DeepWiki** | 45% | AI-powered repo docs with Mermaid | No agent-specific parsing |
| **Mermaid MCP** | 40% | On-demand diagram generation | No auto-scanning |
| **Structurizr** | 35% | C4 architecture diagrams | Manual modeling required |
| **BMAD Method** | 35% | Defines agent configs | No visualization |
| **Claude Code Native** | 50-60% | Can do most things on-demand | No automation/standardization |

**Conclusion**: A combination of existing tools achieves 70-80% of AgentScope. The unique value is **automated multi-framework scanning with agent-specific intelligence**.

---

## Recommended Path Forward

### Option B: Lean MVP (4 Weeks) - RECOMMENDED

| Feature | Included | Excluded |
|---------|----------|----------|
| Claude Code scanner | Yes | BMad, Gemini, Claude-flow |
| MCP scanner | Yes | - |
| Component Map diagram | Yes | 4 other diagram types |
| Workflow Sequence diagram | Yes | - |
| README.md + AGENTS.md | Yes | 5 other doc files |
| CLI (scan, diagram) | Yes | compare, export, optimize |
| Watch mode | No | - |
| VS Code extension | No | - |
| Bidirectional export | No | - |

**Why 4 weeks?**
- Fast enough to validate product-market fit
- Claude Code + MCP covers 90%+ of target users
- 2 diagrams answer the essential question: "What do I have?"
- Can iterate based on real user feedback

### Post-MVP Roadmap (if validated)

| Version | Timeline | Features |
|---------|----------|----------|
| v1.1 | Weeks 5-6 | Add Hierarchy diagram, SKILLS.md |
| v1.2 | Weeks 7-8 | BMad scanner, DataFlow diagram |
| v1.3 | Weeks 9-10 | Workflow comparator, Claude Code skill |
| v2.0 | Weeks 11-16 | Gemini scanner, GitHub Action, consider VS Code |

---

## Recommended Tech Stack

Based on component research, use these battle-tested packages:

| Need | Package | Downloads/week |
|------|---------|----------------|
| CLI | Commander.js | 238M |
| YAML | js-yaml | 119M |
| Frontmatter | gray-matter | 3M |
| File discovery | globby | 90M |
| File I/O | fs-extra | 50M |
| Validation | Zod | 25M |
| Markdown | unified/remark | 20M |
| Templates | Handlebars | 12M |
| Diagrams | mermaid | 2M |

**Total runtime dependencies**: 11 packages (~151KB gzipped)
**Time savings**: 60-70% vs building from scratch

---

## Key Decisions Required

From the Questions document, these need stakeholder input:

### Must Decide Now

| # | Decision | Recommended Answer |
|---|----------|-------------------|
| 1 | Target audience | Individual developer (primary) |
| 2 | Framework priority | Claude Code only for v1 |
| 3 | Output format | Mermaid markdown (GitHub-native) |
| 6 | CLI vs library | CLI with library core |
| 12 | Error handling | Categorized (fatal/warning/info) |

### Can Defer

| # | Decision | Recommendation |
|---|----------|----------------|
| 7 | Watch mode | Skip - use CI/Git hooks instead |
| 8 | Workflow comparator | Phase 4 optional add-on |
| 9 | Export feature | One-way only with documented limitations |
| 13 | Plugin system | Phase 3 |

### Open Business Questions

1. **Pricing**: Free forever or freemium?
2. **Telemetry**: Collect anonymous usage data?
3. **Partnerships**: Coordinate with Claude Code team?
4. **Support model**: GitHub issues or community Discord?
5. **Sustainability**: Who maintains this long-term?

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Framework breaking changes | HIGH | Version pinning, plugin architecture, rapid response |
| Native competition | HIGH | Move fast, focus on cross-framework (unique value) |
| Maintenance burnout | HIGH | Define sustainable funding model before v1 |
| Unified model failure | MEDIUM | Loose coupling, plugin-based parsers |
| Adoption barriers | MEDIUM | Security audit, progressive disclosure |

---

## What to Remove from PRD

| Feature | Reason | Alternative |
|---------|--------|-------------|
| Gemini CLI scanner | <10% market share | Add post-MVP if requested |
| Claude-flow scanner | Niche framework | Add post-MVP if requested |
| Bidirectional export | Semantic impossibility | One-way export with warnings |
| VS Code extension | Premature optimization | CLI sufficient for v1 |
| Web viewer | GitHub renders Mermaid natively | Interactive version in v2 |
| Optimizer module | Undefined feature creep | Remove entirely |
| Community library | Needs user base first | Post-traction feature |
| Permission Matrix diagram | Rarely needed | On-demand generation |
| Hook Lifecycle diagram | Niche use case | On-demand generation |

---

## Success Metrics (Revised)

| Metric | Original Target | Revised Target | Rationale |
|--------|----------------|----------------|-----------|
| Scan Coverage | >95% | >95% of Claude Code configs | Focus on one framework first |
| Diagram Accuracy | 100% valid Mermaid | 100% valid + semantic review | Valid ≠ correct |
| Onboarding Time | 50% reduction | Measure baseline first | Can't measure without baseline |
| GitHub Stars | 1000+ in 6 months | 100+ in month 1 | Validate early |
| Framework Support | 5+ by v1.0 | 1 (Claude Code) + MCP | Quality over quantity |
| Performance | <5s scan | <3s for <50 components | Define the conditions |

---

## Research Documents Index

| Document | Purpose | Key Insight |
|----------|---------|-------------|
| [01-critical-analysis.md](./01-critical-analysis.md) | Find weaknesses | 20-week timeline is fantasy |
| [02-alternatives-comparison.md](./02-alternatives-comparison.md) | Compare existing tools | 70-80% achievable with tool combinations |
| [03-simplification-proposal.md](./03-simplification-proposal.md) | Reduce scope | 4-week MVP recommended |
| [04-component-solutions.md](./04-component-solutions.md) | Find npm packages | 60-70% time savings possible |
| [05-questions-and-decisions.md](./05-questions-and-decisions.md) | Decision framework | 14 key decisions mapped |

---

## Immediate Next Steps

1. **Decide**: Accept 4-week Lean MVP scope
2. **Validate**: Talk to 10+ Claude Code users before coding
3. **Setup**: Initialize project with recommended tech stack
4. **Build**: Week 1-4 implementation per simplification proposal
5. **Ship**: npm publish at end of week 4
6. **Learn**: Gather feedback, iterate

---

## Final Verdict

**AgentScope addresses a real problem** - teams genuinely struggle to understand their agent configurations.

**But the PRD is overambitious**:
- 5 frameworks when 1 covers 90% of users
- Bidirectional export that's technically infeasible
- 20-week timeline that's 3x too long
- Features nobody asked for (optimizer, web viewer)

**The winning strategy**:
1. Ship a Claude Code-only tool in 4 weeks
2. Validate with real users
3. Add frameworks based on demand
4. Keep the unique value: **automated multi-framework agent documentation**

**If you can only do one thing**: Build the Component Map diagram. It answers the fundamental question every developer has: "What agents, skills, hooks, and MCPs do I have?"

---

*Research conducted by 5-agent swarm: Critical Analyst, Alternatives Researcher, Simplification Expert, Component Architect, Questions Generator*
*Synthesized: January 2026*
