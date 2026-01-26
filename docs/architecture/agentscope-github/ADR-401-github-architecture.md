# ADR-401: Native GitHub Integration Architecture

## Status
Accepted

## Context

AgentScope-GitHub requires deep integration with GitHub's platform to deliver AI agent security scanning within the native developer workflow. The integration must support:

1. **GitHub Actions**: Primary runtime for scanning agent codebases
2. **Pull Request Comments**: Inline security findings on affected code lines
3. **Code Scanning**: SARIF upload for native Security tab integration
4. **Status Checks**: Automated pass/fail gates for branch protection
5. **Scalability**: Handle repositories with 100,000+ files
6. **Performance**: Complete scans in <5 minutes for typical repos
7. **Privacy**: All scanning local (no code upload to external services)

### GitHub Platform Constraints

**API Rate Limits** (authenticated token):
- Primary: 5,000 requests/hour
- Secondary: ~100 requests/minute (burst)
- SARIF uploads: 1,000/hour

**GitHub Actions Limits**:
- 6-hour timeout per job
- 20 concurrent jobs per repository
- Private repos: Minutes quota based on plan

**SARIF Constraints**:
- Max file size: 10 MB
- Format: SARIF 2.1.0
- Must include rule metadata and locations

### Requirements

1. **Native UX**: Security findings must appear in GitHub's UI (no external dashboards)
2. **Zero Configuration**: Work out-of-the-box with sensible defaults
3. **Developer-Friendly**: Actionable feedback with fix suggestions
4. **Automated Gates**: Block PRs when critical vulnerabilities detected
5. **Compliance**: Support audit trails and reporting for enterprise

## Decision

We will implement a **GitHub Actions-first architecture** with the following components:

### 1. GitHub Action Entry Point

**Component**: `agentscope/scan-action@v1`

**Responsibilities**:
- Execute AgentScope Core security scanner
- Load configuration (`.agentscope.json` + workflow inputs)
- Generate SARIF output
- Orchestrate GitHub API integrations

