# AgentScope v1.2 Reorganization Decisions
## Date: 2026-01-25
## Status: APPROVED

---

## Executive Summary

**Decision:** Refocus AgentScope v1.2 on **agent scanning only** (Claude Code, Cursor, Gemini CLI), extracting DevContainer scanning to a separate project.

**Confidence:** 85% overall
**Timeline:** 2-week alpha release (v1.2.0-alpha.1)
**Effort:** 8 hours reorganization + 2 weeks implementation

---

## Strategic Decisions

### 1. Product Scope ✅
**Decision:** AgentScope scans coding agents ONLY (not containers/infrastructure)
- **Confidence:** 95%
- **Rationale:** Clear positioning, focused development, serves AI developer audience
- **Source:** [SCOPE.md](../SCOPE.md)

### 2. DevContainer Scanner Handling ✅
**Decision:** Keep in `/export/` folder for future consideration
- **Confidence:** 75%
- **Action:** Preserve 9,439 lines of work, review in 3-6 months
- **Source:** [DevContainer Export Package](../../export/devcontainer-scanner-project/)

### 3. v1.2 Timeline ✅
**Decision:** Ship v1.2-alpha in 2 weeks (core features only)
- **Confidence:** 85%
- **Scope:**
  - Week 1: ADR-016 (Claude Code security)
  - Week 2: ADR-017 (CLAUDE.md injection detection)
  - Already done: Enhanced docs, templates, multi-file
- **Source:** [MASTER-PLAN.md](../MASTER-PLAN.md)

---

## Feature Decisions

### 4. Security Features ✅
**Decision:** Implement ADR-016 + ADR-017 in v1.2, defer ADR-018 to v1.3
- **Confidence:** 85%
- **v1.2 (Critical):**
  - ✅ ADR-016: Claude Code settings validation
  - ✅ ADR-017: CLAUDE.md prompt injection detection
- **v1.3 (High Priority):**
  - ⏳ ADR-018: MCP server security scanning
  - ⏳ Hook security validation
  - ⏳ Permission analysis
- **Source:** [ADR-016](ADR-016-claude-code-security-validation.md), [ADR-017](ADR-017-claude-md-prompt-injection-detection.md)

### 5. Multi-Platform Support ✅
**Decision:** Postpone to v1.3
- **Confidence:** 75%
- **Rationale:** Focus v1.2 on Claude Code + security, validate approach first
- **Timeline:** Add Cursor/Gemini CLI support in Q2 2026

### 6. Security Technology Stack ✅
**Decision:** Zod + Regex + AIDefence (hybrid approach)
- **Confidence:** 90%
- **Performance:** <520ms scan time, 96% accuracy, 3% false positives
- **Source:** [Security Technology Decisions](../architecture/security-technology-decisions.md)

### 7. DREAD Score Display ✅
**Decision:** Hide by default, show on `--verbose`
- **Confidence:** 80%
- **User Experience:** Simple reports by default, technical details on demand

---

## Documentation Decisions

### 8. Documentation Volume ✅
**Decision:** 48 planning documents is appropriate
- **Confidence:** 75%
- **Rationale:** Complex reorganization requires thorough documentation
- **Navigation:** [START-HERE-REORGANIZATION.md](START-HERE-REORGANIZATION.md)

### 9. Public Communication ✅
**Decision:** All of the above (blog + npm + CHANGELOG + GitHub)
- **Confidence:** 90%
- **Timeline:** After v1.2-alpha ships (Week 3)

### 10. Rejected ADRs ✅
**Decision:** Keep them as audit trail
- **Confidence:** 85%
- **Status:** Already marked "REJECTED - OUT OF SCOPE"
- **Files:** ADR-008, ADR-009, ADR-011

---

## Technical Decisions

### 11. Build Issues ✅
**Decision:** Fix as part of v1.2 implementation (not immediately)
- **Confidence:** 90%
- **Rationale:** Issues are in planning artifacts (DevContainer code), will be removed
- **Source:** [IMMEDIATE-ACTION-PLAN.md](../../IMMEDIATE-ACTION-PLAN.md)

### 12. DevContainer Security Code ✅
**Decision:** Move to `/export/devcontainer-scanner-project/`
- **Confidence:** 95%
- **Files:** devcontainer-validators.ts (531 lines), devcontainer-sanitizers.ts (399 lines)
- **Action:** Delete from AgentScope, preserve in export

---

## Execution Decisions

### 13. Reorganization Execution ✅
**Decision:** Execute 8-hour reorganization plan now
- **Confidence:** 90%
- **Plan:** 12 tasks across 4 phases
- **Source:** [REORGANIZATION-PLAN.md](REORGANIZATION-PLAN.md), [EXECUTION-COORDINATION.md](EXECUTION-COORDINATION.md)

### 14. File Extraction Strategy ✅
**Decision:** Move (not delete) 13 DevContainer files to `/export/`
- **Confidence:** 90%
- **Files:** ADRs, research, security docs, source code, examples
- **Source:** [v1.2-SEPARATION-INVENTORY.md](v1.2-SEPARATION-INVENTORY.md)

---

## Release Decisions

### 15. Release Strategy ✅
**Decision:** Ship v1.2-alpha in 2 weeks (incremental)
- **Confidence:** 85%
- **Scope:**
  - ✅ Enhanced documentation (done)
  - ✅ Multi-file categories (done)
  - ✅ Template generation (done)
  - 🆕 ADR-016 implementation (Week 1)
  - 🆕 ADR-017 implementation (Week 2)

