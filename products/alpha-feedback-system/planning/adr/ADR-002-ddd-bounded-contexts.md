# ADR-002: DDD Bounded Contexts

## Status
Proposed

## Context

Following ADR-001, we need clear DDD bounded contexts to maintain separation of concerns and enable multi-agent swarm coordination.

## Decision

Implement **4 primary bounded contexts**:

### 1. Feedback Collection Context

**Responsibility**: Capture, validate, sanitize feedback

**Aggregates**:
```typescript
class Feedback {
  private id: FeedbackId;
  private content: SanitizedContent;
  private category: Category;
  private sentiment: Sentiment;
  private metadata: Metadata;

  submit(raw: string): void {
    this.sanitize(raw);
    this.categorize();
    this.analyzeSentiment();
    this.emit(FeedbackSubmitted);
  }
}
```

**Domain Services**:
- `FeedbackSanitizer` - @claude-flow/security integration
- `SentimentAnalyzer` - Neural classification via MoE
- `CategoryDetector` - Pattern-based categorization

### 2. Collection Gateway Context (ACL)

**Responsibility**: Integrate external sources, prevent model contamination

**Adapters**:
```typescript
class GitHubIssueAdapter {
  async fetch(): Promise<GitHubIssue[]> {
    const query = `
      query($repo: String!) {
        repository(owner: "ruvnet", name: $repo) {
          issues(labels: ["alpha-feedback"]) {
            nodes { id, title, body, createdAt }
          }
        }
      }
    `;
    return this.graphql.query(query);
  }

  transform(issue: GitHubIssue): FeedbackSubmission {
    return {
      source: 'github',
      content: `${issue.title}\n\n${issue.body}`,
      submittedAt: new Date(issue.createdAt)
    };
  }
}

class NpmDownloadAdapter {
  async fetch(): Promise<NpmStats[]> {
    // Split date ranges to avoid missing data
    const ranges = this.splitDateRange(start, end);
    const stats = await Promise.all(
      ranges.map(r => this.fetchRange(r.start, r.end))
    );
    return stats.flat();
  }
}
```

### 3. Analytics & Reporting Context

**Responsibility**: Query, aggregate, visualize feedback data

**Read Models** (CQRS):
```typescript
class FeedbackAnalytics {
  getTimeSeries(granularity: 'hour'|'day'|'week'): TimeSeriesData;
  getTopIssues(limit: number): IssueRanking[];
  searchSimilar(id: string): Feedback[]; // HNSW search
}

class MetricsProjection {
  async on(event: FeedbackSubmitted): Promise<void> {
    await this.db.execute(`
      INSERT INTO metrics_hourly (hour, category, sentiment, count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT DO UPDATE SET count = count + 1
    `);
  }
}
```

### 4. Pattern Learning Context

**Responsibility**: Detect patterns, learn, predict issues

**Aggregates**:
```typescript
class FeedbackPattern {
  private pattern: string;
  private frequency: number;
  private severity: Severity;
  private embeddings: number[];

  detect(cluster: Feedback[]): void {
    this.extract(cluster);
    this.generateEmbeddings();
    this.emit(PatternDetected);
  }

  learn(verdict: Verdict): void {
    this.updateModel(verdict);
  }

  predict(context: Context): Prediction {
    return this.neuralModel.predict(context);
  }
}
```

**Domain Services**:
```typescript
class PatternDetector {
  async detect(batch: Feedback[]): Promise<Pattern[]> {
    // HNSW clustering
    const clusters = await this.vectorSearch.cluster(
      batch.map(f => f.embeddings)
    );
    return clusters.map(c => this.extractPattern(c));
  }
}

class NeuralLearningService {
  async train(patterns: Pattern[], verdicts: Verdict[]): Promise<void> {
    // RuVector 4-step pipeline:
    // 1. RETRIEVE historical patterns
    // 2. JUDGE verdicts
    // 3. DISTILL via LoRA
    // 4. CONSOLIDATE with EWC++
  }
}
```

### 5. Privacy & Compliance Context

**Responsibility**: GDPR compliance, consent, data rights

**Aggregates**:
```typescript
class ConsentRecord {
  private userId: UserId;
  private consents: Map<Purpose, Consent>;

  giveConsent(purpose: Purpose): void;
  revokeConsent(purpose: Purpose): void;
  hasConsent(purpose: Purpose): boolean;
}

class DataSubjectRequest {
  private type: 'access'|'deletion'|'portability';
  private status: RequestStatus;

  process(): void;
  complete(result: Result): void;
}
```

**Domain Services**:
```typescript
class AnonymizationService {
  anonymize(feedback: Feedback): AnonymizedFeedback {
    return {
      ...feedback,
      submitter: hash(feedback.submitter),
      content: this.removePII(feedback.content), // @claude-flow/security
      metadata: this.stripIPAddress(feedback.metadata)
    };
  }
}
```

## Context Integration

### Event-Driven Communication

```typescript
// Feedback Collection publishes
class FeedbackService {
  async submit(cmd: SubmitFeedback): Promise<void> {
    const feedback = Feedback.create(cmd);
    await this.repo.save(feedback);
    await this.eventBus.publish(new FeedbackSubmitted(feedback));
  }
}

// Analytics subscribes
class AnalyticsHandler {
  @Subscribe(FeedbackSubmitted)
  async on(event: FeedbackSubmitted): Promise<void> {
    await this.updateMetrics(event);
  }
}
```

### Context Map

```
Feedback Collection ──[Events]──> Analytics
                    ──[Events]──> Pattern Learning

Collection Gateway ──[Commands]──> Feedback Collection

Privacy & Compliance ──[Policy]──> All Contexts
```

## Consequences

### Positive
- Clear boundaries and ownership
- Independent evolution and scaling
- Parallel development
- Efficient agent coordination

### Negative
- Architectural complexity
- Eventual consistency
- Data duplication in read models

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Context Mapping](https://martinfowler.com/bliki/BoundedContext.html)

---

**Version**: 1.0 | **Date**: 2026-01-30
