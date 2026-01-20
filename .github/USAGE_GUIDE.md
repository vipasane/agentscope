# AI Review System - Usage Guide

## Quick Reference

| Action | How |
|--------|-----|
| Create PR | Normal GitHub flow |
| Get AI review | Automatic on PR creation |
| Fix lint/format issues | Comment `@claude fix` |
| Request human review | Add `needs-human-review` label |
| Merge to main | Requires human approval |

---

## Daily Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/my-feature
```

### 2. Make Changes & Commit

```bash
git add .
git commit -m "feat(scope): add new feature"
```

**Commit format:** `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

### 3. Push & Create PR

```bash
git push -u origin feat/my-feature
gh pr create
```

Or push and create PR via GitHub UI.

### 4. AI Review Runs Automatically

When you open a PR, these checks run:

| Check | What It Does |
|-------|--------------|
| 🚦 Quick Checks | Calculates PR size, flags large PRs |
| 🔍 Quality Gates | TypeScript, ESLint, tests, security audit |
| 🔒 Security Review | Scans for secrets, vulnerabilities |
| 🏗️ Architecture Review | Checks file structure, new files |
| ✂️ Simplicity Review | Analyzes code complexity |
| 📋 Review Summary | Aggregates all reviews |

### 5. Review the Results

Check the PR comments for AI feedback. Each persona posts separately.

**Labels added automatically:**
- `size/small` to `size/xlarge` - Based on lines changed
- `needs-human-review` - If large PR or sensitive files
- `needs-tests` - If source changed but no tests

### 6. Fix Issues

**Option A: Fix manually**
```bash
git add .
git commit -m "fix: address review feedback"
git push
```

**Option B: Auto-fix (lint/format)**
Comment on the PR:
```
@claude fix
```

The bot will:
1. Run ESLint auto-fix
2. Run Prettier
3. Commit changes to your branch
4. Comment with results

**Specific fixes:**
```
@claude fix lint      # ESLint only
@claude fix format    # Prettier only
@claude fix types     # TypeScript check
```

### 7. Get Human Approval

Once all checks pass:
1. Request review from yourself (or team member)
2. Approve the PR
3. Merge to main

---

## Understanding Review Comments

### Security Review 🔒

**Blocks merge:**
- Hardcoded secrets
- SQL/command injection
- Auth bypass

**Warnings:**
- Missing input validation
- XSS risks
- Verbose error messages

### Architecture Review 🏗️

**Flags:**
- New files created (check placement)
- Large files (>300 lines)
- Circular dependencies

### Simplicity Review ✂️

**Shows:**
- Lines added vs removed
- Net change
- Complexity warnings

---

## Labels Reference

| Label | Meaning | Action |
|-------|---------|--------|
| `size/small` | < 100 lines | Auto-merge eligible |
| `size/medium` | 100-300 lines | Normal review |
| `size/large` | 300-500 lines | Split recommended |
| `size/xlarge` | > 500 lines | Must split |
| `needs-human-review` | Sensitive changes | Human must review |
| `needs-tests` | No tests included | Add tests |
| `ai-approved` | All AI checks pass | Ready for human |
| `security-concern` | Security issue found | Fix before merge |
| `breaking-change` | API breaking change | Needs migration guide |

---

## PR Template Sections

When you create a PR, fill in:

### Summary
Brief description (1-2 sentences)

### Change Type
Check what applies:
- 🐛 Bug fix
- ✨ New feature
- 💥 Breaking change
- 📚 Documentation
- etc.

### Areas Needing Human Review
List specific concerns:
```
1. Not sure about the error handling in parser.ts:45
2. Is this the right place for the config file?
```

### Questions for Reviewer
```
1. Should we add rate limiting here?
```

---

## Bypassing Reviews (Emergency Only)

### Skip local hooks
```bash
git commit --no-verify
git push --no-verify
```

### Merge without all checks
Requires admin to temporarily disable branch protection.

**Always document why in the PR.**

---

## Troubleshooting

### "Required status check not found"
Status checks appear after first workflow run. Create a test PR to trigger.

### Auto-fix not working
1. Check you have `ANTHROPIC_API_KEY` secret set
2. Check workflow permissions (needs write access)
3. Look at Actions tab for errors

### Review comments not posting
1. Check `GITHUB_TOKEN` permissions
2. Verify workflow has `pull-requests: write`

### Large PR flagged but it's fine
Remove the `needs-human-review` label manually if you've reviewed it.

---

## Best Practices

1. **Keep PRs small** - Aim for < 200 lines
2. **Include tests** - Avoid `needs-tests` label
3. **Use conventional commits** - Helps changelog generation
4. **Fill in PR template** - Helps AI review focus
5. **Address all comments** - Don't ignore warnings
6. **Split large changes** - Multiple small PRs > one large PR

---

## Commands Summary

| Command | Where | What |
|---------|-------|------|
| `@claude fix` | PR comment | Run all auto-fixes |
| `@claude fix lint` | PR comment | ESLint only |
| `@claude fix format` | PR comment | Prettier only |
| `/fix` | PR comment | Same as @claude fix |

---

## Files Reference

```
.github/
├── workflows/
│   ├── ai-review.yml      # Main review workflow
│   └── ai-fix.yml         # Auto-fix workflow
├── reviewers/
│   ├── security.yml       # Security persona config
│   ├── architect.yml      # Architecture persona
│   ├── simplifier.yml     # Simplicity persona
│   └── ...                # Other personas
├── pull_request_template.md
├── BRANCH_PROTECTION.md   # Setup guide
└── USAGE_GUIDE.md         # This file
```