### 16. v1.2-alpha Features ✅
**Decision:** 5 features in alpha release
- **Included:** Enhanced docs, multi-file, templates, ADR-016, ADR-017
- **Deferred to v1.3:** MCP security, delegation chain analysis, multi-platform

### 17. DevContainer Scanner Release ✅
**Decision:** Release after AgentScope v1.2 (Q2 2026)
- **Confidence:** 80%
- **Rationale:** Focus marketing on one product, validate market demand first

---

## Git & Version Control Decisions

### 18. Commit Strategy ✅
**Decision:** Keep both existing commits (shows evolution)
- **Confidence:** 70%
- **Action:** Add commit #3 with reorganization cleanup

### 19. PR Timing ✅
**Decision:** Clean up first, then create PR
- **Confidence:** 90%
- **Timeline:** PR ready by end of Week 1

### 20. Reorganization Commit ✅
**Decision:** Commit to same branch (feat/v1.2-devcontainer-adr-ddd)
- **Confidence:** 85%
- **Message:** "refactor(v1.2): separate DevContainer scanning to standalone project"

---

## Communication Decisions

### 21. Stakeholder Communication ✅
**Decision:** All stakeholders (staged approach)
- **Confidence:** 95%
- **Timeline:**
  - Now: Internal team
  - Week 2: Contributors
  - Week 3: Users (when v1.2-alpha ships)

### 22. Team Review ✅
**Decision:** Executive summaries only (30 min read)
- **Confidence:** 80%
- **Documents:** 4 key summaries vs. all 48 docs

---

## Priority Decisions

### 23. Immediate Next Action ✅
**Decision:** Commit reorganization work (execute 8-hour plan)
- **Confidence:** 90%
- **Deliverable:** Clean codebase with agent-only focus

### 24. #1 Priority ✅
**Decision:** Clean separation (reorganization before implementation)
- **Confidence:** 95%
- **Timeline:** Day 1 (8 hours)

### 25. Overall Execution Plan ✅
**Decision:** Execute reorganization now, then implement v1.2-alpha
- **Confidence:** 90%
- **Plan:**
  1. Day 1: Reorganization (8 hours)
  2. Week 1: ADR-016 implementation
  3. Week 2: ADR-017 implementation
  4. Week 3: Release v1.2.0-alpha.1

---

## Implementation Priorities

### Phase 1: Reorganization (Day 1 - 8 hours)
1. Extract 13 DevContainer files to `/export/`
2. Update 9 AgentScope docs
3. Remove DevContainer references
4. Verify clean build

### Phase 2: v1.2-alpha (Week 1-2)
1. **Week 1:** ADR-016 - Claude Code security validation
2. **Week 2:** ADR-017 - CLAUDE.md prompt injection detection
3. Comprehensive testing
4. Documentation updates

### Phase 3: Release (Week 3)
1. Create PR for review
2. Address feedback
3. Publish v1.2.0-alpha.1
4. Announce scope change

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Reorganization Complete** | 100% | Day 1 |
| **Security Features Implemented** | 2/5 (ADR-016, ADR-017) | Week 2 |
| **Test Coverage** | >90% | Week 2 |
| **Security Detection Accuracy** | >96% | Week 2 |
| **False Positive Rate** | <3% | Week 2 |
| **Scan Performance** | <520ms | Week 2 |
| **v1.2-alpha Release** | Published | Week 3 |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Timeline slip | Medium | Medium | Incremental alpha releases |
| Security FP rate | Low | Medium | Comprehensive testing + user feedback |
| Community confusion | Medium | Low | Clear communication plan |
| DevContainer Scanner forgotten | High | Low | Review in Q2 2026 |
| Scope creep returns | Low | High | SCOPE.md as boundary document |

---

## Approval

- **Decision Date:** 2026-01-25
- **Approved By:** User (via interactive review)
- **Implementation Start:** 2026-01-25 (immediate)
- **Next Review:** Week 2 (after ADR-016 & ADR-017 implementation)

---

## Related Documents

**Strategic:**
- [SCOPE.md](../SCOPE.md) - Product boundaries
- [SCOPE-CORRECTION-SUMMARY.md](SCOPE-CORRECTION-SUMMARY.md) - Why scope changed
- [V1.2-EXTRACTION-SUMMARY.md](../../V1.2-EXTRACTION-SUMMARY.md) - 80/20 analysis

**Planning:**
- [REORGANIZATION-PLAN.md](REORGANIZATION-PLAN.md) - 12-task execution plan
- [MASTER-PLAN.md](../MASTER-PLAN.md) - Complete v1.2 plan
- [v1.2-TASKS.md](../v1.2-TASKS.md) - 26 atomic tasks

**Technical:**
- [ADR-015](ADR-015-scope-correction-agent-scanning-only.md) - Scope correction ADR
- [ADR-016](ADR-016-claude-code-security-validation.md) - Claude Code security
- [ADR-017](ADR-017-claude-md-prompt-injection-detection.md) - Prompt injection detection
- [Security Technology Decisions](../architecture/security-technology-decisions.md) - Tech stack

**Execution:**
- [EXECUTION-COORDINATION.md](EXECUTION-COORDINATION.md) - Hour-by-hour plan
- [IMMEDIATE-ACTION-PLAN.md](../../IMMEDIATE-ACTION-PLAN.md) - Recovery options

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-25 | Initial decisions document | Capture approved recommendations |

---

**Status:** ✅ APPROVED - Ready for execution
