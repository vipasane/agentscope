# Domain Models - Alpha Feedback System

## Core Domain Concepts

### 1. Feedback Aggregate

```typescript
// Aggregate Root
class Feedback {
  // Identity
  private readonly id: FeedbackId;
  private readonly version: number;

  // Value Objects
  private content: SanitizedContent;
  private category: FeedbackCategory;
  private sentiment: Sentiment;
  private priority: Priority;

  // Metadata
  private readonly submittedAt: Timestamp;
  private readonly source: FeedbackSource;
  private readonly submitter: AnonymousUserId;
  private readonly metadata: FeedbackMetadata;

  // State
  private status: FeedbackStatus;
  private embeddings: Embeddings;
  private relatedPatterns: PatternId[];

  // Domain Events
  private uncommittedEvents: DomainEvent[] = [];

  // === Factory Method ===
  static create(command: SubmitFeedbackCommand): Feedback {
    const feedback = new Feedback({
      id: FeedbackId.generate(),
      content: SanitizedContent.from(command.rawContent),
      source: command.source,
      submitter: AnonymousUserId.from(command.userId),
      submittedAt: Timestamp.now(),
      status: FeedbackStatus.PENDING,
      version: 1
    });

    feedback.addEvent(new FeedbackSubmittedEvent(feedback));
    return feedback;
  }

  // === Commands (Business Logic) ===

  categorize(category: FeedbackCategory): void {
    this.ensureNotProcessed();
    this.category = category;
    this.addEvent(new FeedbackCategorizedEvent(this.id, category));
  }

  analyzeSentiment(sentiment: Sentiment): void {
    this.sentiment = sentiment;
    this.addEvent(new SentimentAnalyzedEvent(this.id, sentiment));
  }

  linkToPattern(patternId: PatternId): void {
    if (!this.relatedPatterns.includes(patternId)) {
      this.relatedPatterns.push(patternId);
      this.addEvent(new FeedbackLinkedToPatternEvent(this.id, patternId));
    }
  }

  markAsProcessed(): void {
    this.ensureNotProcessed();
    this.status = FeedbackStatus.PROCESSED;
    this.addEvent(new FeedbackProcessedEvent(this.id));
  }

  // === Invariants ===

  private ensureNotProcessed(): void {
    if (this.status === FeedbackStatus.PROCESSED) {
      throw new DomainError('Cannot modify processed feedback');
    }
  }

  // === Event Sourcing ===

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearEvents(): void {
    this.uncommittedEvents = [];
  }
}
```

### 2. Value Objects

