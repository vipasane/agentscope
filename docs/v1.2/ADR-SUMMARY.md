# AgentScope v1.2 ADR Summary

> **Last Updated**: 2026-01-25
> **Status**: Scope Corrected - Agent Scanning Only

---

## Executive Summary

AgentScope v1.2 has been **refocused on agent configuration scanning and security** after recognizing that DevContainer scanning belongs in a separate product domain.

### Key Changes

1. ✅ **Scope Clarification**: Agent scanning only (no DevContainer features)
2. ✅ **Security Focus**: Three new security ADRs addressing critical gaps
3. ✅ **DevContainer Separation**: Moved to standalone `devcontainer-scanner` project
4. ✅ **Agent-First Approach**: All features support agent architecture documentation

---

## ADR Status Overview

### ✅ Accepted (1)

| ADR | Title | Impact | Description |
|-----|-------|--------|-------------|
| **ADR-015** | **Scope Correction - Agent Scanning Only** | **Critical** | Defines product boundaries: agents IN, containers OUT |

### 📋 Proposed (7)

| ADR | Title | Impact | Category |
|-----|-------|--------|----------|
| ADR-011 | Multi-File Documentation Strategy | High | Documentation |
| ADR-012 | Category Detection & Auto-Categorization | Medium | Documentation |
| ADR-013 | Data Flow Visualization | Low | Documentation |
| ADR-014 | ADR & CONTEXT.md Template Generation | Low | Documentation |
| **ADR-016** | **Claude Code Security Validation** | **Critical** | **Security** |
| **ADR-017** | **CLAUDE.md Prompt Injection Detection** | **Critical** | **Security** |
| **ADR-018** | **MCP Server Security Scanning** | **High** | **Security** |

### ❌ Superseded (2)

| ADR | Title | Reason | New Home |
|-----|-------|--------|----------|
| ADR-008 | DevContainer Scanning | Out of scope | devcontainer-scanner project |
| ADR-009 | DevContainer Lifecycle Hooks | Out of scope | devcontainer-scanner project |

### 🔄 Updated (1)

| ADR | Title | Changes |
|-----|-------|---------|
| ADR-010 | Security Model v1.2 | Removed DevContainer portions, focused on agent config security |

---

## Security ADRs (New Focus)

### ADR-016: Claude Code Security Validation

**Attack Surfaces Covered**:
- Agent configuration files (`.claude/agents/*.md`, `*.yaml`)
- Skills configuration (`.claude/skills/`)
- Settings configuration (`.claude/settings.json`)
- Agent prompts and instructions

**5-Layer Security Model**:
1. **Schema Validation** - Zod-based type checking
2. **Command Safety** - Dangerous command detection
3. **Path Validation** - Directory traversal prevention
4. **Secret Detection** - Credential leakage prevention
5. **Prompt Injection** - Instruction hijacking detection

**CVEs Addressed**: CVE-AGENTSCOPE-001, CVE-AGENTSCOPE-002

---

### ADR-017: CLAUDE.md Prompt Injection Detection

**Target Files**:
- `CLAUDE.md` (repository root)
- `.claude/CLAUDE.md` (agent directory)

**3-Tier Detection System**:
1. **Structural Analysis** - Hidden sections, encoding, obfuscation
2. **Semantic Analysis** - Instruction override, role manipulation, context escape
3. **Behavioral Analysis** - Data exfiltration intent, malicious commands

**CVEs Addressed**: CVE-AGENTSCOPE-003, CVE-AGENTSCOPE-004, CVE-AGENTSCOPE-005, CVE-AGENTSCOPE-006

**Enforcement Levels**:
- **BLOCK**: Critical issues (instruction override, data exfiltration)
- **QUARANTINE**: Multiple high-severity issues
- **WARN**: Medium-severity issues
- **SAFE**: No critical/high issues

---

### ADR-018: MCP Server Security Scanning

**Target Configuration**: `.mcp.json` (MCP servers)

**4-Layer Validation System**:
1. **Configuration Validation** - Schema, paths, secrets
2. **Command Safety Analysis** - Dangerous commands, injection
3. **Server Reputation Check** - Known-safe list, package verification
4. **Runtime Behavior Monitoring** (future v1.3)

**Reputation System**:
- ✅ **Verified**: Official MCP servers from `@modelcontextprotocol/`
- ⚠️ **Trusted Org**: Packages from `@anthropic-ai/`, `@modelcontextprotocol/`
- ❌ **Unknown**: Third-party packages (manual verification required)
- 🚫 **Malicious**: Known bad actors (blocked)

**Risk Detection**:
- Command execution vulnerabilities
- Path traversal attacks
- Secret leakage in environment variables
- Untrusted npm packages

---

## Implementation Timeline

### v1.2 Alpha (Week 1-2)

- [ ] Implement ADR-016 (Agent Config Security)
- [ ] Implement ADR-017 (CLAUDE.md Security)
- [ ] Implement ADR-018 (MCP Server Security)
- [ ] Update documentation to reflect scope change

### v1.2 Beta (Week 3-4)

- [ ] Security testing and penetration testing
- [ ] False positive tuning
- [ ] CLI integration for all security scans
- [ ] Security report generation

### v1.2 GA (Week 5-6)

