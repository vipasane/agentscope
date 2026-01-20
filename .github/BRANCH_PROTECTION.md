# Branch Protection Rules Setup

This guide explains how to configure GitHub branch protection rules to ensure:
- Only humans can merge to `main`
- All PRs require AI review checks to pass
- Quality gates must be satisfied before merge

## Required Branch Protection Rules for `main`

### Step 1: Navigate to Settings

1. Go to your repository on GitHub
2. Click **Settings** > **Branches**
3. Under "Branch protection rules", click **Add branch protection rule**

### Step 2: Configure Protection for `main`

Enter `main` as the branch name pattern, then enable:

#### Required Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| **Require a pull request before merging** | ✅ Enabled | Forces all changes through PR |
| **Require approvals** | 1 | Human must approve |
| **Dismiss stale pull request approvals** | ✅ Enabled | New commits need re-approval |
| **Require review from Code Owners** | Optional | If using CODEOWNERS file |
| **Require status checks to pass** | ✅ Enabled | AI reviews must pass |
| **Require branches to be up to date** | ✅ Enabled | Must be current with main |
| **Require conversation resolution** | ✅ Enabled | All review comments addressed |

#### Required Status Checks

Add these status checks (from `ai-review.yml`):

```
✅ 🚦 Quick Checks
✅ 🔍 Quality Gates
✅ 🔒 Security Review
✅ 🏗️ Architecture Review
✅ ✂️ Simplicity Review
✅ 📋 Review Summary
```

#### Additional Security Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| **Restrict who can push** | ✅ Enabled | Limit direct pushes |
| **Require linear history** | Optional | Cleaner git history |
| **Include administrators** | ✅ Enabled | Rules apply to everyone |
| **Allow force pushes** | ❌ Disabled | Prevent history rewriting |
| **Allow deletions** | ❌ Disabled | Protect branch |

### Step 3: Configure `develop` Branch (Optional)

For a `develop` branch with lighter restrictions:

| Setting | Value |
|---------|-------|
| **Require pull request** | ✅ Enabled |
| **Require approvals** | 0 (AI can approve) |
| **Require status checks** | ✅ Enabled |
| **Allow auto-merge** | ✅ Enabled |

## Auto-Merge Configuration

### Enabling Auto-Merge

1. Go to **Settings** > **General**
2. Scroll to "Pull Requests"
3. Enable **Allow auto-merge**

### When Auto-Merge Triggers

With the AI review workflow, PRs auto-merge to `develop` when:

1. All AI reviewer checks pass (no blocking issues)
2. All status checks pass (TypeScript, ESLint, tests)
3. PR size is `small` or `medium` (< 300 lines)
4. No `needs-human-review` label
5. No security-sensitive files changed

### Files That Always Need Human Review

These patterns trigger `needs-human-review` label:

```
.github/workflows/**     # CI/CD changes
**/secrets/**            # Secret management
**/*.env*                # Environment files
package.json             # Dependency changes
package-lock.json        # Lock file changes
```

## Labels Configuration

Create these labels in your repository:

| Label | Color | Description |
|-------|-------|-------------|
| `size/small` | `#0E8A16` | <100 lines changed |
| `size/medium` | `#FBCA04` | 100-300 lines changed |
| `size/large` | `#D93F0B` | 300-500 lines changed |
| `size/xlarge` | `#B60205` | >500 lines changed |
| `needs-human-review` | `#D93F0B` | Requires human approval |
| `needs-tests` | `#FBCA04` | Missing test coverage |
| `ai-approved` | `#0E8A16` | All AI checks passed |
| `security-concern` | `#B60205` | Security issue flagged |
| `breaking-change` | `#D93F0B` | Breaking API change |

### Create Labels Script

Run this in your repo with GitHub CLI:

```bash
#!/bin/bash
gh label create "size/small" --color "0E8A16" --description "< 100 lines changed"
gh label create "size/medium" --color "FBCA04" --description "100-300 lines changed"
gh label create "size/large" --color "D93F0B" --description "300-500 lines changed"
gh label create "size/xlarge" --color "B60205" --description "> 500 lines changed"
gh label create "needs-human-review" --color "D93F0B" --description "Requires human approval"
gh label create "needs-tests" --color "FBCA04" --description "Missing test coverage"
gh label create "ai-approved" --color "0E8A16" --description "All AI checks passed"
gh label create "security-concern" --color "B60205" --description "Security issue flagged"
gh label create "breaking-change" --color "D93F0B" --description "Breaking API change"
```

## CODEOWNERS (Optional)

Create `.github/CODEOWNERS` to require specific reviewers:

```
# Default owner for everything
* @your-username

# Security-sensitive files need explicit approval
.github/workflows/** @your-username
**/security/** @your-username
```

## Verification Checklist

After setup, verify:

- [ ] Direct push to `main` is blocked
- [ ] PRs require at least 1 human approval
- [ ] AI review workflow runs on PR creation
- [ ] Status checks are required to pass
- [ ] Auto-merge works for small PRs to `develop`
- [ ] Large PRs (>300 lines) get `needs-human-review` label
- [ ] Security changes always require human review

## Troubleshooting

### "Required status check not found"

Status checks only appear after the workflow runs once. Create a test PR to trigger the workflow.

### Auto-merge not working

1. Check that auto-merge is enabled in repo settings
2. Verify branch protection allows auto-merge
3. Check the PR has the `ai-approved` label
4. Ensure no `needs-human-review` label is present

### Bypassing protection (Emergency)

If you need to bypass in emergencies:

1. Temporarily disable "Include administrators"
2. Make the change
3. **Immediately re-enable the setting**

Document all bypasses in an issue for audit trail.