```typescript
// Identity
class FeedbackId extends ValueObject<string> {
  static generate(): FeedbackId {
    return new FeedbackId(ulid());
  }
}

class AnonymousUserId extends ValueObject<string> {
  constructor(rawUserId: string) {
    const hash = crypto.createHash('sha256')
      .update(rawUserId)
      .digest('hex');
    super(hash);
  }
}

// Content
class SanitizedContent extends ValueObject<string> {
  static from(rawContent: string): SanitizedContent {
    // Validate length
    if (rawContent.length > 10000) {
      throw new DomainError('Content exceeds maximum length');
    }

    // Sanitize with @claude-flow/security
    const sanitized = InputValidator.sanitize(rawContent, {
      allowedTags: [],
      stripScripts: true,
      maxLength: 10000
    });

    // Remove PII
    const noPII = PIIDetector.removePII(sanitized);

    return new SanitizedContent(noPII);
  }
}

// Classification
class FeedbackCategory extends ValueObject<string> {
  static readonly BUG = new FeedbackCategory('bug');
  static readonly FEATURE = new FeedbackCategory('feature');
  static readonly PERFORMANCE = new FeedbackCategory('performance');
  static readonly UX = new FeedbackCategory('ux');
  static readonly DOCS = new FeedbackCategory('docs');
  static readonly SECURITY = new FeedbackCategory('security');
  static readonly API = new FeedbackCategory('api');
  static readonly INTEGRATION = new FeedbackCategory('integration');
  static readonly OTHER = new FeedbackCategory('other');

  private static readonly VALID_CATEGORIES = [
    'bug', 'feature', 'performance', 'ux', 'docs',
    'security', 'api', 'integration', 'other'
  ];

  constructor(value: string) {
    if (!FeedbackCategory.VALID_CATEGORIES.includes(value)) {
      throw new DomainError(`Invalid category: ${value}`);
    }
    super(value);
  }
}

class Sentiment extends ValueObject<{
  label: 'positive' | 'neutral' | 'negative';
  score: number;
}> {
  constructor(label: 'positive' | 'neutral' | 'negative', score: number) {
    if (score < 0 || score > 1) {
      throw new DomainError('Sentiment score must be between 0 and 1');
    }
    super({ label, score });
  }

  isPositive(): boolean {
    return this.value.label === 'positive';
  }

  isNegative(): boolean {
    return this.value.label === 'negative';
  }
}

class Priority extends ValueObject<number> {
  static readonly CRITICAL = new Priority(1);
  static readonly HIGH = new Priority(2);
  static readonly MEDIUM = new Priority(3);
  static readonly LOW = new Priority(4);

  static fromSeverity(severity: string, frequency: number): Priority {
    if (severity === 'critical' || frequency > 100) {
      return Priority.CRITICAL;
    }
    if (severity === 'high' || frequency > 50) {
      return Priority.HIGH;
    }
    if (severity === 'medium' || frequency > 10) {
      return Priority.MEDIUM;
    }
    return Priority.LOW;
  }
}

// Source
class FeedbackSource extends ValueObject<string> {
  static readonly GITHUB = new FeedbackSource('github');
  static readonly NPM = new FeedbackSource('npm');
  static readonly DISCORD = new FeedbackSource('discord');
  static readonly IN_APP = new FeedbackSource('in-app');
  static readonly EMAIL = new FeedbackSource('email');
}

// Embeddings
class Embeddings extends ValueObject<number[]> {
  static readonly DIMENSIONS = 768;

  constructor(vector: number[]) {
    if (vector.length !== Embeddings.DIMENSIONS) {
      throw new DomainError(`Embeddings must have ${Embeddings.DIMENSIONS} dimensions`);
    }
    super(vector);
  }

  cosineSimilarity(other: Embeddings): number {
    const dotProduct = this.value.reduce((sum, v, i) =>
      sum + v * other.value[i], 0
    );
    const magnitudeA = Math.sqrt(this.value.reduce((sum, v) => sum + v * v, 0));
    const magnitudeB = Math.sqrt(other.value.reduce((sum, v) => sum + v * v, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

### 3. Pattern Aggregate

```typescript
class FeedbackPattern {
  // Identity
  private readonly id: PatternId;
  private readonly detectedAt: Timestamp;

  // Pattern Definition
  private pattern: PatternDescription;
  private frequency: number;
  private severity: Severity;

  // Related Data
  private relatedFeedback: FeedbackId[];
  private embeddings: Embeddings;

  // Learning
  private verdicts: Verdict[];
  private predictions: Prediction[];

  // === Factory ===
  static detect(cluster: Feedback[]): FeedbackPattern {
    const pattern = new FeedbackPattern({
      id: PatternId.generate(),
      pattern: this.extractCommonPattern(cluster),
      frequency: cluster.length,
      severity: this.assessSeverity(cluster),
      relatedFeedback: cluster.map(f => f.id),
      detectedAt: Timestamp.now()
    });

    pattern.addEvent(new PatternDetectedEvent(pattern));
    return pattern;
  }

  // === Commands ===

  learn(verdict: Verdict): void {
    this.verdicts.push(verdict);
    this.addEvent(new PatternLearnedEvent(this.id, verdict));
  }

  predict(context: FeedbackContext): Prediction {
    const prediction = this.neuralModel.predict(context);
    this.predictions.push(prediction);
    return prediction;
  }

