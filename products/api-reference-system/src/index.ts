/**
 * API Reference Documentation System
 * Main entry point for programmatic usage
 */

// Domain models
export {
  PackageName,
  Version,
  FilePath,
  EntityId,
} from './domain/shared/value-objects.js';

export {
  SourceAnalysis,
  SourceAnalysisId,
  Symbol,
  SymbolId,
  SymbolKind,
  TSDocComment,
  Parameter,
  Returns,
  CodeExample,
  ThrowsClause,
  TypeParameter,
  Declaration,
} from './domain/source-analysis/entities.js';

export { SourceAnalysisRepository } from './domain/source-analysis/repository.js';

export {
  Documentation,
  DocumentationId,
  OutputFormat,
  Section,
  SectionType,
  DocumentationMetadata,
  Renderer,
} from './domain/documentation/entities.js';

// Domain events
export {
  DomainEvent,
  SourceFileParsed,
  DocumentationGenerated,
  ValidationCompleted,
  PublicationCompleted,
  IndexUpdated,
  PatternLearned,
  EventBus,
} from './domain/shared/events.js';

// Parser
export { TypeScriptParser, ParseOptions } from './parser/typescript-parser.js';
export { TSDocExtractor } from './parser/tsdoc-extractor.js';

// Generators
export { MarkdownRenderer } from './generator/markdown-renderer.js';
export { JSONRenderer, JSONDocSchema, JSONSymbol } from './generator/json-renderer.js';
export {
  DocumentationGenerator,
  GeneratorConfig,
  GenerationResult,
  ValidationResult,
} from './generator/documentation-generator.js';

// Validator
export {
  ExampleValidator,
  ValidationResult as ExampleValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationOptions,
} from './validator/example-validator.js';

// Search
export {
  HNSWIndexer,
  EmbeddingGenerator,
  Vector,
  IndexEntry,
  SearchQuery,
  SearchFilter,
  SearchResult,
  HNSWConfig,
} from './search/hnsw-indexer.js';

export {
  SemanticSearchService,
  SearchServiceConfig,
} from './search/semantic-search.js';

// Watch
export { DocWatcher, WatchConfig } from './watch/doc-watcher.js';
