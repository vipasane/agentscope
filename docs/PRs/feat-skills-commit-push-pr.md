# PR: feat/architecture-v2-entities

> **Base Branch**: main
> **Created**: 2026-01-20
> **Status**: Ready for Review

## Executive Summary

This PR introduces comprehensive architecture documentation (DDD, ADRs, Security) and two self-learning skills for automated commit/push/PR workflows. Key features include:

1. **Deterministic-first processing** - Run deterministic checks before using LLM
2. **Overflow handling** - Defer unresolved issues to later phases
3. **Self-learning patterns** - Store and reuse successful fixes
4. **`.secretsignore` exclusion list** - Proper handling of false positives without --no-verify

## Human Review Required

- [ ] Skills follow Claude Code skill format correctly
- [ ] Deterministic-first principle is clear and actionable
- [ ] Overflow handling logic is sound
- [ ] Learned patterns database schema is appropriate

## Changes

| File | Type | Description |
|------|------|-------------|
| `.claude/skills/commit-push-pr/SKILL.md` | Added | Full commit→push→stacked PR workflow with 9 phases |
| `.claude/skills/pr-validator/SKILL.md` | Added | PR validation with deterministic checks + self-learning |
| `CLAUDE.md` | Modified | Added "Deterministic First Principle" section |
| `.claude/memory.db` | Added | Memory database symlink for pattern storage |
| `.secretsignore` | Added | Exclusion list for false positive handling |
| `.claude/hooks/setup-hooks.sh` | Modified | Updated pre-commit hook with exclusion support |

## Key Features

### 1. Deterministic First Principle
- Run deterministic checks before using LLM
- Pattern matching from learned database
- LLM only for semantic understanding

### 2. Overflow Handling
- Issues that can't be resolved → defer to later phases
- Delegation matrix for specialized agents
- Learning loop captures resolutions

### 3. Self-Learning
- Stores successful patterns with confidence scores
- Learns from human resolutions
- Secret detection false positive now in pattern database

## Learned Patterns Stored

| Pattern | Issue Type | Deterministic Fix |
|---------|------------|-------------------|
| `pattern-secret-detection-docs` | Regex patterns in security docs | Replace with `EXAMPLE_*` |
| `pattern-trailing-whitespace` | Whitespace issues | `sed` removal |
| `pattern-missing-pr-summary` | No PR summary file | Generate template |

## Testing

- [x] Skills created in correct format
- [x] CLAUDE.md updated with new principle
- [x] Memory patterns stored successfully
- [ ] End-to-end workflow test (this PR)

## Potential Issues

1. **Memory database path**: Uses `.claude/memory.db` symlink to `.swarm/memory.db`
2. **Skill activation**: Skills need to be invoked with `/commit-push-pr` or `/pr-validator`

## .secretsignore Exclusion System

The new `.secretsignore` file supports three exclusion types:

| Type | Format | Example |
|------|--------|---------|
| File paths | `path/to/file` | `docs/architecture/SECURITY-ARCHITECTURE.md` |
| Line patterns | `PATTERN:<regex>` | `PATTERN:/sk-ant-` |
| Context patterns | `CONTEXT:<text>` | `CONTEXT:EXAMPLE_` |

This replaces the need for `--no-verify` when dealing with known false positives.

## Related

- Addresses: Secret detection false positive from previous commit
- Enables: Automated PR workflow with learning
- References: `docs/architecture/PLAN-CRITICAL-REVIEW.md` (simplification recommendation)
