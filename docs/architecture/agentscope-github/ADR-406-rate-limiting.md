# ADR-406: Rate Limiting Mitigation Strategy

## Status
Accepted

## Context

GitHub's API rate limits pose a significant constraint for AgentScope-GitHub, especially for organizations with:

1. **Many Repositories**: 100+ repos trigger frequent scans
2. **Large PRs**: 50+ findings require many API calls (comments, SARIF upload)
3. **Active Development**: High commit velocity (100+ commits/day)
4. **Organization Scale**: Enterprise with 1,000+ developers

### GitHub API Rate Limits

**Primary Rate Limit** (authenticated):
- **Limit**: 5,000 requests/hour
- **Reset**: Every hour (top of the hour)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Secondary Rate Limit** (burst):
- **Limit**: ~100 requests/minute
- **Purpose**: Prevent abuse (not documented, best-effort)

**SARIF Upload Limit**:
- **Limit**: 1,000 uploads/hour per repository
- **File Size**: 10 MB max per upload

**GitHub App Rate Limits** (higher):
- **Limit**: 15,000 requests/hour (3x increase)
- **Recommended**: Use GitHub App for large organizations

### API Call Breakdown

**Typical PR Scan** (with findings):
1. Get PR details: 1 request
2. Get changed files: 1 request
3. Post PR comments: N requests (N = number of inline comments)
4. Upload SARIF: 1 request
5. Create check run: 1 request
6. Update check run: 1 request

**Total**: 5 + N requests per PR scan

**Example Scenarios**:
- **10 PRs/hour with 5 findings each**: ~100 requests/hour (✅ Safe)
- **50 PRs/hour with 10 findings each**: ~750 requests/hour (⚠️ Approaching limit)
- **100 PRs/hour with 20 findings each**: ~2,500 requests/hour (❌ Risky)

### Problem Statement

**Without mitigation**:
- Organizations with high PR volume will exhaust rate limits
- Failed API calls result in missing comments or SARIF uploads
- Developers don't see security findings
- Security gates don't enforce policies

## Decision

We will implement a **multi-layered rate limiting mitigation strategy**:

### Layer 1: Batching and Grouping

**PR Comment Batching**:
- **Strategy**: Group findings by file, post single comment per file
- **Impact**: Reduces API calls by 3-5x (3 findings in same file = 1 comment vs 3)

**Implementation**:
```typescript
interface GroupedFinding {
  file: string;
  findings: Finding[];
}

function groupFindingsByFile(findings: Finding[]): GroupedFinding[] {
  const grouped = new Map<string, Finding[]>();

  for (const finding of findings) {
    const key = finding.location.file;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(finding);
  }

  return Array.from(grouped.entries()).map(([file, findings]) => ({
    file,
    findings
  }));
}

async function postGroupedComments(
  grouped: GroupedFinding[],
  pr: PullRequest
): Promise<void> {
  for (const group of grouped) {
    const comment = formatGroupedComment(group);
    await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pr.number,
      body: comment,
      commit_id: pr.head.sha,
      path: group.file,
      line: group.findings[0].location.line // First finding's line
    });
  }
}
```

**Savings**: 60-80% reduction in comment API calls

### Layer 2: Caching

**Cache Previous Scan Results**:
- **Strategy**: Store previous scan results in Redis
- **Use Case**: Delta scanning (only report new findings)
- **Impact**: Reduces redundant API calls for unchanged findings