- [ ] Implement ADR-011 (Multi-File Docs)
- [ ] Implement ADR-012 (Category Detection)
- [ ] Final documentation and examples
- [ ] Release announcement

---

## Metrics and Success Criteria

### Security Coverage

| Metric | Target | Status |
|--------|--------|--------|
| Attack surfaces covered | 100% (3/3) | 🟢 Planned |
| Known CVEs addressed | 100% (6/6) | 🟢 Planned |
| False positive rate | <5% | 🟡 TBD |
| Detection accuracy | >95% | 🟡 TBD |

### Documentation Quality

| Metric | Target | Status |
|--------|--------|--------|
| ADR completeness | 100% | 🟢 Complete |
| Code examples | 10+ per ADR | 🟢 Complete |
| Threat modeling | All ADRs | 🟢 Complete |

### User Satisfaction

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scope clarity | >90% | Post-release survey |
| Security value | >85% | User feedback |
| False alarm acceptance | >80% | Issue tracker |

---

## Related Documentation

### Core ADRs

- **[ADR-015](./ADR-015-scope-correction-agent-scanning-only.md)**: Scope Correction (READ FIRST)
- **[ADR-016](./ADR-016-claude-code-security-validation.md)**: Agent Config Security
- **[ADR-017](./ADR-017-claude-md-prompt-injection-detection.md)**: CLAUDE.md Security
- **[ADR-018](./ADR-018-mcp-server-security-scanning.md)**: MCP Server Security

### Supporting ADRs

- [ADR-011](./ADR-011-multi-file-documentation.md): Multi-File Documentation
- [ADR-012](./ADR-012-category-detection.md): Category Detection
- [ADR-013](./ADR-013-dataflow-visualization.md): Data Flow Visualization
- [ADR-014](./ADR-014-template-generation.md): Template Generation
- [ADR-010](../adr/ADR-010-security-model-v12.md): Security Model (updated)

### Superseded (Archive)

- [ADR-008](../adr/ADR-008-devcontainer-scanning.md): DevContainer Scanning (superseded)
- [ADR-009](../adr/ADR-009-devcontainer-lifecycle-hooks.md): DevContainer Lifecycle (superseded)

---

## Migration Notes

### For Users

**What's Changing**:
- AgentScope will NOT scan DevContainers in v1.2
- Focus is 100% on agent configurations
- New security scanning features for agents

**What to Do**:
- If you need DevContainer scanning, watch for `devcontainer-scanner` project (Q2 2026)
- Update expectations: AgentScope = agent architecture only
- Enable new security scans for better agent validation

### For Contributors

**Code Changes**:
- Remove all DevContainer-specific code
- Implement security validators (ADR-016, ADR-017, ADR-018)
- Update tests to focus on agent scanning

**Documentation Changes**:
- Update README to clarify scope
- Remove DevContainer examples
- Add security scanning examples

---

## Frequently Asked Questions

### Why remove DevContainer scanning?

**Short answer**: Wrong product domain.

**Long answer**: AgentScope excels at agent architecture documentation. DevContainers are infrastructure configuration and belong in a dedicated tool. Trying to do both would dilute focus and create a mediocre product instead of an excellent one.

### Will DevContainer scanning come back?

No, but a **separate** `devcontainer-scanner` project will launch in Q2 2026 with the same quality standards. It will be:
- Dedicated to container configuration
- Better integrated with Docker ecosystem
- More comprehensive than what v1.2 planned

### Can I still use AgentScope v1.1 with DevContainers?

AgentScope v1.1 never had DevContainer scanning. Nothing changes for existing users.

### What about v1.2 DevContainer ADRs (008, 009)?

They're **archived** (marked as superseded). The content will be used in the `devcontainer-scanner` project.

### Why focus on security now?

Agent configurations have **critical security gaps** that are currently unaddressed:
- Prompt injection in CLAUDE.md
- Malicious MCP servers
- Secret leakage in agent configs

These are **high-impact vulnerabilities** that need immediate attention.

### How do I report security issues?

See our [Security Policy](../../SECURITY.md) for responsible disclosure.

---

## Appendix: CVE Summary

| CVE | Component | Threat | Severity | ADR |
|-----|-----------|--------|----------|-----|
| CVE-AGENTSCOPE-001 | Agent Config | Secret leakage | Critical | ADR-016 |
| CVE-AGENTSCOPE-002 | Agent Config | Prompt injection | Critical | ADR-016 |
| CVE-AGENTSCOPE-003 | CLAUDE.md | Instruction override | Critical | ADR-017 |
| CVE-AGENTSCOPE-004 | CLAUDE.md | Role manipulation | High | ADR-017 |
| CVE-AGENTSCOPE-005 | CLAUDE.md | Data exfiltration | Critical | ADR-017 |
| CVE-AGENTSCOPE-006 | CLAUDE.md | Malicious commands | Critical | ADR-017 |
| CVE-AGENTSCOPE-007 | MCP Server | Malicious package | Critical | ADR-018 |
| CVE-AGENTSCOPE-008 | MCP Server | Command injection | Critical | ADR-018 |

---

*Document Version: 1.0*
*Last Updated: 2026-01-25*
*Next Review: 2026-02-25*
