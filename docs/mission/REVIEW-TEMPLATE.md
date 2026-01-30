# {Package} Package Review Template

**Package**: @claude-flow/{package}
**Phase**: X.2 (Automated Review)
**Date**: {date}
**Reviewer**: Claude (Automated Review System)

---

## Executive Summary

**Overall Assessment**: [Brief summary of package state]
**Coverage**: [Current %] → [Target 100%]
**Priority**: [HIGH/MEDIUM/LOW]
**Estimated Effort**: [X hours]

**Key Findings**:
- [Finding 1]
- [Finding 2]
- [Finding 3]

**Recommendations Summary**:
- [High priority items]
- [Medium priority items]
- [Low priority items]

---

## Review Question 1: [Topic]

### Context
[Background information about this decision]

**Current State**: [Description]
**Target State**: [Description]
**Impact**: [Why this matters]

### Options Analysis

#### Option A: [Approach] ⭐ RECOMMENDED
**Confidence Score**: X.X/10

**Pros**:
- ✅ [Benefit 1]
- ✅ [Benefit 2]
- ✅ [Benefit 3]

**Cons**:
- ⚠️ [Drawback 1]
- ⚠️ [Drawback 2]

**Implementation Complexity**: [Low/Medium/High]
**Estimated Time**: [X hours]

**Why Recommended**: [Detailed explanation of why this is the best choice]

#### Option B: [Alternative Approach]
**Confidence Score**: X.X/10

**Pros**:
- ✓ [Benefit 1]
- ✓ [Benefit 2]

**Cons**:
- ❌ [Drawback 1]
- ❌ [Drawback 2]
- ❌ [Drawback 3]

**Why Not Recommended**: [Explanation]

#### Option C: [Another Alternative]
**Confidence Score**: X.X/10

**Pros**:
- ✓ [Benefit 1]

**Cons**:
- ❌ [Major drawback 1]
- ❌ [Major drawback 2]

**Why Not Recommended**: [Explanation]

### Source Materials
- [ADR-0XX: {Title}](../adr/ADR-0XX.md)
- [DDD-0XX: {Title}](../architecture/DDD-0XX.md)
- [Existing Code](../../packages/{package}/src/)
- [Related Documentation](link)

---

## Review Question 2: [Topic]

[Repeat structure above for each question]

---

## Review Question N: [Topic]

[Continue for 10-15 questions total]

---

## Implementation Priority Matrix

### High Priority (Must Have)
| Question | Topic | Estimated Time | Risk |
|----------|-------|----------------|------|
| Q1 | [Topic] | [X hours] | [Low/Med/High] |
| Q3 | [Topic] | [X hours] | [Low/Med/High] |

### Medium Priority (Should Have)
| Question | Topic | Estimated Time | Risk |
|----------|-------|----------------|------|
| Q2 | [Topic] | [X hours] | [Low/Med/High] |
| Q5 | [Topic] | [X hours] | [Low/Med/High] |

### Low Priority (Nice to Have)
| Question | Topic | Estimated Time | Risk |
|----------|-------|----------------|------|
| Q8 | [Topic] | [X hours] | [Low/Med/High] |

---

## Implementation Roadmap

### Phase X.3 Planning

**Total Estimated Time**: [X hours]

**Recommended Sequence**:
1. [Component A] - [X hours] - [Rationale]
2. [Component B] - [X hours] - [Rationale]
3. [Component C] - [X hours] - [Rationale]

**Parallel Tracks**:
- Track 1: [Components A, B] (Coder 1)
- Track 2: [Components C, D] (Coder 2)
- Track 3: [Tests] (Tester)
- Track 4: [Benchmarks] (Performance Engineer)

**Dependencies**:
- [Component B] depends on [Component A]
- [Tests] depend on [all components]

### Risk Assessment

**High Risk Items**:
- [Risk 1]: [Mitigation strategy]
- [Risk 2]: [Mitigation strategy]

**Medium Risk Items**:
- [Risk 3]: [Mitigation strategy]

**Low Risk Items**:
- [Risk 4]: [Acceptable]

---

## Quality Checklist

Use this checklist during Phase X.3 implementation:

### JSDoc Standards
- [ ] All public APIs documented
- [ ] @param tags for all parameters
- [ ] @returns tags for all return values
- [ ] @throws tags for all exceptions
- [ ] @example blocks with executable code
- [ ] @see links to related APIs
- [ ] @security tags where applicable
- [ ] @performance notes where applicable

### Examples
- [ ] At least 1 example per public method
- [ ] Examples compile without errors
- [ ] Examples demonstrate real-world usage
- [ ] Error handling shown in examples
- [ ] Async patterns demonstrated correctly

### Tests
- [ ] Unit tests for all methods
- [ ] Integration tests for workflows
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Performance tests where applicable

### Performance
- [ ] Benchmarks created
- [ ] Performance targets met
- [ ] No regression from baseline
- [ ] Memory usage acceptable
- [ ] Scalability validated

### Security
- [ ] Security patterns documented
- [ ] CVE mitigations noted
- [ ] Input validation shown
- [ ] Safe defaults demonstrated

---

## Appendix: Related Documentation

### ADR Documents
- [ADR-022: Common Core JSDoc](../adr/ADR-022-common-core-jsdoc-architecture.md)
- [ADR-0XX: {Package} Architecture](../adr/ADR-0XX-{package}-architecture.md)

### DDD Models
- [DDD-004: JSDoc Domain](../architecture/DDD-004-common-core-jsdoc-domain.md)
- [DDD-0XX: {Package} Domain](../architecture/DDD-0XX-{package}-domain.md)

### Standards
- [JSDoc Specification](../standards/JSDOC-SPECIFICATION.md)
- [Security Documentation](../security/COMMON-CORE-JSDOC-SECURITY.md)

### Performance
- [JSDoc Performance Impact](../performance/JSDOC-PERFORMANCE-IMPACT.md)
- [Benchmark Results](../performance/JSDOC-BENCHMARK-RESULTS.md)

---

## Approval Section

**Review Status**: [DRAFT/READY/APPROVED]
**Reviewed By**: [Name/System]
**Review Date**: [Date]
**Next Phase**: Phase X.3 (Implementation)

**Recommendations Accepted**: [ ] All / [ ] Modified / [ ] Partial

**Notes**: [Any additional notes or modifications to recommendations]

---

**Template Version**: 1.0
**Last Updated**: 2026-01-26
