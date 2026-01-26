# ADR-403: Pull Request Comment Management Strategy

## Status
Accepted

## Context

Pull request comments are the primary mechanism for delivering security feedback to developers within their natural workflow. The PR comment strategy must:

1. **Be Actionable**: Developers should understand the issue and how to fix it
2. **Avoid Spam**: Don't overwhelm with too many comments
3. **Provide Context**: Explain why the finding matters
4. **Enable Learning**: Educate developers on secure agent patterns
5. **Support Iteration**: Update comments as code changes
6. **Handle Scale**: Gracefully manage 100+ findings per PR

### GitHub PR Comment Limitations

**Rate Limits**:
- 5,000 API requests/hour (authenticated)
- ~100 requests/minute burst

**UX Constraints**:
- Too many inline comments clutter the PR
- Review comments can become stale if code moves
- GitHub shows newest comments first (hard to track changes)

**API Capabilities**:
- Inline comments on specific lines
- Review-level comments (summary)
- Comment reactions (👍 👎 ❤️)
- Comment resolution (conversation threads)
- Comment editing (update existing comments)

## Decision

We will implement a **tiered comment strategy** based on finding count:

### Tier 1: <10 Findings - Inline Comments

**Strategy**: Post individual inline comments on affected lines

**Format**:
```markdown
🚨 **[CRITICAL] Prompt Injection Vulnerability**

**Description**: User input is directly concatenated into the LLM prompt without sanitization, allowing attackers to inject malicious instructions.

**Impact**: An attacker could bypass agent instructions, extract sensitive data, or cause unintended actions.

**Recommendation**:
\```typescript
// ❌ Vulnerable
const prompt = `Answer this: ${userInput}`;

// ✅ Secure
const prompt = `Answer this: ${sanitizePromptInput(userInput)}`;
\```

**References**:
- [OWASP LLM01: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [AgentScope Security Guide](https://agentscope.dev/security/prompt-injection)

**Rule**: `prompt-injection-001` | **Severity**: Critical | **CWE**: CWE-77

---
*Found by [AgentScope](https://agentscope.dev) | [Why is this a problem?](https://agentscope.dev/docs/rules/prompt-injection-001)*
```

