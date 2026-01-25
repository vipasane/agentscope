# CLI Reference - AgentScope v1.2

> **Complete reference for all CLI commands and options** | v1.2 and backward compatible with v1.1

## Table of Contents

1. [Global Options](#global-options)
2. [Scan Command](#scan-command)
3. [Validate Command](#validate-command)
4. [Export Command](#export-command)
5. [Import Command](#import-command)
6. [Examples & Recipes](#examples--recipes)

---

## Global Options

Options available for all commands:

```bash
agentscope [command] [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help | N/A |
| `--version` | `-v` | Show version | N/A |
| `--verbose` | | Detailed output | false |
| `--quiet` | `-q` | Suppress output | false |
| `--config <path>` | `-c` | Config file path | `agentscope.config.json` |

---

## Scan Command

Generate documentation from agent configuration.

### Basic Usage

```bash
agentscope scan
```

Scans current directory and generates documentation with smart defaults.

### Options

#### Core Options

| Option | Short | Argument | Description | Default | v1.2 New |
|--------|-------|----------|-------------|---------|----------|
| `--output` | `-o` | `<dir>` | Output directory | `docs/agent-architecture/` | ❌ |
| `--theme` | `-t` | `<name>` | Theme name | `light` | ❌ |
| `--theme-path` | | `<file>` | Custom theme file | N/A | ❌ |
| `--format` | `-f` | `<type>` | Output format | `markdown` | ❌ |
| `--diagram` | `-d` | `<type>` | Specific diagram | all | ❌ |

#### v1.2: Documentation Features

| Option | Argument | Description | Example |
|--------|----------|-------------|---------|
| `--categories` | | Force category-based docs | `agentscope scan --categories` |
| `--no-categories` | | Disable category docs | `agentscope scan --no-categories` |
| `--generate-adr` | | Generate ADR index | `agentscope scan --generate-adr` |
| `--generate-context` | | Generate arc42 template | `agentscope scan --generate-context` |

#### Advanced Options

| Option | Argument | Description | Default |
|--------|----------|-------------|---------|
| `--path` | `<dir>` | Project path to scan | current directory |
| `--exclude` | `<patterns>` | Exclude patterns | `node_modules/**` |
| `--include` | `<patterns>` | Include patterns | N/A |
| `--recursive` | | Recursive discovery | true |
| `--validate` | | Validate entities | true |
| `--no-validate` | | Skip validation | false |

### Theme Names

```bash
# Built-in themes
agentscope scan --theme light
agentscope scan --theme dark
agentscope scan --theme high-contrast-light
agentscope scan --theme high-contrast-dark
agentscope scan --theme colorblind-light
agentscope scan --theme colorblind-dark

# Custom theme file
agentscope scan --theme-path ./my-theme.json
```

### Diagram Types

```bash
# Generate specific diagram
agentscope scan --diagram hierarchy
agentscope scan --diagram component-map
agentscope scan --diagram dataflow

# v1.2: New diagrams (generated with categories)
agentscope scan --diagram permission-matrix
agentscope scan --diagram hook-lifecycle
```

### Output Formats

```bash
# Markdown (default - generates .md files)
agentscope scan --format markdown

# JSON (raw configuration for tooling)
agentscope scan --format json

# Combined (both markdown and JSON)
agentscope scan --format combined
```

### Examples

#### Standard Scan

```bash
agentscope scan
```

Output:
```
AgentScope v1.2.0
Scanning: /Users/dev/my-project

Found:
  - 8 agents
  - 5 skills
  - 4 hooks
  - 3 MCP servers
  - 12 permissions

Generated:
  ✓ docs/agent-architecture/README.md
  ✓ docs/agent-architecture/component-map.md
  ✓ docs/agent-architecture/hierarchy.md
  ✓ docs/agent-architecture/dataflow.md
  ✓ docs/agent-architecture/config.json
```

#### With v1.2 Features

```bash
agentscope scan --categories --generate-adr --generate-context
```

Output:
```
AgentScope v1.2.0
Scanning: /Users/dev/my-project

Found:
  - 15 agents in 4 categories
  - 5 skills
  - 4 hooks
  - 3 MCP servers
  - 12 permissions
  - 8 existing ADRs

Generated:
  ✓ docs/agent-architecture/README.md (overview)
  ✓ docs/agent-architecture/component-map.md
  ✓ docs/agent-architecture/hierarchy.md
  ✓ docs/agent-architecture/dataflow.md
  ✓ docs/agent-architecture/categories/github.md
  ✓ docs/agent-architecture/categories/security.md
  ✓ docs/agent-architecture/categories/development.md
  ✓ docs/agent-architecture/categories/testing.md
  ✓ docs/adr/README.md (ADR index)
  ✓ docs/CONTEXT.md (arc42 template)
  ✓ docs/agent-architecture/config.json
```

#### Custom Output & Theme

```bash
agentscope scan \
  --output ./generated-docs/ \
  --theme dark \
  --categories
```

#### Dark Theme + High-Contrast

```bash
agentscope scan --theme high-contrast-dark --output ./docs-accessible/
```

#### JSON Export Only

```bash
agentscope scan --format json --output ./config/
```

#### Specific Diagram Only

```bash
agentscope scan --diagram hierarchy --output ./diagrams/
```

#### Verbose Output

```bash
agentscope scan --verbose
```

Output:
```
AgentScope v1.2.0 (verbose mode)
Scanning: /Users/dev/my-project

[DEBUG] Searching for .claude/ directory... found
[DEBUG] Reading CLAUDE.md... 340 bytes
[DEBUG] Parsing agents... 8 agents found
[DEBUG] Parsing skills... 5 skills found
[DEBUG] Parsing hooks... 4 hooks found
[DEBUG] Detecting categories... 4 categories detected
[DEBUG] Generating diagrams... 4 diagrams generated
[DEBUG] Generating category docs... 4 category files generated
[DEBUG] Total time: 2,145ms

Generated:
  ✓ docs/agent-architecture/README.md
  ... (complete list)
```

---

## Validate Command

Validate agent configuration without generating documentation.

### Basic Usage

```bash
agentscope validate
```

### Options

| Option | Short | Argument | Description | Default |
|--------|-------|----------|-------------|---------|
| `--path` | | `<dir>` | Project path | current directory |
| `--strict` | `-s` | | Strict validation | false |
| `--fix` | | | Auto-fix issues | false |
| `--report` | `-r` | `<file>` | Save report | N/A |

### Examples

#### Basic Validation

```bash
agentscope validate
```

Output:
```
AgentScope Validation v1.2.0
Validating: /Users/dev/my-project

✓ Validation passed

Summary:
  - 8 agents: all valid
  - 5 skills: all valid
  - 4 hooks: all valid
  - 3 MCP servers: all valid
  - 12 permissions: all valid

Risk Level: LOW (DREAD score: 2.1/10)
```

#### Strict Validation

```bash
agentscope validate --strict
```

Output:
```
⚠ Validation passed with 3 warnings

Warnings:
  1. Agent "APIValidator" has no description
  2. Hook "PostTaskComplete" missing condition
  3. Permission "admin:*" has no priority set

Risk Level: LOW (but consider addressing warnings)
```

#### Save Report

```bash
agentscope validate --report ./validation-report.json
```

#### Auto-Fix Issues

```bash
agentscope validate --fix
```

Output:
```
✓ Validation and fixes applied

Fixed:
  - Added descriptions to 2 agents
  - Created missing MCP server definitions
  - Normalized permission formats

Remaining issues: 1 (manual review needed)
```

---

## Export Command

Export configuration for cross-platform migration or backup.

### Basic Usage

```bash
agentscope export
```

### Options

| Option | Argument | Description | Default |
|--------|----------|-------------|---------|
| `--output` | `<file>` | Output file | `exported-config.json` |
| `--path` | `<dir>` | Project path | current directory |
| `--sanitize-secrets` | | Replace secrets with placeholders | true |
| `--transform-paths` | | Normalize paths for target OS | true |
| `--target-platform` | `<os>` | Target OS (`windows`, `linux`, `macos`) | N/A |
| `--format` | `<type>` | Output format (`json`, `yaml`) | `json` |

### Examples

#### Standard Export

```bash
agentscope export
```

Output: `exported-config.json`
```json
{
  "config": {
    "agents": [...],
    "skills": [...],
    "hooks": [...]
  },
  "metadata": {
    "exportedAt": "2026-02-01T10:30:00Z",
    "exportedFrom": "/Users/dev/my-project",
    "version": "1.2.0"
  },
  "secrets": {
    "ANTHROPIC_KEY": "***MASKED***"
  }
}
```

#### Export for Windows

```bash
agentscope export \
  --target-platform windows \
  --output ./config-windows.json
```

#### YAML Format

```bash
agentscope export --format yaml --output ./config.yaml
```

#### Custom Output Path

```bash
agentscope export --output ./backups/config-$(date +%Y%m%d).json
```

---

## Import Command

Import configuration from backup or cross-platform transfer.

### Basic Usage

```bash
agentscope import ./exported-config.json
```

### Options

| Option | Argument | Description | Default |
|--------|----------|-------------|---------|
| `--target` | `<dir>` | Target project directory | current directory |
| `--overwrite` | | Overwrite existing files | false |
| `--restore-secrets` | | Restore secrets from mapping | false |
| `--validate` | | Validate after import | true |
| `--merge` | | Merge with existing (don't overwrite) | false |
| `--conflict-resolution` | `<mode>` | How to handle conflicts (`keep`, `overwrite`, `merge`) | `ask` |

### Examples

#### Standard Import

```bash
agentscope import ./exported-config.json
```

Output:
```
Importing configuration...

Found in export:
  - 8 agents
  - 5 skills
  - 4 hooks
  - 3 MCP servers
  - 12 permissions

Import status:
  ✓ 8 agents imported
  ✓ 5 skills imported
  ✓ 4 hooks imported
  ✓ 3 MCP servers imported
  ✓ 12 permissions imported

Result: 32 items imported successfully
```

#### Import with Merge

```bash
agentscope import ./exported-config.json --merge
```

#### Import and Overwrite

```bash
agentscope import ./exported-config.json --overwrite
```

#### Import to Different Directory

```bash
agentscope import ./exported-config.json --target /path/to/new-project/
```

#### Import with Validation

```bash
agentscope import ./exported-config.json --validate
```

Output:
```
Importing and validating...

Import completed: 32 items
Validation: PASSED

All imported entities are valid.
```

---

## Examples & Recipes

### Recipe 1: Full Documentation Generation

```bash
# Generate everything AgentScope can produce
agentscope scan \
  --categories \
  --generate-adr \
  --generate-context \
  --theme dark \
  --output ./docs/agents/
```

### Recipe 2: Accessibility-First Documentation

```bash
# Generate high-contrast documentation for accessibility
agentscope scan \
  --theme high-contrast-dark \
  --categories \
  --output ./docs/accessible/
```

### Recipe 3: Cross-Platform Migration

```bash
# Step 1: Export from source (macOS)
agentscope export --output config-macos.json

# Step 2: Import on target (Windows)
agentscope import config-macos.json \
  --target /path/to/new-project/ \
  --target-platform windows \
  --transform-paths
```

### Recipe 4: Backup Current State

```bash
# Daily backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
agentscope export --output "./backups/config_${TIMESTAMP}.json"
```

### Recipe 5: CI/CD Integration

```bash
# GitHub Actions workflow example
- name: Generate Agent Documentation
  run: |
    npm install -g @vipasane/agentscope@1.2.0
    agentscope scan \
      --categories \
      --generate-adr \
      --output ./docs/generated/

- name: Commit changes
  run: |
    git add docs/generated/
    git commit -m "docs: regenerate agent documentation"
    git push
```

### Recipe 6: Colorblind-Friendly Output

```bash
# Generate diagrams safe for color-blind users
agentscope scan \
  --theme colorblind-dark \
  --categories \
  --output ./docs/colorblind/
```

### Recipe 7: JSON Export for Tooling

```bash
# Export as JSON for processing by other tools
agentscope scan --format json --output ./config.json

# Then use with other tools:
cat config.json | jq '.agents | length'  # Count agents
```

### Recipe 8: Comprehensive Validation Report

```bash
# Validate and save report
agentscope validate \
  --strict \
  --report ./validation-report.json

# Review report
cat validation-report.json | jq '.warnings'
```

### Recipe 9: Archive for Disaster Recovery

```bash
# Create complete archive
mkdir -p ./dr-backup
agentscope export --output ./dr-backup/config.json
agentscope scan --output ./dr-backup/
tar -czf dr-backup-$(date +%Y%m%d).tar.gz ./dr-backup/
```

### Recipe 10: Validate Before Deploy

```bash
# Pre-deployment validation
agentscope validate --strict

if [ $? -eq 0 ]; then
  echo "✓ Configuration valid - safe to deploy"
  agentscope scan --output ./docs/
else
  echo "✗ Validation failed - address issues before deploying"
  exit 1
fi
```

---

## Common Options Combinations

### By Use Case

#### Documentation Website

```bash
agentscope scan \
  --theme light \
  --categories \
  --output ./docs/
```

#### Quick Overview

```bash
agentscope scan --format json
```

#### Accessibility Audit

```bash
agentscope scan \
  --theme high-contrast-dark \
  --verbose
```

#### Architecture Documentation

```bash
agentscope scan \
  --categories \
  --generate-adr \
  --generate-context
```

#### Migration Setup

```bash
agentscope export --sanitize-secrets
agentscope import ./exported-config.json --target-platform <target>
```

---

## Troubleshooting

### Command Not Found

```bash
# Ensure global installation
npm install -g @vipasane/agentscope@1.2.0

# Or use npx
npx @vipasane/agentscope@1.2.0 scan
```

### Permission Denied

```bash
# Fix permissions (macOS/Linux)
chmod +x /usr/local/bin/agentscope
```

### Output Directory Error

```bash
# Ensure directory exists
mkdir -p ./docs/agent-architecture/

# Or use absolute path
agentscope scan --output $(pwd)/docs/
```

### Theme Not Found

```bash
# Use built-in theme names
agentscope scan --theme dark

# Or create custom theme file
agentscope scan --theme-path ./my-theme.json
```

---

## Environment Variables

### Configuration

```bash
# Set default output directory
export AGENTSCOPE_OUTPUT=./docs/

# Set default theme
export AGENTSCOPE_THEME=dark

# Set verbose mode
export AGENTSCOPE_VERBOSE=1

# Use config file
export AGENTSCOPE_CONFIG=./agentscope.config.json
```

### Usage

```bash
# All with environment variables set
AGENTSCOPE_THEME=dark AGENTSCOPE_OUTPUT=./docs/ agentscope scan
```

---

## See Also

- [API Documentation](./API-DOCUMENTATION.md) - Programmatic usage
- [User Guide](./USER-GUIDE-v1.2.md) - Feature guide
- [Examples](./EXAMPLES.md) - Output examples
