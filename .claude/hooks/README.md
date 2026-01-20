# Claude Code Review Hooks

Automated code review hooks that run before commits and integrate with GitHub Actions.

## Quick Setup

```bash
# Make the setup script executable and run it
chmod +x .claude/hooks/setup-hooks.sh
.claude/hooks/setup-hooks.sh
```

## What Gets Installed

| Hook | Purpose |
|------|---------|
| `pre-commit` | Runs AI review checks on staged files |
| `commit-msg` | Validates conventional commit format |
| `pre-push` | Runs tests, blocks direct push to main |

## Pre-Commit Review

The `pre-commit-review.js` script performs these checks:

### Security Checks
- Hardcoded secrets (API keys, passwords, tokens)
- Dangerous functions (eval, innerHTML, exec)
- Command injection risks

### Architecture Checks
- Circular dependency indicators
- File size limits (max 300 lines)
- File placement validation

### Simplicity Checks
- Change size analysis
- Complexity pattern detection
- Net code change tracking

### Test Coverage Checks
- Source files without corresponding tests

## Severity Levels

| Level | Action |
|-------|--------|
| `critical` | Blocks commit |
| `warning` | Allows commit with notice |
| `info` | Informational only |

## Human Review Triggers

These file patterns always trigger human review requirements:

```
.github/workflows/**     # CI/CD changes
**/secrets/**            # Secret management
**/*.env*                # Environment files
package.json             # Dependency changes
.claude/**               # Claude Code config
```

## Bypassing Hooks

In emergencies, you can bypass hooks:

```bash
# Skip all hooks (not recommended)
git commit --no-verify

# Skip push hooks (not recommended)
git push --no-verify
```

Always document why you bypassed hooks.

## Conventional Commits

The `commit-msg` hook enforces this format:

```
<type>(<scope>): <subject>
```

Valid types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Test changes
- `chore` - Maintenance
- `perf` - Performance
- `ci` - CI/CD changes
- `build` - Build system
- `revert` - Revert commit

Examples:
```
feat(scanner): add TypeScript parser support
fix(cli): handle missing config file gracefully
docs: update README with installation instructions
```

## Integration with GitHub Actions

These hooks complement the GitHub Actions workflow in `.github/workflows/ai-review.yml`:

1. **Local (hooks)**: Quick checks before commit
2. **GitHub (Actions)**: Comprehensive AI review on PR

## Configuration

Review settings are in `.claude/settings.json` under the `review` key:

```json
{
  "review": {
    "enabled": true,
    "personas": ["security", "architect", ...],
    "autoMerge": {
      "enabled": true,
      "maxLines": 100
    }
  }
}
```

## Troubleshooting

### Hook not running
```bash
# Check hook is executable
ls -la .git/hooks/pre-commit

# Reinstall hooks
.claude/hooks/setup-hooks.sh
```

### Node.js errors
```bash
# Ensure Node.js is installed
node --version

# Install dependencies
npm install js-yaml --save-dev
```

### Hook too slow
Edit timeout in `.claude/settings.json`:
```json
"timeout": 10000  // Increase timeout
```
