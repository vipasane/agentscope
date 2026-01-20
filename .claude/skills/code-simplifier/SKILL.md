---
name: code-simplifier
description: Improve code clarity, consistency, and maintainability while preserving exact functionality
triggers:
  - /simplify
  - /refactor
  - /cleanup
auto_invoke: after_code_write
---

# Code Simplifier

Improve code quality through strategic refinement. Focus on clarity, consistency, and maintainability while preserving **exact functionality**.

## Core Principles

### 1. Preservation First
**Never change what the code does - only how it does it.**
- All original features, outputs, and behaviors MUST remain intact
- Run tests before AND after any changes
- If no tests exist, verify manually or write tests first

### 2. Clarity Over Brevity
```typescript
// ❌ Avoid nested ternaries
const result = a ? b ? c : d : e ? f : g;

// ✅ Prefer explicit control flow
if (a) {
  return b ? c : d;
}
return e ? f : g;
```

### 3. Strategic Balance
**Avoid over-simplification:**
- Don't remove abstractions that serve a purpose
- Don't sacrifice maintainability for fewer lines
- Don't make code "clever" at the expense of readability

## Simplification Checklist

### Before Starting
- [ ] Read the file completely
- [ ] Understand the purpose and context
- [ ] Run existing tests (if any)
- [ ] Identify recent modifications vs stable code

### During Simplification
- [ ] Remove dead code and unused imports
- [ ] Consolidate duplicate logic
- [ ] Simplify complex conditionals
- [ ] Extract meaningful variable names
- [ ] Add explicit types where missing
- [ ] Ensure consistent formatting

### After Simplification
- [ ] Run tests again - must pass
- [ ] Verify no behavior changes
- [ ] Confirm improved readability
- [ ] Check diff is minimal and focused

## Project Standards

Apply these conventions:

| Aspect | Standard |
|--------|----------|
| Modules | ES modules (`import/export`) |
| Functions | `function` keyword for top-level, arrows for callbacks |
| Types | Explicit return types on exported functions |
| Errors | Explicit error handling, no silent catches |
| React | Functional components with explicit prop types |

## When to Apply

**Auto-invoke after:**
- Writing new functions/classes
- Modifying existing code
- Completing a feature

**Skip when:**
- Debugging (focus on fix first)
- Generated code (don't modify)
- External dependencies

## Example Workflow

```
1. Write/modify code
2. [AUTO] Code simplifier reviews changes
3. [AUTO] Apply improvements (same commit or follow-up)
4. [AUTO] Verify tests pass
5. Commit
```

## Simplification Patterns

### Pattern: Extract Early Returns
```typescript
// Before
function process(data) {
  if (data) {
    if (data.valid) {
      return transform(data);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// After
function process(data) {
  if (!data?.valid) return null;
  return transform(data);
}
```

### Pattern: Consolidate Conditionals
```typescript
// Before
if (user.role === 'admin') return true;
if (user.role === 'moderator') return true;
if (user.role === 'editor') return true;
return false;

// After
const allowedRoles = ['admin', 'moderator', 'editor'];
return allowedRoles.includes(user.role);
```

### Pattern: Remove Redundant Code
```typescript
// Before
const items = [];
for (const item of data) {
  items.push(item);
}
return items;

// After
return [...data];
```

## Integration with Hooks

This skill integrates with git hooks:
- Pre-commit checks code quality
- Commit message validates format
- Pre-push ensures PR size is reasonable

The skill runs BEFORE these checks to ensure code passes quality gates.
