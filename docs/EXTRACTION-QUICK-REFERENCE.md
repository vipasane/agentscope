# V1.2 Extraction Quick Reference

**TL;DR:** Extract 80% of v1.2 work to separate DevContainer Scanner project.

---

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      V1.2 WORK ANALYSIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL: ~8,764 lines of code + docs                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ EXTRACT (80%): DevContainer Scanner  │ ~7,000 lines    │    │
│  │────────────────────────────────────────────────────────│    │
│  │ • 6 ADRs (5,361 lines)                                  │    │
│  │ • Research (815 lines)                                  │    │
│  │ • Security docs (638 lines)                             │    │
│  │ • Source code (900 lines)                               │    │
│  │ • Examples (650 lines)                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│                  New Standalone Project                          │
│                  @devcontainer/scanner                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ KEEP (20%): Agent-Focused Work   │ Existing v1.1 only  │    │
│  │────────────────────────────────────────────────────────│    │
│  │ • .claude/ scanners (existing)                          │    │
│  │ • Agent visualization (existing)                        │    │
│  │ • Mermaid generators (existing)                         │    │
│  │ + NEW: claude-md-parser.ts                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│                    AgentScope v1.1.1                             │
│                  @vipasane/agentscope                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Extract

### 📂 Documentation (6,814 lines)

```bash
# ADRs (Architecture Decision Records)
docs/adr/ADR-008-devcontainer-scanner.md           → EXTRACT (734 lines)
docs/adr/ADR-008-devcontainer-scanning.md          → EXTRACT (759 lines)
docs/adr/DDD-002-devcontainer-domain.md            → EXTRACT (1,644 lines)
docs/adr/ADR-011-devcontainer-security.md          → EXTRACT (575 lines)
docs/adr/ADR-009-devcontainer-lifecycle-hooks.md   → EXTRACT (998 lines)
docs/adr/SUMMARY-v1.2-devcontainer-architecture.md → EXTRACT (651 lines)

# Research
docs/research/devcontainer-analysis.md             → EXTRACT (815 lines)

# Security
docs/security/DEVCONTAINER-SECURITY-README.md      → EXTRACT (638 lines)
```

### 💻 Source Code (~900 lines)

```bash
src/core/security/devcontainer-validators.ts       → EXTRACT (~500 lines)
src/core/security/devcontainer-sanitizers.ts       → EXTRACT (~400 lines)
```

### 📝 Examples (~650 lines)

```bash
examples/devcontainer-scanning.ts                  → EXTRACT (~150 lines)
examples/devcontainer-implementation-example.md    → EXTRACT (~500 lines)
```

---

## Files to Keep

### ✅ AgentScope Core (Existing)

```bash
src/core/scanners/settings-scanner.ts     ✅ KEEP (agent configs)
src/core/scanners/permission-parser.ts    ✅ KEEP (agent permissions)
src/core/scanners/plugin-parser.ts        ✅ KEEP (agent plugins)
src/core/scanners/hook-parser.ts          ✅ KEEP (agent hooks)
src/core/generators/mermaid-generators.ts ✅ KEEP (agent diagrams)
```

### 🆕 To Add

```bash
src/core/scanners/claude-md-parser.ts     🆕 ADD (parse CLAUDE.md)
```

---

## Decision Matrix

| Question | Answer → Action |
|----------|-----------------|
| **Does this file parse `.devcontainer/`?** | Yes → EXTRACT |
| **Does this file parse `.claude/`?** | Yes → KEEP |
| **Is this container security?** | Yes → EXTRACT |
| **Is this agent configuration?** | Yes → KEEP |
| **Is this DDD for DevContainers?** | Yes → EXTRACT |
| **Is this DDD for agents?** | Yes → KEEP |

---

## Export Folder Structure

