---
name: autonomous-work
description: Work independently with atomic tasks, quality gates, and automatic simplification
triggers:
  - /auto
  - /work
auto_invoke: session_start
---

# Autonomous Work Protocol

Work independently with high-quality output. Every task is atomic, every change is small, every commit is focused.

## Core Philosophy

```
ATOMIC = One thing, done well, independently verifiable
```

## Task Decomposition

### Rule: If it takes >30 minutes, split it

**Before starting ANY task:**
1. Break into atomic subtasks (5-15 min each)
2. Each subtask must be independently committable
3. Each subtask must have a clear "done" definition

### Atomic Task Template
```
Task: [verb] [specific thing]
Done when: [observable outcome]
Files: [1-3 files max]
Lines: [<200 max]
Test: [how to verify]
```

### Example Decomposition

❌ **Bad: Non-atomic**
```
"Implement user authentication"
```

✅ **Good: Atomic tasks**
```
1. Add User type definition to types.ts
   Done: Type exists, compiles
   Files: src/types.ts
   Lines: ~20

2. Create validatePassword function
   Done: Function passes unit tests
   Files: src/auth/password.ts, tests/auth/password.test.ts
   Lines: ~50

3. Add login endpoint handler
   Done: POST /login returns 200 with token
   Files: src/routes/auth.ts
   Lines: ~40

4. Add login route to router
   Done: Route is registered, responds
   Files: src/index.ts
   Lines: ~5
```

## Autonomous Work Loop

```
┌─────────────────────────────────────────────────────────┐
│                    WORK LOOP                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. PICK atomic task from todo list                     │
│     ↓                                                   │
│  2. READ relevant files (understand context)            │
│     ↓                                                   │
│  3. WRITE code (minimal changes)                        │
│     ↓                                                   │
│  4. SIMPLIFY (apply code-simplifier)                    │
│     ↓                                                   │
│  5. VERIFY (run tests, check types)                     │
│     ↓                                                   │
│  6. COMMIT (small, focused, conventional)               │
│     ↓                                                   │
│  7. NEXT task or PUSH if batch complete                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Quality Gates (Automatic)

Every code change goes through:

| Gate | Check | Auto-fix? |
|------|-------|-----------|
| Types | `tsc --noEmit` | No - fix manually |
| Lint | ESLint/Prettier | Yes - auto-format |
| Tests | `npm test` | No - fix manually |
| Size | <200 lines/commit | No - split task |
| Simplify | Code clarity | Yes - auto-apply |

## Decision Making (No User Input Needed)

### When to proceed without asking:
- Implementation approach is obvious
- Following existing patterns in codebase
- Task is well-defined with clear outcome
- Changes are easily reversible

### When to ask:
- Multiple valid approaches with different tradeoffs
- Changes affect public API
- Uncertainty about requirements
- Destructive or irreversible actions

## Commit Strategy

### Batch Commits
```
Work for 30-60 minutes → 3-6 atomic commits → Push
```

### Commit Size Limits
- **Files**: 1-5 per commit
- **Lines**: 50-200 per commit
- **Scope**: One logical change

### Example Commit Flow
```bash
# After each atomic task:
git add <specific-files>
git commit -m "feat(auth): add validatePassword function"

# After 3-5 commits:
git push  # Hook will show PR summary

# When branch gets large:
./scripts/next-branch.sh  # Creates PR, starts fresh
```

## Self-Verification Checklist

Before marking task complete:

- [ ] Code compiles without errors
- [ ] Tests pass (or written if none existed)
- [ ] No obvious bugs or edge cases missed
- [ ] Code is simplified and readable
- [ ] Commit message is descriptive
- [ ] Changes are minimal (no scope creep)

## Error Recovery

### If something breaks:
1. Don't panic - changes are small and reversible
2. Check git diff to understand what changed
3. Run tests to identify failure
4. Fix or revert the specific change
5. Continue with next atomic task

### If stuck:
1. Commit current progress (WIP is ok)
2. Document what's blocking
3. Move to different atomic task
4. Return later with fresh perspective

## Session Flow

### Start of Session
```
1. Review todo list from previous session
2. Check git status - any uncommitted work?
3. Run tests - is codebase healthy?
4. Pick first atomic task
5. Begin work loop
```

### End of Session
```
1. Commit any completed work
2. Push to create/update PR
3. Update todo list with remaining tasks
4. Note any blockers or decisions needed
```

## Integration with Hooks

This skill works with the git hooks:

| Hook | Purpose |
|------|---------|
| pre-commit | Ensures commit is small enough |
| commit-msg | Validates message format |
| prepare-commit-msg | Shows branch progress |
| pre-push | Ensures PR is reviewable size |

The hooks enforce atomic work - they'll block if changes are too large.

## Metrics for Success

Good autonomous work session:
- ✅ 5-10 atomic commits
- ✅ Each commit <200 lines
- ✅ All tests passing
- ✅ 1-3 PRs created
- ✅ Code is simpler than before
- ✅ No user intervention needed
