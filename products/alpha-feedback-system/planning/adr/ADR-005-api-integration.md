# ADR-005: GitHub and npm API Integration Strategy

## Status
Proposed

## Context

The system must integrate with GitHub (issues, discussions) and npm (download stats) while respecting rate limits and handling failures gracefully.

## Decision

Implement **adapter pattern** with exponential backoff and caching.

### GitHub GraphQL API Integration

#### Query Design

```typescript
class GitHubIntegration {
  private client: GraphQLClient;

  async fetchIssues(repo: string, cursor?: string): Promise<IssuesPage> {
    const query = `
      query($owner: String!, $repo: String!, $cursor: String, $labels: [String!]) {
        repository(owner: $owner, name: $repo) {
          issues(
            first: 100,
            after: $cursor,
            labels: $labels,
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            nodes {
              id
              number
              title
              body
              createdAt
              updatedAt
              state
              author { login }
              labels(first: 10) {
                nodes { name }
              }
              comments(first: 5) {
                totalCount
                nodes {
                  body
                  author { login }
                  createdAt
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    const variables = {
      owner: 'ruvnet',
      repo,
      cursor,
      labels: ['alpha-feedback', 'user-feedback']
    };

    return this.executeWithRetry(() =>
      this.client.request(query, variables)
    );
  }

  async fetchDiscussions(repo: string): Promise<Discussion[]> {
    const query = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          discussions(first: 50, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes {
              id
              title
              body
              createdAt
              category { name }
              author { login }
              comments(first: 10) {
                totalCount
                nodes {
                  body
                  author { login }
                }
              }
            }
          }
        }
      }
    `;

    return this.executeWithRetry(() =>
      this.client.request(query, { owner: 'ruvnet', repo })
    );
  }
}
```

#### Webhook Handler

```typescript
class GitHubWebhookHandler {
  async handleIssue(payload: IssueWebhookPayload): Promise<void> {
    // Verify webhook signature
    const isValid = this.verifySignature(
      payload,
      request.headers['x-hub-signature-256']
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process only alpha feedback issues
    if (this.isAlphaFeedback(payload.issue)) {
      const feedback = this.transform(payload.issue);
      await this.commandBus.send(new SubmitFeedbackCommand(feedback));
    }
  }

  private isAlphaFeedback(issue: Issue): boolean {
    return issue.labels.some(l =>
      l.name === 'alpha-feedback' || l.name === 'user-feedback'
    );
  }
}
```

### npm API Integration

#### Download Stats Fetcher

```typescript
class NpmIntegration {
  private baseUrl = 'https://api.npmjs.org';

  async fetchDownloads(
    package: string,
    start: Date,
    end: Date
  ): Promise<DownloadStats[]> {
    // CRITICAL: Split date ranges to avoid missing data
    // (TanStack Query lost 27% of downloads by querying all-time)
    const ranges = this.splitDateRange(start, end, 18); // 18-month chunks

    const stats = await Promise.all(
      ranges.map(range => this.fetchRange(package, range.start, range.end))
    );

    return stats.flat();
  }

  private async fetchRange(
    pkg: string,
    start: Date,
    end: Date
  ): Promise<DownloadStats[]> {
    const url = `${this.baseUrl}/downloads/range/${format(start)}:${format(end)}/${pkg}`;

    return this.executeWithRetry(async () => {
      const response = await this.http.get<NpmDownloadResponse>(url);

      return response.downloads.map(d => ({
        package: response.package,
        date: new Date(d.day),
        downloads: d.downloads
      }));
    });
  }

  private splitDateRange(start: Date, end: Date, monthsPerChunk: number): DateRange[] {
    const ranges: DateRange[] = [];
    let current = start;

    while (current < end) {
      const chunkEnd = min([addMonths(current, monthsPerChunk), end]);
      ranges.push({ start: current, end: chunkEnd });
      current = chunkEnd;
    }

    return ranges;
  }

  async fetchPackageMetadata(pkg: string): Promise<PackageMetadata> {
    const url = `https://registry.npmjs.org/${pkg}`;
    return this.executeWithRetry(() => this.http.get(url));
  }
}
```

### Rate Limiting & Backoff

```typescript
class RateLimitManager {
  private limits = {
    github: {
      authenticated: 5000,  // per hour
      unauthenticated: 60   // per hour
    },
    npm: {
      public: 3600  // per hour (no auth required)
    }
  };

  private state = new Map<string, RateLimitState>();

  async checkLimit(service: 'github' | 'npm'): Promise<boolean> {
    const state = this.state.get(service);

    if (!state) {
      this.state.set(service, {
        remaining: this.limits[service].authenticated || this.limits[service].public,
        resetAt: addHours(new Date(), 1)
      });
      return true;
    }

    // Check if reset time has passed
    if (new Date() > state.resetAt) {
      state.remaining = this.limits[service].authenticated || this.limits[service].public;
      state.resetAt = addHours(new Date(), 1);
    }

    return state.remaining > 0;
  }

  async decrementLimit(service: string): Promise<void> {
    const state = this.state.get(service);
    if (state) {
      state.remaining--;
    }
  }
}

class RetryStrategy {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if rate limited
        if (error.status === 429 || error.status === 403) {
          const retryAfter = error.headers?.['retry-after'];
          const delayMs = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.exponentialBackoff(attempt);

          await this.delay(delayMs);
          continue;
        }

        // Check if server error (retry)
        if (error.status >= 500) {
          await this.delay(this.exponentialBackoff(attempt));
          continue;
        }

        // Client error - don't retry
        throw error;
      }
    }

    throw lastError;
  }

  private exponentialBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000;  // 60 seconds
    const delay = baseDelay * Math.pow(2, attempt);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return Math.min(delay + jitter, maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Caching Strategy

```typescript
class APICache {
  private redis: RedisClient;

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  // Cache GitHub issues for 5 minutes
  async cacheIssues(repo: string, issues: Issue[]): Promise<void> {
    await this.set(`github:issues:${repo}`, issues, 300);
  }

  // Cache npm downloads for 1 hour
  async cacheDownloads(pkg: string, stats: DownloadStats[]): Promise<void> {
    await this.set(`npm:downloads:${pkg}`, stats, 3600);
  }

  // Invalidate cache on webhook
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Error Handling

```typescript
class APIErrorHandler {
  async handle(error: APIError): Promise<void> {
    switch (error.type) {
      case 'rate-limit':
        await this.handleRateLimit(error);
        break;

      case 'not-found':
        await this.logNotFound(error);
        break;

      case 'server-error':
        await this.retryWithBackoff(error);
        break;

      case 'auth-error':
        await this.refreshAuth(error);
        break;

      default:
        await this.logError(error);
    }
  }

  private async handleRateLimit(error: APIError): Promise<void> {
    const retryAfter = error.retryAfter || 3600;

    // Schedule retry after reset
    await this.scheduler.schedule(
      new RetryAPICallJob(error.request),
      { delay: retryAfter * 1000 }
    );

    // Alert if hitting limits frequently
    await this.metrics.increment('api.rate-limit', {
      service: error.service
    });
  }
}
```

## Consequences

### Positive
- Resilient to API failures
- Respects rate limits
- Efficient caching reduces costs
- Real-time webhook updates

### Negative
- Cache invalidation complexity
- Exponential backoff increases latency
- Webhook endpoint requires public access

## Performance Metrics

| Metric | Target |
|--------|--------|
| GitHub API latency | <500ms (p95) |
| npm API latency | <300ms (p95) |
| Cache hit rate | >80% |
| Retry success rate | >95% |

## References

- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [npm Download Counts API](https://github.com/npm/registry/blob/master/docs/download-counts.md)
- [TanStack npm Stats Deep Dive](https://tanstack.com/blog/npm-stats-the-right-way)

---

**Version**: 1.0 | **Date**: 2026-01-30