```
/workspaces/agentscope-export/
├── devcontainer-scanner/              # New standalone project
│   ├── README.md                      # Project overview
│   ├── package.json                   # @devcontainer/scanner
│   ├── tsconfig.json
│   ├── src/
│   │   ├── core/
│   │   │   ├── model/                 # Domain types from DDD-002
│   │   │   ├── parsers/               # DevContainer JSON parsing
│   │   │   ├── scanners/              # Security scanning
│   │   │   ├── validators/            # devcontainer-validators.ts
│   │   │   ├── sanitizers/            # devcontainer-sanitizers.ts
│   │   │   ├── generators/            # Documentation generation
│   │   │   └── lifecycle/             # Container lifecycle
│   │   ├── cli/
│   │   │   └── commands/
│   │   │       ├── scan.ts            # devcontainer-scan
│   │   │       ├── docs.ts            # devcontainer-docs
│   │   │       └── validate.ts        # devcontainer-validate
│   │   └── index.ts                   # Public API
│   ├── docs/
│   │   ├── adr/                       # All 6 extracted ADRs
│   │   ├── research/                  # devcontainer-analysis.md
│   │   └── security/                  # DEVCONTAINER-SECURITY-README.md
│   ├── examples/
│   │   └── scanning-example.ts        # devcontainer-scanning.ts
│   └── tests/
│       └── security/
│           └── devcontainer-security.test.ts
└── migration-guide.md                 # Integration guide (if needed)
```

---

## CLI Commands

### DevContainer Scanner (New)

```bash
# Scan configuration
devcontainer-scan .devcontainer/devcontainer.json

# Generate documentation
devcontainer-docs .devcontainer --output docs/

# Validate only
devcontainer-validate .devcontainer/devcontainer.json --security-only
```

### AgentScope (Existing)

```bash
# Scan agent configs (existing)
agentscope scan .claude/

# Generate agent diagrams (existing)
agentscope diagram .claude/ --output docs/
```

---

## Timeline

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| **1** | Extract & Setup | DevContainer Scanner repo created |
| **2** | Complete Implementation | DevContainer Scanner v1.0.0 published |
| **3** | Refocus AgentScope | AgentScope v1.1.1 (agent-focused) |
| **4** | Documentation | Integration guide, announcements |

**Total:** 4 weeks

---

## Integration Example (Optional)

If AgentScope wants to use DevContainer Scanner:

```typescript
// package.json
{
  "dependencies": {
    "@devcontainer/scanner": "^1.0.0"
  }
}

// src/integration/devcontainer-bridge.ts
import { scanDevContainer } from '@devcontainer/scanner';

export async function scanComplete(rootPath: string) {
  const agentScan = await scanAgentScope('.claude');
  const devContainerScan = await scanDevContainer('.devcontainer');

  return {
    agents: agentScan,
    devcontainer: devContainerScan,
    timestamp: new Date()
  };
}
```

---

## Key Metrics

### Extraction Size

| Category | Lines | Percentage |
|----------|-------|------------|
| Documentation | 6,814 | 77.7% |
| Source Code | 900 | 10.3% |
| Examples | 650 | 7.4% |
| Tests | 400 | 4.6% |
| **Total** | **8,764** | **100%** |

### Project Focus

| Project | Focus | Target Users |
|---------|-------|--------------|
| **DevContainer Scanner** | Container security | All DevContainer users |
| **AgentScope** | Agent configuration | Claude Code users |

---

## Next Steps

1. **Review** this extraction plan
2. **Approve** or request changes
3. **Create** export folder structure
4. **Move** files to new DevContainer Scanner project
5. **Refocus** AgentScope on agent scanning

---

## Questions?

**Q: Will we lose functionality?**
A: No. DevContainer Scanner still available as NPM dependency.

**Q: Can we integrate them later?**
A: Yes. Simple import: `import { scanDevContainer } from '@devcontainer/scanner'`

**Q: What about maintenance?**
A: Two focused projects are easier to maintain than one unfocused project.

**Q: What if users want both?**
A: They can install both packages, or AgentScope can integrate DevContainer Scanner.

---

**Status:** ✅ Quick Reference Complete
**See Also:**
- [Full Inventory](./v1.2-SEPARATION-INVENTORY.md)
- [Detailed Recommendations](./V1.2-EXTRACTION-RECOMMENDATIONS.md)
