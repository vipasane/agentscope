# Comparison Tables

[← Back to Overview](./README-example.md)

Dense tables for at-a-glance comparison of all agents.

---

## Master Agent Table

| # | Agent | Cat | Type | Deleg | Tools | Skills | Path |
|--:|-------|:---:|:----:|:-----:|:-----:|:------:|------|
| 1 | pr-manager | 🐙 | 👑 | 3 | 1 | 1 | [→](# "github/pr-manager.md") |
| 2 | code-review-swarm | 🐙 | 🤖 | 0 | 1 | 1 | [→](# "github/code-review.md") |
| 3 | issue-tracker | 🐙 | 🤖 | 0 | 1 | 0 | [→](# "github/issue-tracker.md") |
| 4 | release-manager | 🐙 | 🤖 | 0 | 1 | 0 | [→](# "github/release-manager.md") |
| 5 | security-auditor | 🔒 | 🎯 | 0 | 0 | 0 | [→](# "security/auditor.md") |
| 6 | pii-detector | 🔒 | 🎯 | 0 | 0 | 0 | [→](# "security/pii.md") |
| 7 | claims-authorizer | 🔒 | 🎯 | 0 | 0 | 0 | [→](# "security/claims.md") |
| 8 | planner | 💻 | 👑 | 3 | 0 | 1 | [→](# "development/planner.md") |
| 9 | coder | 💻 | 🤖 | 0 | 1 | 1 | [→](# "development/coder.md") |
| 10 | backend-dev | 💻 | 🤖 | 0 | 0 | 0 | [→](# "development/backend.md") |
| 11 | ml-developer | 💻 | 🤖 | 0 | 0 | 0 | [→](# "development/ml.md") |
| 12 | tester | 🧪 | 🤖 | 0 | 0 | 1 | [→](# "testing/tester.md") |
| 13 | reviewer | 🧪 | 🔍 | 0 | 0 | 0 | [→](# "testing/reviewer.md") |
| 14 | production-validator | 🧪 | 🤖 | 0 | 0 | 0 | [→](# "testing/validator.md") |

**Legend:** Cat=Category | Deleg=Delegates count | 👑=Coordinator | 🤖=Worker | 🔍=Reviewer | 🎯=Specialist

---

## Capabilities Matrix

| Agent | Code | Test | Review | Deploy | Secure | API | ML |
|-------|:----:|:----:|:------:|:------:|:------:|:---:|:--:|
| pr-manager | | | ✓ | ✓ | | | |
| code-review-swarm | | | ✓ | | | | |
| issue-tracker | | | | | | | |
| release-manager | | | | ✓ | | | |
| security-auditor | | | ✓ | | ✓ | | |
| pii-detector | | | | | ✓ | | |
| claims-authorizer | | | | | ✓ | ✓ | |
| planner | | | | | | | |
| coder | ✓ | | | | | | |
| backend-dev | ✓ | | | | | ✓ | |
| ml-developer | ✓ | | | | | | ✓ |
| tester | | ✓ | | | | | |
| reviewer | | | ✓ | | | | |
| production-validator | | ✓ | ✓ | | | | |

---

## Category Breakdown

| Category | 👑 | 🤖 | 🔍 | 🎯 | Total | % |
|----------|---:|---:|---:|---:|------:|--:|
| 🐙 GitHub | 1 | 3 | 0 | 0 | 4 | 29% |
| 🔒 Security | 0 | 0 | 0 | 3 | 3 | 21% |
| 💻 Development | 1 | 3 | 0 | 0 | 4 | 29% |
| 🧪 Testing | 0 | 2 | 1 | 0 | 3 | 21% |
| **Total** | **2** | **8** | **1** | **3** | **14** | 100% |

---

## Delegation Graph (Adjacency Matrix)

|   | pr-mgr | planner | coder | tester | reviewer | cr-swarm |
|---|:------:|:-------:|:-----:|:------:|:--------:|:--------:|
| **pr-mgr** | — | | → | | → | → |
| **planner** | | — | → | → | → | |
| **coder** | | | — | | | |
| **tester** | | | | — | | |
| **reviewer** | | | | | — | |
| **cr-swarm** | | | | | | — |

`→` = delegates to

---

## Tool Usage Matrix

| Agent | claude-flow | github | filesystem | browser |
|-------|:-----------:|:------:|:----------:|:-------:|
| pr-manager | | ✓ | | |
| code-review-swarm | | ✓ | | |
| issue-tracker | | ✓ | | |
| release-manager | | ✓ | | |
| coder | ✓ | | ✓ | |
| backend-dev | ✓ | | ✓ | |

---

## Skill Usage Matrix

| Agent | github-code-review | sparc-methodology | pair-programming | verification |
|-------|:------------------:|:-----------------:|:----------------:|:------------:|
| pr-manager | ✓ | | | |
| code-review-swarm | ✓ | | | |
| planner | | ✓ | | |
| coder | | | ✓ | |
| tester | | | | ✓ |
| reviewer | | | | ✓ |

---

## Ultra-Compact: All-in-One

```
AGENTS (14)
─────────────────────────────────────────────────────────────────────
🐙 GITHUB (4)
  👑 pr-manager ───→ code-review-swarm, coder, reviewer  [github]
  🤖 code-review-swarm                                    [github]
  🤖 issue-tracker                                        [github]
  🤖 release-manager                                      [github]

🔒 SECURITY (3)
  🎯 security-auditor   CVE, OWASP scanning
  🎯 pii-detector       PII, secrets detection
  🎯 claims-authorizer  RBAC validation

💻 DEVELOPMENT (4)
  👑 planner ─────→ coder, tester, reviewer              [sparc]
  🤖 coder                                          [claude-flow, pair]
  🤖 backend-dev                                    [claude-flow]
  🤖 ml-developer

🧪 TESTING (3)
  🤖 tester                                         [verification]
  🔍 reviewer                                       [verification]
  🤖 production-validator

─────────────────────────────────────────────────────────────────────
MCP: claude-flow ✓ | github ✓
SKILLS: github-code-review | sparc-methodology | pair-programming | verification
```

---

## Stats Summary

| Metric | Value |
|--------|------:|
| Total Agents | 14 |
| Coordinators | 2 (14%) |
| Workers | 8 (57%) |
| Reviewers | 1 (7%) |
| Specialists | 3 (21%) |
| Delegation Edges | 6 |
| Tool Connections | 6 |
| Skill Connections | 6 |
| MCP Servers | 2 |
| Skills | 4 |

---

[← Back to Overview](./README-example.md)
