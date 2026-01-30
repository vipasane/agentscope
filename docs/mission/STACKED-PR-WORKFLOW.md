# Stacked PR Workflow for Autonomous Missions

**Date**: 2026-01-26
**Status**: ACTIVE
**Applies To**: All autonomous long-running missions

---

## Core Principle

**Break autonomous work into small, reviewable atomic features with stacked PRs to enable continuous progress without blocking on main branch merges.**

---

## Branch Hierarchy

```
main (protected)
  └── feat/package-name (long-running feature branch)
        ├── feat/package-name-atomic-1 → PR to feat/package-name
        ├── feat/package-name-atomic-2 → PR to feat/package-name
        ├── feat/package-name-atomic-3 → PR to feat/package-name
        └── feat/package-name-atomic-4 → PR to feat/package-name

Eventually: feat/package-name → PR to main (after all atomic features reviewed)
```

**Key Rules**:
1. **Feature branch** (A) forks from `main`
2. **Atomic features** (B, C, D...) fork from feature branch (A)
3. **PRs flow**: Atomic → Feature → Main
4. **Continue autonomously**: Don't wait for main merge, fork from feature branch

---

## PR Size Guidelines

### Target: 5-10 Minute Reviews

**Optimal PR Size**:
- **200-500 lines** of meaningful changes (excluding tests)
- **1-3 files** modified (or 1 new feature)
- **One atomic change** that can be understood and reviewed quickly

**Examples of Atomic Features**:
- ✅ Add InputValidator class + tests (200 lines)
- ✅ Add PromptInjectionDetector + tests (300 lines)
- ✅ Add DREAD scoring system + tests (400 lines)
- ❌ Complete security package (6,000 lines) - TOO BIG

---

## Workflow for Package Completion Mission

### Example: Performance Package (Package 2)

**Step 1: Create Feature Branch (from main)**
```bash
git checkout main
git pull origin main
git checkout -b feat/performance-package-complete
```

**Step 2: Phase 2.1 (ADR/DDD) - Single Commit**
```bash
# Create ADR-024 + DDD-006
git add docs/adr/ADR-024*.md docs/architecture/DDD-006*.md
git commit -m "docs(phase-2.1): add performance ADR and DDD"
git push -u origin feat/performance-package-complete
# No PR yet - this is the base
```

**Step 3: Phase 2.2 (Review) - Single Commit**
```bash
# Create review Q&A document
git add docs/reviews/PERFORMANCE-PACKAGE-REVIEW.md
git commit -m "docs(phase-2.2): add performance package review"
git push
# No PR yet - accumulating context
```

**Step 4: Phase 2.3 (Implementation) - BREAK INTO ATOMIC PRs**

Instead of one massive Phase 2.3 commit, create stacked atomic PRs:

**Atomic Feature 1: Performance Monitoring**
```bash
git checkout feat/performance-package-complete
git checkout -b feat/performance-monitoring

# Implement PerformanceMonitor class + tests (~300 lines)
git add src/monitoring/*.ts tests/monitoring/*.test.ts
git commit -m "feat(performance): add PerformanceMonitor with metrics collection"
git push -u origin feat/performance-monitoring

# Create PR: feat/performance-monitoring → feat/performance-package-complete
gh pr create --base feat/performance-package-complete \
  --title "feat(performance): add PerformanceMonitor" \
  --body "Atomic feature: Performance monitoring with metrics collection (300 lines)"
```

**Atomic Feature 2: Benchmark Suite** (fork from feature branch, not main!)
```bash
git checkout feat/performance-package-complete
git checkout -b feat/performance-benchmarks

# Implement benchmark suite + tests (~350 lines)
git add benchmarks/performance/*.bench.ts
git commit -m "feat(performance): add comprehensive benchmark suite"
git push -u origin feat/performance-benchmarks

# Create PR: feat/performance-benchmarks → feat/performance-package-complete
gh pr create --base feat/performance-package-complete \
  --title "feat(performance): add benchmark suite" \
  --body "Atomic feature: Benchmark suite with 50+ tests (350 lines)"
```

**Atomic Feature 3: Optimization Engine**
```bash
git checkout feat/performance-package-complete
git checkout -b feat/performance-optimizer

# Implement PerformanceOptimizer class + tests (~400 lines)
git add src/optimizer/*.ts tests/optimizer/*.test.ts
git commit -m "feat(performance): add PerformanceOptimizer with auto-tuning"
git push -u origin feat/performance-optimizer

# Create PR: feat/performance-optimizer → feat/performance-package-complete
gh pr create --base feat/performance-package-complete \
  --title "feat(performance): add PerformanceOptimizer" \
  --body "Atomic feature: Auto-tuning performance optimizer (400 lines)"
```

**Step 5: Review and Merge Atomic Features**

Human reviews each small PR (5-10 minutes each):
1. Review feat/performance-monitoring → Merge to feat/performance-package-complete
2. Review feat/performance-benchmarks → Merge to feat/performance-package-complete
3. Review feat/performance-optimizer → Merge to feat/performance-package-complete

**Agent continues autonomously** without waiting - forks new work from `feat/performance-package-complete`.

