# Phase Workflow Template

This document defines the exact workflow for each phase of the package completion mission.

---

## Phase X.1: ADR/DDD Documentation (Planning Only)

### Agents Required
- 1 Researcher
- 1 System Architect
- 1 DDD Domain Expert

### Workflow
1. **Researcher**: Analyze package architecture, patterns, integrations
2. **Architect**: Create ADR-0XX document based on research
3. **DDD Expert**: Create DDD-0XX domain model based on research
4. **Review**: Validate documents meet standards
5. **Commit**: `docs(phase-X.1): add {package} ADR and DDD documentation`

### Quality Gates
- [ ] ADR follows ADR-022 format
- [ ] DDD follows DDD-004 format
- [ ] All sections complete
- [ ] Integration patterns documented
- [ ] Security considerations included
- [ ] Performance targets defined
- [ ] No implementation details (planning only)

### Time: 1.5-2 hours

---

## Phase X.2: Automated Review with Q&A

### Agents Required
- 1 Reviewer (comprehensive analysis)
- 1 Analyst (pros/cons scoring)

### Workflow
1. **Reviewer**: Analyze Phase 1.1 documents and existing code
2. **Generate Q&A**: Create 10-15 questions with:
   - Question text
   - Context and background
   - Option A (recommended with confidence score)
   - Option B (alternative with confidence score)
   - Option C (not recommended with confidence score)
   - Pros/cons for each option
   - Source material links
3. **Document Format**:
   ```markdown
   # {Package} Package Review

   ## Review Question 1: {Topic}
   **Context**: {Background}
   **Recommendation**: Option A (Confidence: X.X/10)

   ### Option A: {Approach} ⭐ RECOMMENDED
   **Confidence**: X.X/10
   **Pros**: [list]
   **Cons**: [list]
   **Why Recommended**: [explanation]

   ### Option B: {Alternative}
   **Confidence**: X.X/10
   **Pros**: [list]
   **Cons**: [list]

   ### Option C: {Not Recommended}
   **Confidence**: X.X/10
   **Why Not Recommended**: [explanation]

   **Source Links**:
   - [ADR-0XX](link)
   - [Existing code](link)
   - [Related docs](link)
   ```

4. **Commit**: `docs(phase-X.2): add {package} automated review with Q&A`

### Quality Gates
- [ ] 10-15 questions generated
- [ ] All questions have 3 options
- [ ] Confidence scores provided
- [ ] Pros/cons for each option
- [ ] Source links included
- [ ] Recommendations clear

### Time: 1-1.5 hours

---

## Phase X.3: Full Implementation

### Agents Required (Swarm)
- 2-3 Coders (parallel implementation)
- 1-2 Testers (test creation)
- 1 Reviewer (quality assurance)
- 1 Performance Engineer (benchmarking)

### Workflow
1. **Plan**: Based on Phase 1.2 review, plan implementation
2. **Implement**:
   - Coder 1: Classes A-C with JSDoc
   - Coder 2: Classes D-F with JSDoc
   - Coder 3: Types and utilities
3. **Test**:
   - Tester 1: Unit tests for classes
   - Tester 2: Integration tests
4. **Benchmark**:
   - Performance Engineer: Create benchmarks, validate targets
5. **Review**:
   - Reviewer: Validate all JSDoc, examples, tests
6. **Generate TypeDoc**: Validate HTML generation
7. **Commit Pattern**:
   - `feat({package}): add JSDoc for {ClassA}`
   - `test({package}): add tests for {ClassA}`
   - `docs({package}): add examples for {ClassA}`
   - Continue for each component...
   - `perf({package}): add benchmarks`
   - `docs({package}): generate TypeDoc`

### Quality Gates
- [ ] 100% JSDoc coverage for public APIs
- [ ] All examples executable
- [ ] All tests passing
- [ ] Benchmarks meet performance targets
- [ ] TypeDoc generates without errors
- [ ] Zero performance regression
- [ ] Security patterns validated

### Time: 4-28 hours (varies by package)

---

## Phase X.4: Review Resolution

### Agents Required
- 1 Coder (implement improvements)
- 1 Reviewer (validate resolution)

### Workflow
1. **Review Phase 1.2**: Read all Q&A recommendations
2. **Implement**: For each recommendation:
   - Apply the recommended option (Option A)
   - Or document why alternative chosen
3. **Test**: Validate all changes
4. **Document**: Create resolution report
   ```markdown
   # {Package} Review Resolution

   ## Issue 1: {Topic}
   **Recommendation**: {Option A}
   **Implemented**: ✅ Yes / ⚠️ Modified / ❌ Deferred
   **Changes**: [description]
   **Validation**: [test results]
   ```
5. **Commit**:
   - `fix({package}): address review issue 1 - {topic}`
   - `fix({package}): address review issue 2 - {topic}`
   - ...
   - `docs(phase-X.4): {package} review resolution complete`

### Quality Gates
- [ ] All recommendations addressed
- [ ] Tests still passing
- [ ] Benchmarks still meeting targets
- [ ] Documentation updated
- [ ] Resolution report complete

### Time: 1-2 hours

---

## Phase X.5: PR Creation and Merge

### Workflow
1. **Push branch**: `git push origin feat/{package}-package-complete`
2. **Create PR**:
   ```bash
   gh pr create \
     --title "feat: complete {package} package JSDoc documentation" \
     --body "$(cat docs/mission/{PACKAGE}-PR-DESCRIPTION.md)"
   ```
3. **Wait for review** (or auto-merge if approved)
4. **Merge to main**
5. **Delete branch**
6. **Move to next package**

### Quality Gates
- [ ] All commits atomic and meaningful
- [ ] Branch rebased on latest main
- [ ] All tests passing
- [ ] CI checks green
- [ ] Documentation complete

### Time: 15-30 minutes

---

## Complete Package Workflow

```
Create branch → Phase X.1 → Phase X.2 → Phase X.3 → Phase X.4 → Create PR → Merge → Next Package
     ↓             1.5h         1h         4-28h        1h          0.5h
   feat/
   {pkg}-
   complete
```

**Total per package**: 8-33.5 hours (varies by complexity)

---

## Decision Points

### After Phase X.2 (Review)
**STOP HERE** for human review of Q&A document before proceeding to implementation.

Options:
1. **Accept all recommendations** → Proceed to Phase X.3 automatically
2. **Modify recommendations** → Update review document, then Phase X.3
3. **Defer package** → Move to next package, return later

### After Phase X.4 (Resolution)
**STOP HERE** for final validation before PR creation.

Options:
1. **Create PR immediately** → Automated merge if approved
2. **Additional changes needed** → Make changes, re-validate
3. **Defer merge** → Save for batch PR later

---

## Mission Continuation Logic

```python
for package in [security, performance, cli_framework, learning]:
    create_branch(f"feat/{package}-package-complete")

    # Phase 1: Planning
    phase_1_1_adr_ddd()
    commit("Phase 1.1 complete")

    # Phase 2: Review
    phase_1_2_review()
    commit("Phase 1.2 complete")
    # DECISION POINT: Human review or auto-proceed

    # Phase 3: Implementation
    phase_1_3_implement()
    commit("Phase 1.3 complete")

    # Phase 4: Resolution
    phase_1_4_resolve()
    commit("Phase 1.4 complete")
    # DECISION POINT: Create PR or defer

    # Phase 5: PR and Merge
    create_pr()
    merge_to_main()

# Mission complete
generate_final_typedoc()
create_release_notes()
```

---

This template ensures consistency across all 4 packages and 16 phases.