  private static extractCommonPattern(cluster: Feedback[]): PatternDescription {
    // Extract common keywords, phrases, categories
    const categories = cluster.map(f => f.category.value);
    const mostCommon = mode(categories);

    return new PatternDescription({
      category: mostCommon,
      keywords: this.extractKeywords(cluster),
      sentiment: this.averageSentiment(cluster)
    });
  }
}

class Verdict extends ValueObject<{
  success: boolean;
  confidence: number;
  reasoning: string;
}> {
  static fromOutcome(outcome: Outcome): Verdict {
    return new Verdict({
      success: outcome.resolved,
      confidence: outcome.userSatisfaction / 5.0,
      reasoning: outcome.resolution
    });
  }
}

class Prediction extends ValueObject<{
  likelyIssue: string;
  probability: number;
  suggestedAction: string;
  severity: Severity;
}> {}
```

### 4. Consent Aggregate (GDPR)

```typescript
class ConsentRecord {
  private readonly userId: UserId;
  private consents: Map<ProcessingPurpose, ConsentGiven>;
  private readonly createdAt: Timestamp;
  private expiresAt: Timestamp;

  // === Commands ===

  giveConsent(purpose: ProcessingPurpose): void {
    this.consents.set(purpose, new ConsentGiven({
      purpose,
      givenAt: Timestamp.now(),
      method: 'explicit-opt-in'
    }));

    this.addEvent(new ConsentGivenEvent(this.userId, purpose));
  }

  revokeConsent(purpose: ProcessingPurpose): void {
    this.consents.delete(purpose);
    this.addEvent(new ConsentRevokedEvent(this.userId, purpose));
  }

  // === Queries ===

  hasConsent(purpose: ProcessingPurpose): boolean {
    const consent = this.consents.get(purpose);
    return consent && !consent.isExpired();
  }
}

class ProcessingPurpose extends ValueObject<string> {
  static readonly FEEDBACK_COLLECTION = new ProcessingPurpose('feedback-collection');
  static readonly ANALYTICS = new ProcessingPurpose('analytics');
  static readonly COMMUNICATION = new ProcessingPurpose('communication');
}
```

## Domain Events

```typescript
// Base Event
interface DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly occurredAt: number;
  readonly eventType: string;
}

// Feedback Events
class FeedbackSubmittedEvent implements DomainEvent {
  readonly eventType = 'FeedbackSubmitted';
  readonly eventId: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly occurredAt: number;

  constructor(feedback: Feedback) {
    this.eventId = ulid();
    this.aggregateId = feedback.id.value;
    this.version = feedback.version;
    this.occurredAt = Date.now();
  }
}

class FeedbackCategorizedEvent implements DomainEvent {
  readonly eventType = 'FeedbackCategorized';
  constructor(
    public readonly feedbackId: FeedbackId,
    public readonly category: FeedbackCategory
  ) {}
}

class PatternDetectedEvent implements DomainEvent {
  readonly eventType = 'PatternDetected';
  constructor(
    public readonly pattern: FeedbackPattern
  ) {}
}
```

## Repositories (Interfaces)

```typescript
interface FeedbackRepository {
  save(feedback: Feedback): Promise<void>;
  findById(id: FeedbackId): Promise<Feedback | null>;
  findBySource(source: FeedbackSource, limit: number): Promise<Feedback[]>;
  findSimilar(embeddings: Embeddings, limit: number): Promise<Feedback[]>;
}

interface PatternRepository {
  save(pattern: FeedbackPattern): Promise<void>;
  findById(id: PatternId): Promise<FeedbackPattern | null>;
  findByCategory(category: FeedbackCategory): Promise<FeedbackPattern[]>;
  findActive(minFrequency: number): Promise<FeedbackPattern[]>;
}

interface ConsentRepository {
  save(consent: ConsentRecord): Promise<void>;
  findByUserId(userId: UserId): Promise<ConsentRecord | null>;
}
```

---

**Version**: 1.0 | **Date**: 2026-01-30
