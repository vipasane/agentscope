# Automated SDLC Documentation Frameworks & Agentic Patterns

> Deep research on documentation automation, event-driven architectures, and standards compliance for agentic environments

---

## Executive Summary

This research identifies automated documentation frameworks, industry standards, and event-driven patterns that AgentScope should implement. Key findings:

1. **Documentation is becoming agentic** - Tools like Mintlify, Swimm, and GitHub Copilot now auto-generate and maintain docs
2. **Event-driven documentation** - Git hooks, CDC, and event sourcing patterns keep docs fresh
3. **Standards convergence** - OpenAPI, AsyncAPI, CloudEvents, and llms.txt are emerging as universal standards
4. **AgentScope opportunity** - As a documentation tool, AgentScope should demonstrate best practices

---

## 1. Automated Documentation Tools

### 1.1 Changelog & Release Automation

| Tool | How It Works | Events Captured | Standard |
|------|--------------|-----------------|----------|
| **[semantic-release](https://semantic-release.gitbook.io/)** | Analyzes commits → auto-versions → publishes | `push`, `merge` | Conventional Commits |
| **[release-please](https://github.com/googleapis/release-please)** (Google) | Creates release PRs accumulating changes | `push` | Conventional Commits |
| **[changesets](https://github.com/changesets/changesets)** | Developers declare intent via `.changeset/` | PR creation | Custom format |
| **[auto](https://intuit.github.io/auto/)** (Intuit) | Semantic versioning + changelog | `push`, labels | SemVer |

**Recommendation**: `semantic-release` for single-package, `changesets` for monorepo

### 1.2 AI-Powered Documentation Platforms

| Tool | AI Features | Event Integration | llms.txt |
|------|-------------|-------------------|----------|
| **[Mintlify](https://mintlify.com/)** | AI writing agent, MCP integration | Webhooks, GitHub sync | ✅ Auto-generates |
| **[Swimm](https://swimm.io/)** | Doc-to-code linking, staleness detection | CI/CD hooks | ❌ |
| **[ReadMe.io](https://readme.com/)** | Owlbot AI (GPT-4), API testing | Webhooks | ❌ |
| **[GitBook](https://gitbook.com/)** | AI writing assistance | Git sync | ✅ Supported |
| **[GitHub Copilot](https://docs.github.com/copilot)** | Inline docstrings, PR summaries | Native GitHub | ❌ |

### 1.3 Developer Portal Solutions

| Platform | Auto-Discovery | Documentation | Best For |
|----------|---------------|---------------|----------|
| **[Backstage](https://backstage.io/)** (CNCF) | YAML catalog + plugins | TechDocs (MkDocs) | Open source, extensible |
| **[Port](https://getport.io/)** | Flexible data models | Custom | Enterprise customization |
| **[Cortex](https://cortex.io/)** | AI metadata generation | Scorecards | Fast setup |
| **[OpsLevel](https://opslevel.com/)** | AI discovery | Service catalog | Time-to-value |

---

## 2. Standards Landscape

### 2.1 De-facto Standards (Must Implement)

| Standard | Purpose | Adoption | AgentScope Status |
|----------|---------|----------|-------------------|
| **[Conventional Commits](https://conventionalcommits.org/)** | Structured commit messages | 90%+ of modern projects | ✅ Implemented |
| **[Keep a Changelog](https://keepachangelog.com/)** | Human-readable changelogs | Very high | ✅ Implemented |
| **[Semantic Versioning](https://semver.org/)** | Version numbering | Universal | ✅ Implemented |
| **[CommonMark](https://commonmark.org/)** / GFM | Markdown format | Universal | ✅ Using |

### 2.2 Industry Standards (Should Consider)

| Standard | Body | Purpose | Relevance |
|----------|------|---------|-----------|
| **[OpenAPI 3.x](https://openapis.org/)** | OpenAPI Initiative | REST API documentation | Document MCP server APIs |
| **[AsyncAPI](https://asyncapi.com/)** | AsyncAPI Initiative | Event-driven API docs | Document agent events |
| **[CloudEvents](https://cloudevents.io/)** | CNCF | Event data format | Standardize agent events |
| **[SPDX](https://spdx.dev/)** | Linux Foundation | Software Bill of Materials | Dependency tracking |
| **[OpenChain](https://openchainproject.org/)** | Linux Foundation | License compliance (ISO 5230) | License verification |

### 2.3 Security & Compliance Standards

| Standard | Purpose | Required By |
|----------|---------|-------------|
| **[OpenSSF Scorecard](https://scorecard.dev/)** | Security health metrics | CISA recommended |
| **[SLSA](https://slsa.dev/)** | Supply chain security | Growing adoption |
| **[CycloneDX](https://cyclonedx.org/)** | SBOM format (ECMA-424) | US Executive Order 2021 |
| **[REUSE](https://reuse.software/)** | License compliance | FSFE recommendation |

### 2.4 Emerging Standards (2025-2026)

| Standard | What It Is | Why It Matters |
|----------|-----------|----------------|
| **[llms.txt](https://llmstxt.org/)** | AI-friendly documentation discovery | 844,000+ sites adopted; Anthropic, Stripe, Vercel use it |
| **[OpenAPI Arazzo](https://github.com/OAI/Arazzo-Specification)** | API workflow documentation | Documents sequences of API calls |
| **[DORA Metrics](https://dora.dev/)** | DevOps performance measurement | Deployment frequency, lead time, MTTR, change failure rate |

---

## 3. Event-Driven Documentation Patterns

### 3.1 Git as Event Log

Git hooks provide native event-driven documentation:

| Hook | Trigger | Documentation Use |
|------|---------|-------------------|
| `pre-commit` | Before commit | Validate docs, lint markdown |
| `post-commit` | After commit | Auto-generate docs, update changelog |
| `pre-push` | Before push | Ensure docs are fresh |
| `post-merge` | After merge | Regenerate full documentation |

**Example pre-commit for documentation**:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: agentscope-scan
        name: Scan agent configurations
        entry: npx agentscope scan --validate
        language: system
        files: \.claude/.*|CLAUDE\.md|\.mcp\.json
```

### 3.2 Change Data Capture (CDC) Pattern

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Config    │────▶│    CDC      │────▶│    Docs     │
│   Change    │     │   Stream    │     │   Update    │
└─────────────┘     └─────────────┘     └─────────────┘
```

Applied to AgentScope:
- **Source**: `.claude/`, `CLAUDE.md`, `.mcp.json` changes
- **Stream**: Git commits as events
- **Sink**: Auto-updated documentation

### 3.3 Event Sourcing for Documentation

```typescript
// Every config change stored as immutable event
interface ConfigEvent {
  eventId: string;
  eventType: 'agent:created' | 'agent:modified' | 'agent:deleted' |
             'skill:added' | 'hook:registered' | 'mcp:connected';
  timestamp: Date;
  payload: any;
  actor: string; // who made the change
}

// Benefits:
// - Full audit trail
// - Point-in-time reconstruction
// - Debugging via event replay
```

### 3.4 Swimm's "Doc Freshness" Pattern

```
Code Change → CI Check → Doc Stale? → Build Fails
                              ↓
                         Update Required
```

**Implementation**:
```yaml
# .github/workflows/doc-freshness.yml
name: Documentation Freshness
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate documentation freshness
        run: |
          npx agentscope scan --output /tmp/current
          diff -r /tmp/current docs/agent-architecture || {
            echo "Documentation is stale! Run 'agentscope scan' to update."
            exit 1
          }
```

---

## 4. Agentic Documentation Architecture

### 4.1 Proposed Event Flow for AgentScope

```
┌──────────────────────────────────────────────────────────────────┐
│                     AgentScope Event Flow                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐                                                │
│   │  Git Event  │                                                │
│   │  (commit,   │                                                │
│   │   push)     │                                                │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │  Scanner    │────▶│   Events    │────▶│   Docs      │       │
│   │  Module     │     │  (Cloud-    │     │  Generator  │       │
│   │             │     │   Events)   │     │             │       │
│   └─────────────┘     └──────┬──────┘     └──────┬──────┘       │
│                              │                    │               │
│                              ▼                    ▼               │
│                       ┌─────────────┐     ┌─────────────┐       │
│                       │  Event      │     │  Output     │       │
│                       │  Log        │     │  - README   │       │
│                       │  (audit)    │     │  - AGENTS   │       │
│                       └─────────────┘     │  - llms.txt │       │
│                                           │  - OpenAPI  │       │
│                                           └─────────────┘       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Events AgentScope Should Emit

```typescript
// CloudEvents-formatted events
interface AgentScopeEvent {
  specversion: '1.0';
  type: string;
  source: '/agentscope';
  id: string;
  time: string;
  data: any;
}

// Event types
const EVENTS = {
  // Scan lifecycle
  'io.agentscope.scan.started': { path: string },
  'io.agentscope.scan.completed': { config: Config, duration: number },
  'io.agentscope.scan.failed': { error: string },

  // Discovery events
  'io.agentscope.agent.discovered': { agent: Agent },
  'io.agentscope.skill.discovered': { skill: Skill },
  'io.agentscope.hook.discovered': { hook: Hook },
  'io.agentscope.mcp.discovered': { server: MCPServer },

  // Documentation events
  'io.agentscope.docs.generated': { files: string[] },
  'io.agentscope.diagram.generated': { type: string },

  // Validation events
  'io.agentscope.validation.warning': { message: string },
  'io.agentscope.validation.error': { message: string },
};
```

### 4.3 llms.txt Generation

AgentScope should auto-generate `/llms.txt` for AI assistants:

```markdown
# AgentScope Project

> Agent Architecture Documentation & Visualization Tool

## Quick Start
- Install: npm install -g agentscope
- Run: agentscope scan

## Documentation
- /docs/AgentScope-PRD-v2.md: Product Requirements
- /docs/CHANGELOG.md: Version history
- /docs/DEFINITION_OF_DONE.md: Quality checklist

## Agent Configurations
- /.claude/agents/: Agent definitions
- /.claude/skills/: Skill definitions
- /CLAUDE.md: Project configuration

## API Reference
- /docs/api/scanner.md: Scanner module API
- /docs/api/generator.md: Generator module API
```

---

## 5. Compliance Library Recommendations

### 5.1 Must-Have Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **[commitlint](https://commitlint.js.org/)** | Validate commit messages | Git hook |
| **[semantic-release](https://semantic-release.gitbook.io/)** | Automated versioning | CI/CD |
| **[TypeDoc](https://typedoc.org/)** | API documentation | Build step |
| **[danger.js](https://danger.systems/js/)** | PR automation | GitHub Action |

### 5.2 Should-Have Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **[REUSE](https://reuse.software/)** | License compliance | CI check |
| **[all-contributors](https://allcontributors.org/)** | Contributor recognition | Bot |
| **[OpenSSF Scorecard](https://scorecard.dev/)** | Security scoring | GitHub Action |
| **[CycloneDX](https://cyclonedx.org/)** | SBOM generation | Build step |

### 5.3 Future Consideration

| Tool | Purpose | When |
|------|---------|------|
| **AsyncAPI Generator** | Event documentation | When events stabilize |
| **Backstage Plugin** | Portal integration | Enterprise demand |
| **SLSA Provenance** | Supply chain | v1.0+ |

---

## 6. Implementation Roadmap for AgentScope

### Phase 1: Foundation (Current)
- ✅ Conventional Commits (commitlint)
- ✅ Keep a Changelog
- ✅ DCO sign-off
- ✅ Definition of Done

### Phase 2: Automation (Next)
- [ ] semantic-release for auto-versioning
- [ ] TypeDoc for API documentation
- [ ] OpenSSF Scorecard badge
- [ ] danger.js for PR quality

### Phase 3: Events (v1.0)
- [ ] CloudEvents-formatted output
- [ ] llms.txt generation
- [ ] Event log / audit trail
- [ ] Doc freshness validation (Swimm pattern)

### Phase 4: Standards (v1.1+)
- [ ] OpenAPI for CLI/MCP APIs
- [ ] AsyncAPI for events
- [ ] REUSE compliance
- [ ] CycloneDX SBOM
- [ ] Backstage catalog export

---

## 7. Summary: Standards AgentScope Should Follow

### As a Documentation Tool (Lead by Example)

| Category | Standard | Why |
|----------|----------|-----|
| **Commits** | Conventional Commits | Enables automation |
| **Versioning** | Semantic Versioning | Clear compatibility |
| **Changelog** | Keep a Changelog | Human-readable history |
| **Licensing** | SPDX identifiers | Machine-readable |
| **Events** | CloudEvents | Interoperability |
| **AI Discovery** | llms.txt | Future-proofing |
| **API Docs** | OpenAPI/AsyncAPI | Industry standard |
| **Security** | OpenSSF Scorecard | Trust signal |

### As an Open Source Project (Best Practices)

| Practice | Implementation |
|----------|---------------|
| DCO Sign-off | Required on all commits |
| Code of Conduct | Contributor Covenant |
| Security Policy | SECURITY.md |
| Contributing Guide | CONTRIBUTING.md |
| PR Templates | Quality checklist |
| CI/CD | GitHub Actions |

---

## Sources

### Documentation Tools
- [semantic-release](https://semantic-release.gitbook.io/)
- [release-please](https://github.com/googleapis/release-please)
- [changesets](https://github.com/changesets/changesets)
- [Mintlify](https://mintlify.com/)
- [Swimm](https://swimm.io/)
- [Backstage](https://backstage.io/)

### Standards
- [Conventional Commits](https://conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [OpenAPI](https://openapis.org/)
- [AsyncAPI](https://asyncapi.com/)
- [CloudEvents](https://cloudevents.io/)
- [llms.txt](https://llmstxt.org/)
- [SPDX](https://spdx.dev/)
- [REUSE](https://reuse.software/)
- [OpenSSF Scorecard](https://scorecard.dev/)
- [SLSA](https://slsa.dev/)
- [CycloneDX](https://cyclonedx.org/)
- [DORA Metrics](https://dora.dev/)

### Event-Driven Architecture
- [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CDC in Microservices](https://orkes.io/blog/change-data-capture-cdc-in-event-driven-microservices/)
- [Git Hooks](https://git-scm.com/docs/githooks)

### Industry Reports
- [Document360 - AI Documentation Trends 2026](https://document360.com/blog/ai-documentation-trends/)
- [The New Stack - Agentic Development Trends](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)

---

*Research Date: January 2026*
