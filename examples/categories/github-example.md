# 🐙 GitHub Agents

[← Back to Overview](../README-example.md) | [↑ Component Map](../component-map-example.md) | [→ Security](./security-example.md)

---

## Summary

| Metric | Value |
|--------|------:|
| Total Agents | 4 |
| Coordinators | 1 |
| Workers | 3 |

---

## Category Diagram

```mermaid
graph TB
    subgraph github["🐙 GitHub Agents"]
        pr_manager["👑 pr-manager<br/><i>PR lifecycle</i>"]
        code_review["🤖 code-review-swarm<br/><i>Multi-agent review</i>"]
        issue_tracker["🤖 issue-tracker<br/><i>Issue management</i>"]
        release_manager["🤖 release-manager<br/><i>Release automation</i>"]
    end

    pr_manager -->|delegates| code_review
    pr_manager -.->|uses| github_mcp["🔌 github MCP"]

    classDef coord fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef mcp fill:#fce4ec,stroke:#880e4f
    class pr_manager coord
    class code_review,issue_tracker,release_manager worker
    class github_mcp mcp
```

---

## Agents Detail

| Agent | Type | Delegates To | MCP Tools | Defined In |
|-------|------|--------------|-----------|------------|
| pr-manager | 👑 Coordinator | code-review-swarm | github | [→](.claude/agents/github/pr-manager.md) |
| code-review-swarm | 🤖 Worker | — | github | [→](.claude/agents/github/code-review-swarm.md) |
| issue-tracker | 🤖 Worker | — | github | [→](.claude/agents/github/issue-tracker.md) |
| release-manager | 🤖 Worker | — | github | [→](.claude/agents/github/release-manager.md) |

---

## Relationships

### Incoming (delegated from other categories)

| From Agent | From Category | Relationship |
|------------|---------------|--------------|
| planner | 💻 Development | delegates to pr-manager |

### Outgoing (delegates to other categories)

| To Agent | To Category | Relationship |
|----------|-------------|--------------|
| coder | 💻 Development | pr-manager delegates |
| reviewer | 🧪 Testing | pr-manager delegates |

---

## Related Skills

| Skill | Used By |
|-------|---------|
| [github-code-review](../skills/github-code-review.md) | pr-manager, code-review-swarm |

---

## Cross-References

| Related Categories | Link |
|--------------------|------|
| 🔒 Security (audits PRs) | [→ security.md](./security-example.md) |
| 💻 Development (creates PRs) | [→ development.md](#) |
| 🧪 Testing (validates PRs) | [→ testing.md](#) |

---

[← Back to Overview](../README-example.md)
