/**
 * Domain events for cross-context communication
 */

export interface DomainEvent {
  readonly occurredAt: Date;
  readonly eventType: string;
}

export class SourceFileParsed implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'SourceFileParsed';

  constructor(
    public readonly sourceAnalysisId: string,
    public readonly symbolCount: number,
    public readonly filePath: string
  ) {}
}

export class DocumentationGenerated implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentationGenerated';

  constructor(
    public readonly documentationId: string,
    public readonly format: string
  ) {}
}

export class ValidationCompleted implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'ValidationCompleted';

  constructor(
    public readonly reportId: string,
    public readonly isValid: boolean,
    public readonly errorCount: number
  ) {}
}

export class PublicationCompleted implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'PublicationCompleted';

  constructor(
    public readonly publicationId: string,
    public readonly url: string
  ) {}
}

export class IndexUpdated implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'IndexUpdated';

  constructor(
    public readonly indexId: string,
    public readonly entriesAdded: number
  ) {}
}

export class PatternLearned implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'PatternLearned';

  constructor(
    public readonly patternId: string,
    public readonly confidence: number
  ) {}
}

/**
 * Event bus for publishing and subscribing to domain events
 */
export class EventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => void>> = new Map();

  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) || [];
    handlers.forEach((handler) => handler(event));
  }
}
