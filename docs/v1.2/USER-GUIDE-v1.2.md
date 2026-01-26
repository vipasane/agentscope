# User Guide - AgentScope v1.2 Features

> **Comprehensive guide to all v1.2 features** | For earlier versions, see [v1.1 Guide](../guides/v1.1-guide.md)

## Table of Contents

1. [What's New in v1.2](#whats-new-in-v12)
2. [Multi-File Documentation](#multi-file-documentation)
3. [Category System](#category-system)
4. [Template Generation](#template-generation)
5. [Enhanced CLI Commands](#enhanced-cli-commands)
6. [Examples & Outputs](#examples--outputs)
7. [Migration from v1.1](#migration-from-v11)
8. [Troubleshooting](#troubleshooting)

---

## What's New in v1.2

AgentScope v1.2 introduces **professional-quality documentation generation** with:

- **Multi-file documentation** - Organized by category for large projects
- **Category system** - Automatic grouping of related agents
- **Template generation** - ADR index and arc42 templates
- **Enhanced diagrams** - Data transformation focus in dataflow
- **Improved documentation** - Better formatting and readability

All new features are **backward compatible** with v1.1.

---

## Multi-File Documentation

### Overview

For projects with **more than 10 agents**, AgentScope v1.2 automatically generates organized documentation:

```
docs/agent-architecture/
├── README.md                  # Main overview with stats
├── component-map.md           # Full system diagram
├── hierarchy.md               # Agent delegation
├── dataflow.md                # Data transformation flow
└── categories/
    ├── github.md              # GitHub-related agents
    ├── security.md            # Security agents
    ├── development.md         # Development agents
    └── testing.md             # Testing agents
```

### When Multi-File Docs Are Generated

- **Automatic**: >10 agents in project
- **Forced**: Use `--categories` flag
- **Disabled**: Use `--no-categories` flag

### Benefits

| Feature | Benefit |
|---------|---------|
| **Organized navigation** | Easy to find agent-specific info |
| **Focused categories** | Read only relevant agent docs |
| **Modular structure** | Can be easily extended |
| **Industry standard** | Follows doc organization best practices |
| **Scalable** | Works with projects of any size |

---

## Category System

### Automatic Category Detection

AgentScope detects categories from multiple sources (in priority order):

1. **Explicit**: `category` field in agent frontmatter
   ```yaml
   ---
   name: PullRequestReviewer
   category: github
   ---
   ```

2. **Keywords**: Agent name and description
   - `github` → GitHub category (PR, issue, release agents)
   - `security` → Security category (audit, compliance agents)
   - `develop`, `backend`, `frontend` → Development category
   - `test`, `validate`, `review` → Testing category

3. **Default**: `general` for unmatched agents

### Built-in Categories

| Category | Keywords | Examples |
|----------|----------|----------|
| **GitHub** | pr, pull, issue, release, workflow | PR Manager, Issue Tracker, Release Coordinator |
| **Security** | security, audit, compliance, pii, auth | Security Auditor, Permission Checker |
| **Development** | develop, backend, frontend, api, db | Backend Developer, Frontend Specialist |
| **Testing** | test, validate, review, verify | Tester, Code Reviewer, Validator |
| **DevOps** | deploy, infra, ops, docker, k8s | DevOps Engineer, Infrastructure Coordinator |

### Overriding Category Detection

Add frontmatter to override auto-detection:

```yaml
---
name: SpecialGitHubReviewer
description: Specialized reviewer for API contracts (security focus)
category: security  # Override auto-detection of 'github'
---
```

### Viewing Generated Categories

After running `agentscope scan --categories`:

```bash
$ agentscope scan --categories

Found:
  - 15 agents in 4 categories
    • 🐙 GitHub (4 agents)
    • 🔒 Security (3 agents)
    • 💻 Development (5 agents)
    • 🧪 Testing (3 agents)

Generated category documentation:
  ✓ categories/github.md (with diagram)
  ✓ categories/security.md (with diagram)
  ✓ categories/development.md (with diagram)
  ✓ categories/testing.md (with diagram)
```

---

## Template Generation

### ADR (Architecture Decision Record) Index

**Purpose**: Discover and index all Architecture Decision Records in your project.

```bash
agentscope scan --generate-adr
```

**Output**: `/docs/adr/README.md` with:
- Index of all existing ADRs
- Links to ADRs in `/docs/adr/` and `/docs/architecture/decisions/`
- MADR 3.0 template for new ADRs
- Categorization by topic

**Example ADR Index Structure**:
```markdown
# Architecture Decision Records (ADRs)

## 1. Architecture Decisions
- ADR-001: Unified Config Model
- ADR-002: Mermaid Security
- ADR-003: Settings Scanner

## 2. Output Format Decisions
- ADR-005: Output Format Selection
- ADR-007: Export/Import System

## 3. Quality/Testing Decisions
- ADR-006: Test Strategy
- ADR-009: Security Model

## 4. Implementation Approach
- ADR-004: Parser Plugin Architecture
- ADR-008: CLI Framework
```

### CONTEXT.md Generation (arc42 Template)

**Purpose**: Bootstrap architectural documentation with arc42 sections 1-3.

```bash
agentscope scan --generate-context
```

**Output**: `/docs/CONTEXT.md` with auto-populated sections:

1. **Introduction and Goals**
   - System purpose (from agent descriptions)
   - Success criteria
   - Stakeholders
   - Key features
   - Auto-populated from scan data

2. **Constraints**
   - MCP server requirements
   - Tool restrictions
   - Platform constraints
   - Performance requirements
   - Security constraints

3. **Context and Scope**
   - System boundary diagram
   - Internal systems (agents, components)
   - External systems (MCP servers, APIs)
   - User roles and interactions
   - Auto-generated Mermaid C4 diagram

**Example Section**:
```markdown
## 1. Introduction and Goals

### What is the system about?
The Agent System coordinates AI agents for code development,
documentation, and quality assurance.

### What's the current state?
Based on scan results:
- 15 agents across 4 categories
- 8 MCP servers for tool access
- 4 hooks for lifecycle events

### What are the goals?
- [ ] Complete goal 1 (define)
- [ ] Complete goal 2 (define)
- [ ] Complete goal 3 (define)
```

---

## Enhanced CLI Commands

### Basic Usage

```bash
# Standard scan (auto-enables features based on project size)
agentscope scan

# Generate everything v1.2 has to offer
agentscope scan --categories --generate-adr --generate-context

# With custom output directory
agentscope scan --output ./docs/agents/ --categories
```

### v1.2 Specific Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--categories` | Force category-based docs | `agentscope scan --categories` |
| `--no-categories` | Disable category docs | `agentscope scan --no-categories` |
| `--generate-adr` | Generate ADR index | `agentscope scan --generate-adr` |
| `--generate-context` | Generate arc42 template | `agentscope scan --generate-context` |

### v1.1 Compatible Flags (Still Work)

```bash
# Theme selection (works with all features)
agentscope scan --theme dark --categories
agentscope scan --theme high-contrast-dark --generate-adr

# Custom theme file
agentscope scan --theme-path ./my-theme.json --categories

# Specific diagram
agentscope scan --diagram dataflow --generate-context

# JSON output
agentscope scan --format json --categories

# Custom output
agentscope scan --output ./my-docs/ --generate-adr
```

### Combining Options

```bash
# All v1.2 features with dark theme and custom output
agentscope scan \
  --categories \
  --generate-adr \
  --generate-context \
  --theme dark \
  --output ./docs/generated/

# Category docs with specific diagram type
agentscope scan \
  --categories \
  --diagram component-map \
  --theme colorblind-dark
```

---

## Examples & Outputs

### Example Directory Structure

```
/examples/v1.2/
├── multi-file-docs/
│   ├── README.md
│   ├── component-map.md
│   ├── hierarchy.md
│   ├── dataflow.md
│   └── categories/
│       ├── github.md
│       ├── security.md
│       ├── development.md
│       └── testing.md
│
├── adr-generation/
│   ├── ADR_INDEX.md
│   ├── ADR-TEMPLATE.md
│   └── MADR-3.0-template.md
│
├── context-generation/
│   ├── CONTEXT.md
│   ├── system-boundary.md
│   └── arc42-sections.md
│
└── comparison-outputs/
    ├── single-file-output.md
    ├── multi-file-output/
    └── with-templates-output/
```

### Sample Output Comparison

**Before (v1.1)**: Single comprehensive README.md (good for <10 agents)

**After (v1.2)**: Organized multi-file structure (better for >10 agents)

| Document | v1.1 Size | v1.2 Size | Purpose |
|----------|-----------|-----------|---------|
| README.md | 8-15 KB | 3-5 KB | Overview + navigation |
| component-map.md | N/A | 2-4 KB | Full system diagram |
| hierarchy.md | (in README) | 2-3 KB | Delegation focus |
| dataflow.md | (in README) | 3-5 KB | Data transformation |
| categories/*.md | N/A | 2-4 KB each | Category-specific |

---

## Migration from v1.1

### Compatibility

v1.2 is **100% backward compatible** with v1.1:

- All v1.1 commands still work
- No breaking API changes
- Existing projects continue to work
- New features are optional

### Upgrade Steps

```bash
# Step 1: Update package
npm install -g @vipasane/agentscope@1.2.0
# or
npm update @vipasane/agentscope

# Step 2: Verify installation
agentscope --version
# Output: @vipasane/agentscope v1.2.0

# Step 3: Run scan (auto-uses new features if applicable)
agentscope scan
```

### Behavior Changes

| Scenario | v1.1 Behavior | v1.2 Behavior | Opt-Out |
|----------|---------------|---------------|---------|
| >10 agents | Single README.md | Multi-file docs | `--no-categories` |
| <10 agents | Single README.md | Single README.md | N/A (default) |
| Force format | `--format json` | Works same | N/A |
| Diagrams | All embedded | Can be separate | Already possible |

### Preserving v1.1 Behavior

If you prefer v1.1-style single-file output:

```bash
# Disable new multi-file feature
agentscope scan --no-categories

# This generates:
# - README.md (single file with all content)
# - No categories/ subdirectory
# - Everything as before
```

### Testing Your Migration

```bash
# 1. Run v1.2 scan
agentscope scan --output ./docs/v1.2-output/

# 2. Compare with v1.1 output (if backed up)
diff ./docs/v1.1-output/README.md ./docs/v1.2-output/README.md

# 3. Verify diagrams
# Check that diagrams still render properly

# 4. Update CI/CD (if applicable)
# If using GitHub Actions or CI, update paths to new docs
```

---

## Troubleshooting

### Category Detection Issues

**Problem**: Agent not appearing in expected category

**Solution**:
1. Check agent name and description for keywords
2. Add explicit `category` field to agent frontmatter
3. Verify keyword capitalization (case-insensitive)
4. Check for typos in category name

**Example Fix**:
```yaml
---
name: MySecurityReviewer
description: Reviews code for security issues
category: security  # Explicitly set if auto-detection fails
---
```

### Multi-File Generation Not Triggered

**Problem**: Single README.md generated instead of multi-file docs

**Causes**:
- Project has <10 agents (not auto-enabled)
- `--no-categories` flag used
- Project structure different than expected

**Solutions**:
```bash
# Force multi-file generation
agentscope scan --categories

# Check agent count
agentscope scan --format json | jq '.agents | length'

# If count >= 10, multi-file docs will generate
```

### ADR Index Generation Issues

**Problem**: ADR index not generated or incomplete

**Causes**:
- ADR files not in expected locations
- Non-standard ADR naming
- Permissions issues

**Solutions**:
```bash
# Ensure ADRs are in standard locations
# /docs/adr/
# /docs/architecture/decisions/

# Check ADR file naming (ADR-XXX.md)
ls docs/adr/

# Run with verbose output
agentscope scan --generate-adr --verbose
```

### CONTEXT.md Generation Issues

**Problem**: CONTEXT.md not generating or missing sections

**Causes**:
- Invalid arc42 template
- Empty agent descriptions
- Permission issues

**Solutions**:
```bash
# Ensure agents have descriptions
# Check .claude/agents/ files have description fields

# Verify scan works
agentscope scan

# Then generate context
agentscope scan --generate-context
```

### Performance Issues

**Problem**: Scan takes too long with new features

**Typical Times**:
- Scan alone: ~2s for 50 components
- +categories: ~3.2s total
- +ADR gen: ~0.1s additional
- +context gen: ~0.2s additional

**Optimization**:
```bash
# Generate only what you need
agentscope scan --diagram hierarchy  # Skip other diagrams

# Or specify just categories
agentscope scan --categories --no-diagram
```

### Output Not Matching Examples

**Problem**: Generated docs look different than examples

**Causes**:
- Different agent configurations
- Custom themes applied
- Version differences

**Solutions**:
1. Compare your agents.json with example
2. Use standard theme: `agentscope scan --theme light`
3. Check AgentScope version: `agentscope --version`

---

## Best Practices

### For Documentation

1. **Add agent descriptions**
   - Used for category detection
   - Appears in generated docs
   - Helps with auto-detection accuracy

2. **Use consistent frontmatter**
   - Add `category` field for important agents
   - Keep descriptions concise but complete
   - Use standard formatting

3. **Organize by categories**
   - Group related agents together
   - Makes docs easier to navigate
   - Improves discoverability

### For Large Projects

1. **Use `--categories` flag**
   - Automatic for >10 agents
   - Improves navigation
   - Reduces main README size

2. **Generate templates**
   - Create ADR index: `--generate-adr`
   - Start arc42 docs: `--generate-context`
   - Builds on existing project structure

3. **Commit generated docs**
   - Include in version control
   - Review like code changes
   - Track documentation evolution

### For CI/CD Integration

1. **Update paths in workflows**
   - Old: `docs/agent-architecture/README.md`
   - New: `docs/agent-architecture/README.md` (same, but can have subdirs)
   - Category docs in: `docs/agent-architecture/categories/`

2. **Configure output directory**
   - Use `--output` flag consistently
   - Document in CI configuration
   - Keep path in `.gitignore` or track as needed

3. **Regenerate on changes**
   - Add to PR checks
   - Run on CI when agents change
   - Update documentation branch

---

## Summary

v1.2 enhances AgentScope with:

✅ **Multi-file documentation** - Better organization for large projects
✅ **Category system** - Automatic grouping of related agents
✅ **Template generation** - ADR index and arc42 templates
✅ **Enhanced diagrams** - Better data flow representation
✅ **Backward compatible** - No breaking changes

Ready to upgrade? → See [Upgrade Steps](#upgrade-steps)
Need examples? → Check `/examples/v1.2/`
Questions? → See [Troubleshooting](#troubleshooting)

---

## Related Documentation

- [Changelog](./CHANGELOG-v1.2.md) - What's new in v1.2
- [Migration Guide](./MIGRATION-GUIDE-v1.2.md) - Detailed upgrade instructions
- [API Documentation](./API-DOCUMENTATION.md) - TypeScript interfaces
- [CLI Reference](./CLI-REFERENCE.md) - All CLI commands
- [Examples](./EXAMPLES.md) - Complete output examples
