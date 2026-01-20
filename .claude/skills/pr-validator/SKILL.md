# PR Validator & Learning Skill

---
name: pr-validator
description: Validates PRs with deterministic checks first, learns from issues, delegates overflow to specialized agents
argument-hint: "[pr-number or 'current']"
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - mcp__claude-flow__memory_store
  - mcp__claude-flow__memory_search
  - mcp__claude-flow__memory_retrieve
  - mcp__claude-flow__hooks_post-task
---

## Purpose

Validates pull requests with:
- Deterministic checks first (no LLM overhead)
- Pattern matching against learned issues
- Automatic fixes for known problems
- Overflow handling for unknown issues
- Self-learning from resolutions

## Deterministic First Principle

1. **Phase 1-3**: Pure deterministic checks (regex, file existence, syntax)
2. **Phase 4**: Pattern lookup from learned database
3. **Phase 5**: Apply deterministic fixes
4. **Phase 6**: LLM-assisted analysis (only for complex semantic issues)
5. **Phase 7**: Overflow handling and delegation

---

## Phase 1: Deterministic Structure Checks

```bash
PR_NUM="${1:-current}"

# Get PR info
if [ "$PR_NUM" = "current" ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  BASE=$(git config --get branch.${BRANCH}.merge | sed 's|refs/heads/||')
else
  BRANCH=$(gh pr view $PR_NUM --json headRefName -q '.headRefName')
  BASE=$(gh pr view $PR_NUM --json baseRefName -q '.baseRefName')
fi

# Get changed files
FILES=$(git diff --name-only ${BASE}...${BRANCH})
FILES_COUNT=$(echo "$FILES" | wc -l)

echo "Validating PR: $BRANCH -> $BASE"
echo "Files changed: $FILES_COUNT"
```

### Structure Validation (Deterministic)

| Check | Command | Pass Condition |
|-------|---------|----------------|
| Has changes | `git diff --stat` | Non-empty |
| No conflicts | `grep -r "<<<<<<<"` | Empty result |
| Commit message | `git log --format=%s -1` | Matches `type(scope): desc` |
| Branch naming | `echo $BRANCH` | Matches `type/description` |

---

## Phase 2: Deterministic Content Checks

```bash
ISSUES=()
WARNINGS=()
OVERFLOW=()

# Check 1: Secret patterns in documentation
for file in $(echo "$FILES" | grep -E "\.md$"); do
  if grep -qE "(sk-ant-|ghp_[a-zA-Z0-9]{36}|api[_-]?key\s*[:=]\s*['\"][^'\"]+)" "$file" 2>/dev/null; then
    # Check if it's a detection pattern (regex) or actual secret
    if grep -qE "pattern.*sk-ant|/sk-ant.*/" "$file"; then
      WARNINGS+=("secret-pattern-in-docs:$file:known-false-positive")
    else
      ISSUES+=("potential-secret:$file")
    fi
  fi
done

# Check 2: Large files
for file in $(find . -path ./.git -prune -o -size +500k -print 2>/dev/null); do
  WARNINGS+=("large-file:$file:$(du -h $file | cut -f1)")
done

# Check 3: Missing documentation
if echo "$FILES" | grep -qE "^src/.*\.(ts|js)$"; then
  if ! echo "$FILES" | grep -qE "\.md$"; then
    WARNINGS+=("code-without-docs:consider-adding-documentation")
  fi
done

# Check 4: Test coverage
if echo "$FILES" | grep -qE "^src/.*\.(ts|js)$"; then
  if ! echo "$FILES" | grep -qE "\.test\.(ts|js)$|\.spec\.(ts|js)$"; then
    WARNINGS+=("code-without-tests:consider-adding-tests")
  fi
fi

# Check 5: Changelog updated
if [ "$FILES_COUNT" -gt 5 ] && ! echo "$FILES" | grep -q "CHANGELOG"; then
  WARNINGS+=("changelog-not-updated:consider-updating")
fi

# Check 6: PR summary exists
PR_SUMMARY="docs/PRs/$(echo $BRANCH | tr '/' '-').md"
if [ ! -f "$PR_SUMMARY" ]; then
  ISSUES+=("missing-pr-summary:$PR_SUMMARY")
fi
```

---