**Step 6: Phase 2.4 (Resolution) + Final PR**
```bash
git checkout feat/performance-package-complete
git pull origin feat/performance-package-complete  # Get merged atomic features

# Create resolution report
git add docs/reviews/PERFORMANCE-PACKAGE-RESOLUTION.md
git commit -m "docs(phase-2.4): add performance package resolution"
git push

# Create final PR: feat/performance-package-complete → main
gh pr create --base main \
  --title "feat(performance): complete performance package" \
  --body "Package 2 complete with 3 atomic features merged and reviewed"
```

---

## Benefits

### For Agent (Autonomous Execution)
- ✅ **No blocking**: Continue work while humans review
- ✅ **Faster iterations**: Don't wait for main branch merges
- ✅ **Clear checkpoints**: Each atomic PR is a checkpoint
- ✅ **Easy rollback**: Revert individual atomic features if needed

### For Human (Review Efficiency)
- ✅ **5-10 minute reviews**: Small, focused changes
- ✅ **Context preserved**: Each PR has clear purpose
- ✅ **Incremental progress**: See progress in small increments
- ✅ **Lower risk**: Small changes easier to validate

---

## Atomic Feature Identification

### How to Identify Atomic Features

**Ask these questions**:
1. Can this be understood in isolation? (Yes = atomic)
2. Can this be tested independently? (Yes = atomic)
3. Can this be reverted without breaking other work? (Yes = atomic)
4. Is this <500 lines of production code? (Yes = atomic)

**Examples from Security Package** (retrospective):

Phase 1.3 should have been 6 atomic PRs:
1. feat/security-jsdoc-validators (200 lines) - Enhanced JSDoc for validators
2. feat/security-prompt-injection (530 lines) - PromptInjectionDetector
3. feat/security-dread-scoring (750 lines) - DREADScorer
4. feat/security-learning-coordinator (730 lines) - SecurityLearningCoordinator
5. feat/security-test-expansion (600 lines) - Expanded test suite
6. feat/security-benchmarks (800 lines) - Performance benchmarks

Each PR → feat/security-package-complete, then feat/security-package-complete → main

---

## Implementation Guidelines

### DO:
- ✅ Fork atomic features from feature branch
- ✅ Keep PRs to 200-500 lines
- ✅ One logical feature per PR
- ✅ Include tests with implementation
- ✅ Create PR immediately after atomic commit
- ✅ Continue autonomously while reviews pending

### DON'T:
- ❌ Fork atomic features from main
- ❌ Create PRs >1,000 lines
- ❌ Mix multiple features in one PR
- ❌ Wait for main branch merge before continuing
- ❌ Create PRs without tests
- ❌ Batch all work into one massive PR

---

## Exception Cases

### When to Create Larger PRs

**Infrastructure/Architecture** (acceptable up to 1,000 lines):
- ADR + DDD documentation (Phase X.1)
- Major refactoring with comprehensive test updates
- CI/CD workflow setup

**Documentation Only** (acceptable >1,000 lines):
- Review Q&A documents (Phase X.2)
- API documentation updates
- Architecture diagrams

**Rule**: If it's code that needs review, keep it small. If it's documentation for context, size is flexible.

---

## Git Branch Management

### Branch Naming Convention

```
feat/<package>-<atomic-feature>
```

**Examples**:
- `feat/performance-monitoring`
- `feat/performance-benchmarks`
- `feat/performance-optimizer`
- `feat/performance-profiler`
- `feat/cli-framework-commands`
- `feat/cli-framework-plugins`
- `feat/learning-patterns`
- `feat/learning-memory`

### Cleanup After Merge

After atomic PR merges to feature branch:
```bash
# Delete merged atomic branch
git branch -d feat/performance-monitoring
git push origin --delete feat/performance-monitoring
```

Feature branch remains until final PR to main.

---

## Retrospective: Security Package

### What We Did (Suboptimal)
```
feat/security-package-complete (6,000 lines in Phase 1.3)
  └── PR #9 → main (LARGE, difficult to review)
```

### What We Should Have Done (Optimal)
```
feat/security-package-complete
  ├── feat/security-jsdoc-validators → PR to feat/security-package-complete
  ├── feat/security-prompt-injection → PR to feat/security-package-complete
  ├── feat/security-dread-scoring → PR to feat/security-package-complete
  ├── feat/security-learning-coordinator → PR to feat/security-package-complete
  ├── feat/security-test-expansion → PR to feat/security-package-complete
  └── feat/security-benchmarks → PR to feat/security-package-complete

Then: feat/security-package-complete → PR to main (already reviewed in pieces)
```

**Lesson Learned**: Apply stacked PR workflow starting with Package 2 (Performance).

---

## Going Forward

**Package 2 (Performance)**: Apply stacked PR workflow
- Feature branch: `feat/performance-package-complete`
- Atomic features: 4-6 small PRs to feature branch
- Final PR: feature branch → main

**Package 3 (CLI Framework)**: Continue pattern
**Package 4 (Learning)**: Continue pattern

**Success Metric**: All PRs reviewable in 5-10 minutes

---

**Status**: ✅ **WORKFLOW ADOPTED**
**Memory**: Stored in `patterns/stacked-pr-workflow`
**Next Package**: Apply to @claude-flow/performance (Package 2)

---

*This workflow enables autonomous progress while maintaining high code quality through frequent, focused reviews.*
