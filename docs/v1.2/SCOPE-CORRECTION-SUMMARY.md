# AgentScope v1.2 Scope Correction Summary

> **Critical Insight**: AgentScope scans **coding agents**, not infrastructure.

---

## The Problem

AgentScope v1.2 planning incorrectly included **DevContainer configuration scanning** as a core feature. This violates the product's fundamental purpose.

## The Solution

**Separate DevContainer scanning into its own product.**

---

## Quick Comparison

| AgentScope (Correct) | DevContainer Scanner (Separate Product) |
|----------------------|------------------------------------------|
| 🎯 **Target**: Coding agents | 🐳 **Target**: Container infrastructure |
| 📁 **Files**: `.claude/`, `CLAUDE.md`, `.mcp.json` | 📦 **Files**: `.devcontainer/devcontainer.json` |
| 🔐 **Security**: File parsing only | 🔒 **Security**: Docker runtime, image inspection |
| 👥 **Users**: AI agent developers | 🛠️ **Users**: DevOps, container engineers |
| 📦 **Dependencies**: None | 🐋 **Dependencies**: Docker daemon, VSCode APIs |

---

## What Changed

### Removed from v1.2

- ❌ DevContainer configuration scanning
- ❌ DevContainer security validation
- ❌ DevContainer lifecycle hooks
- ❌ Docker image inspection
- ❌ Container environment variable parsing

### Refocused in v1.2

- ✅ Claude Code settings deep scan (`.claude/settings.json`)
- ✅ CLAUDE.md enhanced parsing (agent documentation)
- ✅ Enhanced documentation output (agents, skills, hooks)
- ✅ Multi-file diagram support (large agent systems)
- ✅ Category-based documentation (agent types)
- ✅ Dataflow diagram enhancement (agent interactions)
- ✅ ADR template generation
- ✅ CONTEXT.md generation

---

## Timeline Impact

**No change**: Still 2-3 weeks

- **Reorganization**: 1 day (move DevContainer work to export package)
- **v1.2 Implementation**: 2-3 weeks (refocused on agent scanning)

---

## Benefits

1. **Clear Mission**: AgentScope = agent scanner, not infrastructure scanner
2. **Better Architecture**: No conflation of agent and container concerns
3. **Security Clarity**: Different threat models for agents vs containers
4. **User Focus**: AI developers, not DevOps engineers
5. **Maintainability**: Smaller, focused codebase
6. **Extensibility**: DevContainer scanner can be built separately

---

## For Users

### If You Expected DevContainer Scanning in v1.2

All DevContainer research and architecture is preserved in:
```
export/devcontainer-scanner/
```

You can build this as a separate project using our ADRs and design docs.

### If You Want Agent Scanning

v1.2 delivers **enhanced agent scanning** with:
- Deep `.claude/settings.json` parsing
- Enhanced `CLAUDE.md` parsing
- Better documentation output
- Multi-file diagram support
- Category-based organization

---

## Next Steps

1. **Reorganization** (1 day): Move DevContainer work to export package
2. **v1.2 Implementation** (2-3 weeks): Build agent-focused features
3. **Release**: AgentScope v1.2 as pure agent scanner

---

## Files

- **Detailed Plan**: `docs/v1.2/REORGANIZATION-PLAN.md`
- **Updated Master Plan**: `docs/v1.2/MASTER-PLAN.md` (to be updated)
- **Updated Roadmap**: `docs/v1.2/ROADMAP.md` (to be updated)
- **Export Package**: `export/devcontainer-scanner/` (to be created)

---

*AgentScope scans AGENTS, not containers.*