**Implementation**:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedScanResults(
  repo: string,
  sha: string
): Promise<Finding[] | null> {
  const key = `scan:${repo}:${sha}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function cacheScanResults(
  repo: string,
  sha: string,
  findings: Finding[]
): Promise<void> {
  const key = `scan:${repo}:${sha}`;
  await redis.setex(key, 86400, JSON.stringify(findings)); // 24-hour TTL
}

async function getDeltaFindings(
  repo: string,
  baseSha: string,
  headSha: string,
  currentFindings: Finding[]
): Promise<Finding[]> {
  const baseFindings = await getCachedScanResults(repo, baseSha);

  if (!baseFindings) {
    // No baseline, return all findings
    return currentFindings;
  }

  // Only return findings not in baseline
  return currentFindings.filter(cf =>
    !baseFindings.some(bf =>
      bf.ruleId === cf.ruleId &&
      bf.location.file === cf.location.file &&
      bf.location.line === cf.location.line
    )
  );
}
```

**Savings**: 50-70% reduction in PR comments (only new findings)

### Layer 3: Exponential Backoff

**Retry Failed Requests**:
- **Strategy**: Exponential backoff with jitter on 429 (rate limit) responses
- **Implementation**: Octokit throttling plugin

```typescript
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';

const OctokitWithThrottling = Octokit.plugin(throttling);

const octokit = new OctokitWithThrottling({
  auth: token,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(
        `Rate limit hit for ${options.method} ${options.url}. ` +
        `Retrying after ${retryAfter}s`
      );

      // Retry up to 3 times
      if (options.request.retryCount < 3) {
        return true;
      }

      return false;
    },
    onSecondaryRateLimit: (retryAfter, options) => {
      console.warn(
        `Secondary rate limit hit for ${options.method} ${options.url}. ` +
        `Retrying after ${retryAfter}s`
      );

      // Always retry secondary limits
      return true;
    }
  }
});
```

**Backoff Schedule**:
- Attempt 1: Immediate
- Attempt 2: Wait `retryAfter` seconds (from GitHub header)
- Attempt 3: Wait `retryAfter * 2` seconds
- Attempt 4: Fail (log error, continue)

### Layer 4: Rate Limit Monitoring

**Track Quota Usage**:
- **Strategy**: Monitor `X-RateLimit-Remaining` header after each request
- **Alert**: Warn when <20% quota remaining
- **Throttle**: Slow down requests when <10% quota remaining

```typescript
interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  percentRemaining: number;
}

async function checkRateLimit(): Promise<RateLimitStatus> {
  const { data, headers } = await octokit.rateLimit.get();

  const limit = parseInt(headers['x-ratelimit-limit']);
  const remaining = parseInt(headers['x-ratelimit-remaining']);
  const reset = parseInt(headers['x-ratelimit-reset']);

  return {
    limit,
    remaining,
    reset,
    percentRemaining: (remaining / limit) * 100
  };
}

async function withRateLimitCheck<T>(
  fn: () => Promise<T>
): Promise<T> {
  const status = await checkRateLimit();

  if (status.percentRemaining < 10) {
    // <10% remaining: wait until reset
    const waitTime = (status.reset * 1000) - Date.now();
    console.warn(
      `Rate limit low (${status.remaining}/${status.limit}). ` +
      `Waiting ${Math.ceil(waitTime / 1000)}s until reset.`
    );
    await sleep(waitTime);
  } else if (status.percentRemaining < 20) {
    // <20% remaining: slow down requests
    console.warn(
      `Rate limit approaching (${status.remaining}/${status.limit}). ` +
      `Throttling requests.`
    );
    await sleep(1000); // 1-second delay between requests
  }

  return fn();
}
```

**Alert Thresholds**:
- **80% used**: Info log
- **90% used**: Warning log
- **95% used**: Error log + Slack/email notification
- **99% used**: Throttle requests (wait until reset)

### Layer 5: Priority Queue

**Prioritize Critical Requests**:
- **Strategy**: Queue API calls by priority, process high-priority first
- **Use Case**: Ensure critical PR scans complete even under rate pressure

**Implementation**:
```typescript
import PQueue from 'p-queue';

const apiQueue = new PQueue({
  concurrency: 10, // Max 10 concurrent requests
  intervalCap: 100, // Max 100 requests per interval
  interval: 60000   // 1-minute interval
});

enum Priority {
  CRITICAL = 1,  // PR scans
  HIGH = 2,      // Push scans
  NORMAL = 3,    // Scheduled audits
  LOW = 4        // Background tasks
}

async function queueAPICall<T>(
  fn: () => Promise<T>,
  priority: Priority
): Promise<T> {
  return apiQueue.add(fn, { priority });
}

// Usage
await queueAPICall(
  () => uploadSARIF(sarif),
  Priority.CRITICAL
);
```

### Layer 6: Graceful Degradation

**Fallback Strategies**:
- **If PR comments fail**: Still upload SARIF (Code Scanning fallback)
- **If SARIF upload fails**: Store locally, retry later
- **If check run fails**: Log error, don't block scan

```typescript
async function postResultsWithFallback(
  findings: Finding[],
  pr: PullRequest
): Promise<void> {
  try {
    // Attempt PR comments
    await postPRComments(findings, pr);
  } catch (error) {
    if (error.status === 429) {
      console.warn('Rate limit hit for PR comments. Falling back to SARIF only.');
    } else {
      throw error; // Re-throw non-rate-limit errors
    }
  }

  try {
    // Always upload SARIF (fallback)
    await uploadSARIF(findings);
  } catch (error) {
    if (error.status === 429) {
      console.error('Rate limit hit for SARIF upload. Storing locally for retry.');
      await storeForRetry(findings);
    } else {
      throw error;
    }
  }

  try {
    // Create check run (best-effort)
    await createCheckRun(findings);
  } catch (error) {
    console.error('Failed to create check run:', error.message);
    // Don't throw - check run is optional
  }
}
```

### Layer 7: GitHub App Migration

**Long-Term Solution**:
- **For v2.0**: Migrate to GitHub App (15,000 req/hr)
- **Timeline**: Recommend GitHub App for organizations >50 repos
- **Transition**: Provide migration guide in documentation

## Consequences

### Positive

1. **Reliability**: 99%+ success rate even under high PR volume
2. **Efficiency**: 60-80% reduction in API calls through batching
3. **Scalability**: Supports 100+ PRs/hour without hitting limits
4. **Graceful**: Fallback strategies ensure findings always delivered
5. **Visibility**: Monitoring alerts teams before quota exhaustion

### Negative

1. **Complexity**: 7 layers of mitigation add code complexity
   - **Mitigation**: Well-tested libraries (Octokit throttling, PQueue)
2. **Latency**: Throttling adds delay to requests
   - **Mitigation**: Only throttle when quota low (<20%)
3. **Redis Dependency**: Caching requires Redis infrastructure
   - **Mitigation**: In-memory fallback for Actions (no Redis)

### Neutral

1. **GitHub App**: Higher limits available but requires v2.0 migration
2. **Cost**: Redis adds $10-50/mo infrastructure cost (minimal)

## Related Decisions

- ADR-401: Native GitHub Integration Architecture
- ADR-405: GitHub App Architecture (v2.0)
- ADR-402: GitHub Actions Workflow Design

## References

- [GitHub REST API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Octokit Throttling Plugin](https://github.com/octokit/plugin-throttling.js)
- [Best Practices for Integrators](https://docs.github.com/en/rest/guides/best-practices-for-integrators)
- [PQueue](https://github.com/sindresorhus/p-queue)
