# Definition of Done (DoD)

This document defines when a feature, bug fix, or task is considered complete and ready for release.

## Purpose

The Definition of Done ensures:
- Consistent quality across all contributions
- Clear expectations for contributors
- Reduced rework and technical debt
- Predictable release quality

## DoD Checklist

### Code Quality

| Criterion | Required | Verification |
|-----------|----------|--------------|
| Follows project style guide | Yes | `npm run lint` |
| No TypeScript errors | Yes | `npm run typecheck` |
| No linting warnings | Yes | `npm run lint` |
| Self-reviewed for clarity | Yes | Manual |
| No TODO comments left | Yes | Manual search |

### Testing (TDD Required)

| Criterion | Required | Verification |
|-----------|----------|--------------|
| Tests written BEFORE code | Yes | PR timeline |
| All tests passing | Yes | `npm test` |
| Code coverage >= 80% | Yes | Coverage report |
| Unit tests for new functions | Yes | Test file exists |
| Integration tests for features | Yes | Test file exists |
| Edge cases covered | Yes | Code review |
| Snapshot tests for diagrams | If applicable | Snapshot files |

### Documentation

| Criterion | Required | Verification |
|-----------|----------|--------------|
| Code comments for complex logic | Yes | Code review |
| README updated (if user-facing) | If applicable | Manual |
| CHANGELOG updated | Yes | `[Unreleased]` section |
| API docs updated | If applicable | Docs folder |
| JSDoc on public functions | Yes | Code review |

### Compliance

| Criterion | Required | Verification |
|-----------|----------|--------------|
| DCO sign-off on all commits | Yes | `git log` check |
| Conventional commit format | Yes | Commit hook |
| No secrets in code | Yes | Pre-commit hook |
| No hardcoded paths | Yes | Code review |
| Dependencies from trusted sources | Yes | Manual review |

### Review

| Criterion | Required | Verification |
|-----------|----------|--------------|
| PR template completed | Yes | PR checklist |
| All CI checks passing | Yes | GitHub Actions |
| AI review feedback addressed | Yes | PR comments |
| At least one human approval | Yes | GitHub review |
| No unresolved conversations | Yes | PR status |

### Deployment Ready

| Criterion | Required | Verification |
|-----------|----------|--------------|
| Works in clean environment | Yes | CI build |
| No regression in existing features | Yes | Test suite |
| Performance acceptable | Yes | Benchmark (if applicable) |
| Backward compatible (or documented) | Yes | Code review |

## PR Size Guidelines

| Size | Lines Changed | Review Expectation |
|------|---------------|-------------------|
| Small | < 100 | Quick review, same day |
| Medium | 100-300 | Standard review |
| Large | 300-500 | May need splitting |
| X-Large | > 500 | Must be split |

## Exceptions

In rare cases, a DoD item may be waived:
1. Document the reason in the PR
2. Get explicit maintainer approval
3. Create a follow-up issue for missing items

## Quick Reference Card

```
Before PR:
  [ ] Tests written and passing
  [ ] Code coverage >= 80%
  [ ] Lint and typecheck clean
  [ ] CHANGELOG updated
  [ ] Commits signed (DCO)

During Review:
  [ ] PR template complete
  [ ] CI checks green
  [ ] Review feedback addressed

Before Merge:
  [ ] Human approval received
  [ ] No unresolved comments
  [ ] Branch up to date
```

---

*Last updated: January 2026*