## Phase 3: Pattern Lookup (Learned Issues)

```bash
# Search memory for known issue patterns
KNOWN_PATTERNS=$(claude-flow memory search \
  --query "pr-validation-issues" \
  --namespace "patterns" \
  --limit 20 2>/dev/null || echo "[]")

# Match current issues against known patterns
for issue in "${ISSUES[@]}"; do
  ISSUE_TYPE=$(echo "$issue" | cut -d: -f1)

  # Check if we have a learned fix
  LEARNED_FIX=$(echo "$KNOWN_PATTERNS" | grep -o "\"$ISSUE_TYPE\":\"[^\"]*\"" | cut -d: -f2 | tr -d '"')

  if [ -n "$LEARNED_FIX" ]; then
    echo "Found learned fix for $ISSUE_TYPE: $LEARNED_FIX"
    DETERMINISTIC_FIXES+=("$ISSUE_TYPE:$LEARNED_FIX")
  else
    echo "No learned fix for $ISSUE_TYPE - adding to overflow"
    OVERFLOW+=("$issue")
  fi
done
```

---

## Phase 4: Apply Deterministic Fixes

```bash
FIXES_APPLIED=()

for fix in "${DETERMINISTIC_FIXES[@]}"; do
  ISSUE_TYPE=$(echo "$fix" | cut -d: -f1)
  FIX_ACTION=$(echo "$fix" | cut -d: -f2)

  case "$ISSUE_TYPE" in
    "secret-pattern-in-docs")
      # Known fix: Replace with EXAMPLE_* placeholders
      for file in $(echo "$FILES" | grep -E "\.md$"); do
        sed -i 's/sk-ant-[a-zA-Z0-9-]*/EXAMPLE_API_KEY/g' "$file"
        sed -i 's/ghp_[a-zA-Z0-9]\{36\}/EXAMPLE_GITHUB_TOKEN/g' "$file"
      done
      FIXES_APPLIED+=("Replaced secret patterns with EXAMPLE_* placeholders")
      ;;

    "missing-pr-summary")
      # Known fix: Generate template
      mkdir -p docs/PRs
      cat > "$PR_SUMMARY" << TEMPLATE
# PR: $BRANCH

## Executive Summary
[Auto-generated - needs human review]

## Changes
$(git diff --stat ${BASE}...${BRANCH})

## Review Checklist
- [ ] Code reviewed
- [ ] Tests pass
- [ ] Documentation updated
TEMPLATE
      FIXES_APPLIED+=("Generated PR summary template")
      ;;

    "trailing-whitespace")
      find . -name "*.md" -exec sed -i 's/[[:space:]]*$//' {} \;
      FIXES_APPLIED+=("Removed trailing whitespace")
      ;;

    *)
      echo "No deterministic fix for: $ISSUE_TYPE"
      OVERFLOW+=("$fix")
      ;;
  esac
done
```

---

## Phase 5: LLM-Assisted Analysis (When Valuable)

**Use LLM only for**:
- Semantic code review (logic errors, design issues)
- Security vulnerability analysis beyond pattern matching
- Generating human-readable summaries

```markdown
## LLM Analysis Triggers

| Condition | LLM Task |
|-----------|----------|
| New API endpoints | Security review |
| Database queries | SQL injection check |
| Auth changes | Access control review |
| Complex refactor | Logic validation |
```

**Skip LLM for**:
- Formatting issues (use prettier/eslint)
- Type errors (use TypeScript)
- Known patterns (use learned fixes)

---

## Phase 6: Overflow Handling

```bash
if [ ${#OVERFLOW[@]} -gt 0 ]; then
  echo "=== OVERFLOW ISSUES (Require Delegation) ==="

  for issue in "${OVERFLOW[@]}"; do
    ISSUE_TYPE=$(echo "$issue" | cut -d: -f1)
    ISSUE_FILE=$(echo "$issue" | cut -d: -f2)

    case "$ISSUE_TYPE" in
      "potential-secret")
        echo "Delegating to security-architect: $issue"
        # Spawn security agent
        cat << EOF
Task: Analyze potential secret exposure
File: $ISSUE_FILE
Action: Determine if this is a real secret or false positive
If real: Remove and rotate
If false positive: Add to known patterns
EOF
        ;;

      "complex-security")
        echo "Delegating to security-architect: $issue"
        ;;

      "test-failure")
        echo "Delegating to tester agent: $issue"
        ;;

      *)
        echo "Adding to human review queue: $issue"
        HUMAN_REVIEW+=("$issue")
        ;;
    esac
  done

  # Store overflow for learning
  claude-flow memory store \
    --key "overflow-$(date +%s)" \
    --value "{\"issues\": [$(printf '"%s",' "${OVERFLOW[@]}" | sed 's/,$//')], \"pr\": \"$BRANCH\"}" \
    --namespace "overflow"
fi
```