**Implementation**:
```yaml
# action.yml
name: 'AgentScope Security Scan'
description: 'AI agent security scanning for GitHub'
author: 'AgentScope Team'
branding:
  icon: 'shield'
  color: 'blue'

inputs:
  config-file:
    description: 'Path to .agentscope.json'
    default: '.agentscope.json'
  severity-threshold:
    description: 'Minimum severity to report'
    default: 'medium'
  fail-on:
    description: 'Severity that fails check'
    default: 'critical'
  upload-sarif:
    description: 'Upload to Code Scanning'
    default: 'true'
  comment-pr:
    description: 'Post PR comments'
    default: 'true'

outputs:
  findings-count:
    description: 'Total findings'
  critical-count:
    description: 'Critical findings'
  passed:
    description: 'Whether scan passed'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 2. GitHub Integrator

**Component**: `src/github-integrator.ts`

**Responsibilities**:
- Post PR comments via Octokit
- Upload SARIF to Code Scanning API
- Create/update Check Runs
- Handle rate limiting with exponential backoff

**Key Interfaces**:
```typescript
interface GitHubIntegrator {
  commentOnPR(findings: Finding[]): Promise<void>;
  uploadSARIF(sarifPath: string): Promise<string>;
  createCheckRun(findings: Finding[], passed: boolean): Promise<void>;
}
```

### 3. SARIF Generator

**Component**: `src/sarif-generator.ts`

**Responsibilities**:
- Convert AgentScope findings to SARIF 2.1.0
- Include fix suggestions as SARIF fixes
- Add rule metadata and help URLs
- Optimize for <10 MB size limit

**Format**:
```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "AgentScope",
        "rules": [...]
      }
    },
    "results": [...]
  }]
}
```

### 4. Configuration Loader

**Component**: `src/config-loader.ts`

**Responsibilities**:
- Load `.agentscope.json` from repository
- Merge with workflow inputs (inputs take precedence)
- Validate against JSON schema
- Apply defaults

### 5. AgentScope Core Wrapper

**Component**: `src/scanner-wrapper.ts`

**Responsibilities**:
- Invoke AgentScope Core scanner
- Filter findings based on severity threshold
- Handle delta scanning (only changed files in PRs)
- Cache previous results for performance

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              GitHub Platform                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ Actions  │  │ PR       │  │ Code         │     │
│  │ Runner   │  │ Comments │  │ Scanning     │     │
│  └────┬─────┘  └────▲─────┘  └────▲─────────┘     │
└───────┼─────────────┼─────────────┼────────────────┘
        │             │             │
        │             │             │
┌───────▼─────────────┼─────────────┼────────────────┐
│    AgentScope-GitHub Action                        │
│                     │             │                │
│  ┌─────────────────────────────────────────┐      │
│  │  Action Entry (action.yml)              │      │
│  └───────────┬─────────────────────────────┘      │
│              │                                     │
│  ┌───────────▼─────────────────────────────┐      │
│  │  Config Loader (.agentscope.json)       │      │
│  └───────────┬─────────────────────────────┘      │
│              │                                     │
│  ┌───────────▼─────────────────────────────┐      │
│  │  Scanner Wrapper (AgentScope Core)      │      │
│  │  - Rule execution                        │      │
│  │  - AST analysis                          │      │
│  │  - Delta scanning                        │      │
│  └───────────┬─────────────────────────────┘      │
│              │                                     │
│  ┌───────────▼─────────────────────────────┐      │
│  │  SARIF Generator                        │      │
│  │  - Convert findings                     │      │
│  │  - Add metadata                         │      │
│  │  - Generate fixes                       │      │
│  └───────────┬─────────────────────────────┘      │
│              │                                     │
│  ┌───────────▼─────────────────────────────┐      │
│  │  GitHub Integrator (Octokit)            │      │
│  │  ┌────────────────────┐                 │      │
│  │  │ PR Commenter       │─────────────────┼──────┘
│  │  └────────────────────┘                 │
│  │  ┌────────────────────┐                 │
│  │  │ SARIF Uploader     │─────────────────┼──────┘
│  │  └────────────────────┘                 │
│  │  ┌────────────────────┐                 │
│  │  │ Check Run Creator  │                 │
│  │  └────────────────────┘                 │
│  └────────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

### Data Flow

**PR Scan Flow**:
1. Developer opens PR → Triggers workflow
2. Action checks out code
3. Config loader merges `.agentscope.json` + inputs
4. Scanner wrapper analyzes changed files (delta mode)
5. SARIF generator converts findings
6. GitHub integrator posts:
   - PR comments (inline + summary)
   - SARIF upload (Code Scanning)
   - Check run (pass/fail)

**Scheduled Audit Flow**:
1. Cron trigger → Runs full scan
2. Full repository analysis (no delta)
3. SARIF upload (trend analysis)
4. Optional: Slack/email notification

### Rate Limiting Strategy

**Mitigation**:
1. **Batching**: Group PR comments (max 10 inline, rest in summary)
2. **Caching**: Store previous scan results (delta comparison)
3. **Backoff**: Exponential retry on 429 responses
4. **Monitoring**: Track quota usage, warn at 80%

**Implementation**:
```typescript
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset']);
        const waitTime = Math.max(0, resetTime * 1000 - Date.now());
        await sleep(waitTime);
        retries++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Rate limit exceeded');
}
```

## Consequences

### Positive

1. **Native UX**: Security integrated directly into GitHub workflow (no context switching)
2. **Privacy-First**: All scanning runs in GitHub Actions (no code upload)
3. **Scalable**: Leverages GitHub Actions infrastructure (20 concurrent jobs/repo)
4. **Automated**: Status checks enforce security gates without manual intervention
5. **Discoverable**: GitHub Marketplace distribution (search, featured listings)
6. **Cost-Effective**: Free for public repos, included in Actions minutes for private repos

### Negative

1. **API Rate Limits**: 5,000 requests/hour can be limiting for large organizations
   - **Mitigation**: Batching, caching, consider GitHub App for higher limits
2. **SARIF Size Limit**: 10 MB limit may truncate findings for large repos
   - **Mitigation**: Prioritize critical findings, paginate results
3. **GitHub-Only**: Vendor lock-in (not portable to GitLab, Bitbucket)
   - **Mitigation**: Phase 2 could abstract platform layer
4. **Actions Timeout**: 6-hour limit may be insufficient for massive repos
   - **Mitigation**: Incremental scanning, split by directory

### Neutral

1. **Dependency on GitHub APIs**: Changes require Action updates
2. **Marketplace Review**: Initial listing subject to GitHub approval
3. **Enterprise GHES**: Must support GitHub Enterprise Server (v3.8+)

## Related Decisions

- ADR-402: GitHub Actions Workflow Design
- ADR-403: PR Comment Management Strategy
- ADR-404: SARIF Generation Format
- ADR-406: Rate Limiting Mitigation

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Code Scanning API](https://docs.github.com/en/rest/code-scanning)
- [SARIF Specification v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [Octokit REST API Client](https://github.com/octokit/rest.js)
- [GitHub Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
