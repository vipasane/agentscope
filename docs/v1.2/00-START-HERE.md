# AgentScope v1.2 Documentation - START HERE

Welcome! This is your entry point to AgentScope v1.2 comprehensive documentation.

## Quick Links by Use Case

### 🆕 First Time Using AgentScope?
1. **[INDEX.md](./INDEX.md)** - Documentation overview (5 min read)
2. **[USER-GUIDE-v1.2.md](./USER-GUIDE-v1.2.md)** - Complete feature guide (20 min read)
3. **[EXAMPLES.md](./EXAMPLES.md)** - See output examples (10 min read)

**Then**: Try commands from [CLI-REFERENCE.md](./CLI-REFERENCE.md)

### 📤 Upgrading from v1.1?
1. **[CHANGELOG-v1.2.md](./CHANGELOG-v1.2.md)** - What's new (5 min read)
2. **[MIGRATION-GUIDE-v1.2.md](./MIGRATION-GUIDE-v1.2.md)** - Upgrade steps (15 min read)
3. **[USER-GUIDE-v1.2.md](./USER-GUIDE-v1.2.md)** - New features (15 min read)

**Then**: Run migration steps and test in your project

### 💻 Building with AgentScope?
1. **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - TypeScript interfaces (20 min read)
2. **[EXAMPLES.md](./EXAMPLES.md)** - Code examples (10 min read)
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design (20 min read)

**Then**: Implement using provided code examples

### 🏗️ Contributing to AgentScope?
1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design (20 min read)
2. **[CHANGELOG-v1.2.md](./CHANGELOG-v1.2.md)** - Recent changes (5 min read)
3. **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - Interfaces (20 min read)

**Then**: Review codebase with documentation context

---

## Documentation Files

| File | Purpose | Best For |
|------|---------|----------|
| **INDEX.md** | Navigation & overview | Quick reference |
| **CHANGELOG-v1.2.md** | What's new in v1.2 | Understanding changes |
| **MIGRATION-GUIDE-v1.2.md** | v1.1 to v1.2 upgrade | Upgrading projects |
| **USER-GUIDE-v1.2.md** | Feature guide & best practices | Learning features |
| **CLI-REFERENCE.md** | CLI commands & examples | Using from terminal |
| **API-DOCUMENTATION.md** | TypeScript interfaces | Programming |
| **EXAMPLES.md** | Output examples & samples | Seeing real output |
| **ARCHITECTURE.md** | System design | Understanding internals |

---

## 30-Second Overview

**AgentScope v1.2** generates professional documentation for your agent system.

**New in v1.2:**
- 📁 **Multi-file documentation** - Organize docs by category
- 🏷️ **Category system** - Auto-group agents (GitHub, Security, Dev, Testing)
- 📋 **ADR generation** - Create architecture decision index
- 📚 **arc42 templates** - Bootstrap architectural documentation
- 📊 **Enhanced diagrams** - Better data flow visualization

**Fully backward compatible** - no breaking changes from v1.1

---

## Quick Commands

```bash
# Install
npm install -g @vipasane/agentscope@1.2.0

# Basic usage
agentscope scan

# With all v1.2 features
agentscope scan --categories --generate-adr --generate-context --theme dark

# Custom options
agentscope scan --output ./docs/ --theme dark
```

**Full command reference**: [CLI-REFERENCE.md](./CLI-REFERENCE.md)

---

## Learning Paths

### ⚡ Quick Start (45 minutes)
1. INDEX.md (5 min)
2. USER-GUIDE-v1.2.md (20 min)
3. CLI-REFERENCE.md (10 min)
4. Try a command (10 min)

### 🚀 Upgrade (35 minutes)
1. CHANGELOG-v1.2.md (5 min)
2. MIGRATION-GUIDE-v1.2.md (15 min)
3. USER-GUIDE-v1.2.md (15 min)

### 🛠️ Development (50 minutes)
1. API-DOCUMENTATION.md (20 min)
2. EXAMPLES.md (10 min)
3. ARCHITECTURE.md (20 min)

### 📖 Deep Dive (2+ hours)
1. All of the above (70 min)
2. ARCHITECTURE.md detailed (20 min)
3. Review codebase

---

## Troubleshooting

**Can't find what you need?**

1. Try **INDEX.md** for overview
2. Search in **USER-GUIDE-v1.2.md** - has troubleshooting section
3. Check **CLI-REFERENCE.md** - has troubleshooting guide
4. Review **EXAMPLES.md** - shows expected outputs

**Still stuck?**

- Check [GitHub Issues](https://github.com/vipasane/agentscope/issues)
- Open a new issue with details
- Reference relevant documentation in your issue

---

## Key Features Overview

| Feature | Guide | CLI | API |
|---------|-------|-----|-----|
| **Multi-File Docs** | USER-GUIDE | `--categories` | `generateCategoryDocs()` |
| **Categories** | USER-GUIDE | `--categories` | `detectCategory()` |
| **ADR Index** | USER-GUIDE | `--generate-adr` | `generateAdrIndex()` |
| **arc42 Template** | USER-GUIDE | `--generate-context` | `generateContextTemplate()` |
| **Diagrams** | All | (automatic) | Diagram generators |
| **Export/Import** | USER-GUIDE | `export`, `import` | `exportConfig()`, `importConfig()` |

---

## Documentation Statistics

- **8 files** with 9,700+ lines
- **177 KB** of content
- **56+ sections** organized by topic
- **40+ code examples**
- **30+ diagrams & tables**
- **100% feature coverage**

---

## Your Next Step

**Choose your path above and dive in!**

- 🆕 New user? → [USER-GUIDE-v1.2.md](./USER-GUIDE-v1.2.md)
- 📤 Upgrading? → [MIGRATION-GUIDE-v1.2.md](./MIGRATION-GUIDE-v1.2.md)
- 💻 Developer? → [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)
- 🧭 Lost? → [INDEX.md](./INDEX.md)

---

*AgentScope v1.2 Documentation | February 2026*