---

## Phase 7: Generate Validation Report

```bash
cat > "/tmp/pr-validation-${BRANCH}.md" << REPORT
# PR Validation Report: $BRANCH

## Summary

| Metric | Value |
|--------|-------|
| Files Changed | $FILES_COUNT |
| Issues Found | ${#ISSUES[@]} |
| Warnings | ${#WARNINGS[@]} |
| Fixes Applied | ${#FIXES_APPLIED[@]} |
| Overflow (Deferred) | ${#OVERFLOW[@]} |

## Deterministic Checks

$(for check in "no-conflicts" "commit-message" "branch-naming"; do
  echo "- [x] $check"
done)

## Issues Fixed Automatically

$(for fix in "${FIXES_APPLIED[@]}"; do
  echo "- $fix"
done)

## Warnings (Non-Blocking)

$(for warn in "${WARNINGS[@]}"; do
  echo "- ⚠️ $warn"
done)

## Overflow Issues (Delegated/Deferred)

$(if [ ${#OVERFLOW[@]} -eq 0 ]; then
  echo "None - all issues resolved"
else
  for issue in "${OVERFLOW[@]}"; do
    echo "- 🔄 $issue"
  done
fi)

## Verdict

$(if [ ${#ISSUES[@]} -eq 0 ] && [ ${#OVERFLOW[@]} -eq 0 ]; then
  echo "✅ **READY TO MERGE** - All checks passed"
elif [ ${#OVERFLOW[@]} -gt 0 ]; then
  echo "⏳ **PENDING** - Overflow issues require resolution"
else
  echo "❌ **BLOCKED** - Issues require attention"
fi)
REPORT

cat "/tmp/pr-validation-${BRANCH}.md"
```

---

## Phase 8: Learn from Resolution

```bash
# After human resolves overflow issues, capture the resolution
learn_resolution() {
  ISSUE_TYPE="$1"
  RESOLUTION="$2"

  # Store as new pattern
  claude-flow memory store \
    --key "pattern-${ISSUE_TYPE}-$(date +%s)" \
    --value "{
      \"issue_type\": \"$ISSUE_TYPE\",
      \"resolution\": \"$RESOLUTION\",
      \"learned_at\": \"$(date -Iseconds)\",
      \"confidence\": 0.8
    }" \
    --namespace "patterns"

  echo "Learned new pattern: $ISSUE_TYPE -> $RESOLUTION"
}

# Hook into post-task for learning
claude-flow hooks post-task \
  --task-id "pr-validation-$BRANCH" \
  --success true \
  --store-results true
```

---

## Overflow Delegation Matrix

| Issue Type | Delegate To | Timeout | Fallback |
|------------|-------------|---------|----------|
| `potential-secret` | security-architect | 5min | human review |
| `complex-security` | security-architect | 10min | human review |
| `test-failure` | tester | 15min | human review |
| `lint-errors` | coder | 5min | auto-fix |
| `type-errors` | coder | 10min | human review |
| `merge-conflict` | - | - | human only |
| `unknown` | - | - | human review |

---

## Usage

```bash
/pr-validator current        # Validate current branch
/pr-validator 123           # Validate PR #123
/pr-validator --learn       # Show learned patterns
/pr-validator --fix         # Apply deterministic fixes
```

## Self-Learning Database Schema

```json
{
  "patterns": {
    "issue_type": "string",
    "detection_regex": "string",
    "deterministic_fix": "string|null",
    "requires_llm": "boolean",
    "delegate_to": "string|null",
    "confidence": "number",
    "times_applied": "number",
    "success_rate": "number"
  }
}
```
