# Agent Hierarchy

[← Back to Overview](./README-example.md) | [← Component Map](./component-map-example.md)

---

## Delegation Tree

```mermaid
graph TB
    %% Agent Hierarchy - Delegation Chains

    %% Root coordinators (no incoming delegations)
    planner["👑 planner<br/><i>Task orchestration</i>"]
    pr_manager["👑 pr-manager<br/><i>PR lifecycle</i>"]

    %% Delegation chains
    planner -->|delegates| coder["🤖 coder"]
    planner -->|delegates| tester["🤖 tester"]
    planner -->|delegates| reviewer["🔍 reviewer"]

    pr_manager -->|delegates| code_review_swarm["🤖 code-review-swarm"]
    pr_manager -->|delegates| coder
    pr_manager -->|delegates| reviewer

    %% Standalone agents (no delegations)
    subgraph standalone["Standalone Agents"]
        security_auditor["🎯 security-auditor"]
        pii_detector["🎯 pii-detector"]
        backend_dev["🤖 backend-dev"]
        issue_tracker["🤖 issue-tracker"]
    end

    %% Styling
    classDef root fill:#1a237e,stroke:#7986cb,color:#fff,stroke-width:3px
    classDef coord fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef worker fill:#f3e5f5,stroke:#4a148c
    classDef reviewer fill:#fff3e0,stroke:#e65100
    classDef specialist fill:#e8f5e9,stroke:#1b5e20

    class planner,pr_manager root
    class coder,tester,code_review_swarm,backend_dev,issue_tracker worker
    class reviewer reviewer
    class security_auditor,pii_detector specialist
```

---

## Hierarchy Table

### Root Coordinators (Entry Points)

| Coordinator | Delegates To | Total Chain Depth |
|-------------|--------------|------------------:|
| 👑 planner | coder, tester, reviewer | 1 |
| 👑 pr-manager | code-review-swarm, coder, reviewer | 1 |

### Delegation Chains

| From | To | Relationship | Chain |
|------|----|--------------| ------|
| planner | coder | direct | planner → coder |
| planner | tester | direct | planner → tester |
| planner | reviewer | direct | planner → reviewer |
| pr-manager | code-review-swarm | direct | pr-manager → code-review-swarm |
| pr-manager | coder | direct | pr-manager → coder |
| pr-manager | reviewer | direct | pr-manager → reviewer |

### Shared Workers (Multiple Parents)

| Worker | Delegated By | Conflict Resolution |
|--------|--------------|---------------------|
| coder | planner, pr-manager | First-come-first-served |
| reviewer | planner, pr-manager | Queue-based |

### Standalone Agents (No Delegations)

| Agent | Category | Trigger |
|-------|----------|---------|
| security-auditor | 🔒 Security | PR events, manual |
| pii-detector | 🔒 Security | Pre-commit hook |
| backend-dev | 💻 Development | Manual spawn |
| issue-tracker | 🐙 GitHub | Issue events |

---

## Depth Analysis

| Depth Level | Agents | % of Total | Examples |
|-------------|-------:|-----------:|---------|
| 0 (Root) | 2 | 14% | planner, pr-manager |
| 1 (Worker) | 4 | 29% | coder, tester, reviewer, code-review-swarm |
| Standalone | 8 | 57% | security-auditor, pii-detector, claims-authorizer, backend-dev, ml-developer, issue-tracker, release-manager, production-validator |

### Metrics

| Metric | Value |
|--------|------:|
| Total delegation edges | 6 |
| Shared workers | 2 |
| Max chain depth | 1 |
| Avg fan-out (coordinators) | 3.0 |
| Root coordinators | 2 |
| Standalone agents | 8 |

---

[← Back to Overview](./README-example.md)