**Benefits**:
- High visibility (comments on exact lines)
- Easy to resolve (GitHub's conversation threads)
- Contextual (fix suggestion shows before/after)

**Implementation**:
```typescript
async function postInlineComments(
  findings: Finding[],
  pr: PullRequest
): Promise<void> {
  for (const finding of findings.slice(0, 10)) {
    await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pr.number,
      body: formatFindingComment(finding),
      commit_id: pr.head.sha,
      path: finding.location.file,
      line: finding.location.line
    });
  }
}
```

### Tier 2: 10-50 Findings - Grouped Summary

**Strategy**: Post summary comment + top 5 inline comments

**Summary Format**:
```markdown
## 🔍 AgentScope Security Scan Results

**Status**: ❌ Failed (3 critical, 12 high, 28 medium findings)

### Critical Findings (3)
1. 🚨 [Prompt Injection](https://github.com/org/repo/blob/abc123/src/agents/chatbot.ts#L42) in `src/agents/chatbot.ts:42`
2. 🚨 [Arbitrary Code Execution](https://github.com/org/repo/blob/abc123/src/tools/executor.ts#L128) in `src/tools/executor.ts:128`
3. 🚨 [Sensitive Data Exposure](https://github.com/org/repo/blob/abc123/src/agents/memory.ts#L93) in `src/agents/memory.ts:93`

### High Findings (12)
- ⚠️ Missing Input Validation (5 instances)
  - `src/api/handler.ts:23, 45, 67`
  - `src/agents/validator.ts:12, 34`
- ⚠️ Insecure Tool Configuration (4 instances)
  - `src/tools/*.ts` (multiple files)
- ⚠️ Weak Authentication (3 instances)
  - `src/auth/*.ts`

### Medium Findings (28)
<details>
<summary>Click to expand</summary>

- ℹ️ Missing Error Handling (15 instances)
- ℹ️ Hardcoded Configuration (8 instances)
- ℹ️ Deprecated API Usage (5 instances)

</details>

---

[📊 View all findings in Code Scanning →](https://github.com/org/repo/security/code-scanning?ref=pr-123)

**Next steps**:
1. ✅ Fix critical findings to unblock merge (required)
2. ⚠️ Review high findings for this PR scope (recommended)
3. ℹ️ Create issues for medium findings (optional)

---
*Scanned by [AgentScope v1.0](https://agentscope.dev) in 2m 34s*
```

**Benefits**:
- Reduces clutter (1 summary vs 50 comments)
- Prioritized (critical shown first)
- Grouped by type (easier to understand patterns)
- Expandable details (collapsible sections)

**Implementation**:
```typescript
async function postSummaryComment(
  findings: Finding[],
  pr: PullRequest
): Promise<void> {
  const summary = generateSummaryMarkdown(findings);

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pr.number,
    body: summary
  });

  // Post top 5 critical/high findings inline
  const topFindings = findings
    .filter(f => ['critical', 'high'].includes(f.severity))
    .slice(0, 5);

  for (const finding of topFindings) {
    await postInlineComment(finding, pr);
  }
}
```

### Tier 3: 50+ Findings - Link to SARIF

**Strategy**: Single summary comment with link to Code Scanning

**Format**:
```markdown
## 🔍 AgentScope Security Scan Results

**Status**: ❌ Failed (125 findings across 45 files)

**This PR has a large number of security findings. To avoid overwhelming the PR, detailed results are available in Code Scanning.**

### Summary by Severity
- 🚨 **Critical**: 8 findings
- ⚠️ **High**: 34 findings
- ℹ️ **Medium**: 67 findings
- 💡 **Low**: 16 findings

### Top 3 Critical Issues
1. 🚨 **Prompt Injection** in `src/agents/chatbot.ts:42`
2. 🚨 **Arbitrary Code Execution** in `src/tools/executor.ts:128`
3. 🚨 **SQL Injection** in `src/db/query.ts:56`

---

📊 **[View all 125 findings in Code Scanning →](https://github.com/org/repo/security/code-scanning?ref=pr-123)**

**Recommendation**: Focus on critical findings first. Consider splitting this PR into smaller, more reviewable changes.

---
*Scanned by [AgentScope v1.0](https://agentscope.dev)*
```

**Benefits**:
- Avoids spam (single comment vs 125)
- Clear call-to-action (view in Code Scanning)
- Encourages smaller PRs (best practice)

### Comment Lifecycle Management

**Update Strategy**:
```typescript
async function updateExistingComment(
  finding: Finding,
  existingComment: Comment,
  currentStatus: 'fixed' | 'still-present' | 'moved'
): Promise<void> {
  let updatedBody = existingComment.body;

  if (currentStatus === 'fixed') {
    updatedBody = `✅ **Fixed in ${commitSha}**\n\n${existingComment.body}`;
  } else if (currentStatus === 'still-present') {
    updatedBody = `⚠️ **Still present as of ${commitSha}**\n\n${existingComment.body}`;
  } else if (currentStatus === 'moved') {
    updatedBody = `📝 **Code moved to line ${newLine}**\n\n${existingComment.body}`;
  }

  await octokit.pulls.updateReviewComment({
    owner,
    repo,
    comment_id: existingComment.id,
    body: updatedBody
  });
}
```

**Lifecycle States**:
1. **New finding** → Post new comment
2. **Fixed finding** → Prepend ✅ banner, mark resolved
3. **Still present** → Prepend ⚠️ banner
4. **Code moved** → Update line number, prepend 📝 banner
5. **False positive** → Respect `// agentscope-ignore` suppression

### Comment Grouping by File

**Optimization**: Group multiple findings in same file into single comment

**Format**:
```markdown
## 🔍 Security Findings in `src/agents/chatbot.ts`

**3 issues found in this file:**

### 1. 🚨 Prompt Injection (Line 42)
<details>
<summary>Click for details</summary>

[Full finding details...]

</details>

### 2. ⚠️ Missing Input Validation (Line 58)
<details>
<summary>Click for details</summary>

[Full finding details...]

</details>

### 3. ℹ️ Hardcoded API Key (Line 73)
<details>
<summary>Click for details</summary>

[Full finding details...]

</details>

---
*Found by [AgentScope](https://agentscope.dev)*
```

**Benefits**:
- Reduces comment count by 3x (3 findings → 1 comment)
- Contextual grouping (see all issues in a file)
- Collapsible details (avoid wall of text)

## Consequences

### Positive

1. **Developer-Friendly**: Findings appear in natural workflow (PR review)
2. **Actionable**: Fix suggestions with before/after code
3. **Educational**: Explanations and references to learn more
4. **Scalable**: Tiered strategy handles 1-1000 findings gracefully
5. **Non-Intrusive**: Grouping and collapsing prevent spam
6. **Persistent**: Comments remain as documentation of security review

### Negative

1. **Stale Comments**: Comments may become outdated if code changes significantly
   - **Mitigation**: Update comments on re-scan, mark as "code moved"
2. **API Rate Limits**: Many findings can exhaust quota
   - **Mitigation**: Batching, grouping, SARIF fallback
3. **Notification Noise**: Developers get GitHub notifications for each comment
   - **Mitigation**: Summary comment reduces notification count

### Neutral

1. **Comment Permanence**: Comments persist after merge (good for audit, bad for clutter)
2. **External Links**: Links to Code Scanning require repository access
3. **Markdown Formatting**: Relies on GitHub's Markdown renderer

## Related Decisions

- ADR-401: Native GitHub Integration Architecture
- ADR-402: GitHub Actions Workflow Design
- ADR-404: SARIF Generation Format

## References

- [GitHub Pull Request Review API](https://docs.github.com/en/rest/pulls/comments)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Octokit PR Comments](https://octokit.github.io/rest.js/v20#pulls-create-review-comment)
