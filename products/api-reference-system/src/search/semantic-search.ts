/**
 * Semantic search service
 * Provides high-level search functionality using HNSW indexer
 */

import { SourceAnalysis, Symbol } from '../domain/source-analysis/entities.js';
import {
  HNSWIndexer,
  IndexEntry,
  SearchQuery,
  SearchResult,
  EmbeddingGenerator,
} from './hnsw-indexer.js';

export interface SearchServiceConfig {
  indexConfig?: {
    M?: number;
    efConstruction?: number;
    efSearch?: number;
  };
  embeddingModel?: string;
}

/**
 * Semantic search service for documentation
 */
export class SemanticSearchService {
  private indexer: HNSWIndexer;
  private embedder: EmbeddingGenerator;
  private indexed: boolean = false;

  constructor(config: SearchServiceConfig = {}) {
    this.indexer = new HNSWIndexer(config.indexConfig);
    this.embedder = new EmbeddingGenerator(undefined, config.embeddingModel);
  }

  /**
   * Index a source analysis
   */
  async indexSourceAnalysis(analysis: SourceAnalysis): Promise<void> {
    const symbols = analysis.getPublicSymbols();

    for (const symbol of symbols) {
      await this.indexSymbol(symbol, analysis.packageName.toString());
    }

    this.indexed = false; // Mark for rebuild
  }

  /**
   * Index multiple source analyses
   */
  async indexMultiple(analyses: SourceAnalysis[]): Promise<void> {
    for (const analysis of analyses) {
      await this.indexSourceAnalysis(analysis);
    }

    // Build index after all entries added
    await this.indexer.build();
    this.indexed = true;
  }

  /**
   * Index a single symbol
   */
  private async indexSymbol(symbol: Symbol, packageName: string): Promise<void> {
    // Build searchable content
    const content = this.buildSearchableContent(symbol);

    // Generate embedding
    const vector = await this.embedder.generate(content);

    // Create index entry
    const entry: IndexEntry = {
      id: symbol.id.toString(),
      symbolId: symbol.id.toString(),
      content,
      vector,
      metadata: {
        symbolName: symbol.name,
        symbolKind: symbol.kind,
        packageName,
      },
    };

    await this.indexer.addEntry(entry);
  }

  /**
   * Build searchable content from symbol
   */
  private buildSearchableContent(symbol: Symbol): string {
    const parts: string[] = [];

    // Symbol name and kind
    parts.push(symbol.name);
    parts.push(symbol.kind);

    if (!symbol.tsDocComment) {
      return parts.join(' ');
    }

    const doc = symbol.tsDocComment;

    // Add documentation text
    if (doc.summary) parts.push(doc.summary);
    if (doc.description) parts.push(doc.description);

    // Add parameter names and descriptions
    for (const param of doc.parameters) {
      parts.push(param.name);
      parts.push(param.description);
    }

    // Add return description
    if (doc.returns) {
      parts.push(doc.returns.description);
    }

    // Add tags
    for (const tag of doc.tags) {
      parts.push(tag.name);
      parts.push(tag.value);
    }

    return parts.join(' ');
  }

  /**
   * Search documentation
   */
  async search(
    query: string,
    options: {
      limit?: number;
      packageFilter?: string;
      kindFilter?: string;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.indexed) {
      await this.indexer.build();
      this.indexed = true;
    }

    const searchQuery: SearchQuery = {
      text: query,
      limit: options.limit || 10,
      filters: [],
    };

    if (options.packageFilter) {
      searchQuery.filters!.push({
        field: 'packageName',
        value: options.packageFilter,
      });
    }

    if (options.kindFilter) {
      searchQuery.filters!.push({
        field: 'symbolKind',
        value: options.kindFilter,
      });
    }

    const startTime = Date.now();
    const results = await this.indexer.search(searchQuery);
    const duration = Date.now() - startTime;

    console.warn(`Search completed in ${duration}ms`);

    return results;
  }

  /**
   * Get search statistics
   */
  getStats(): {
    indexed: boolean;
    entryCount: number;
    avgVectorSize: number;
  } {
    const stats = this.indexer.getStats();
    return {
      indexed: this.indexed,
      entryCount: stats.entryCount,
      avgVectorSize: stats.avgVectorSize,
    };
  }

  /**
   * Clear index
   */
  clear(): void {
    this.indexer.clear();
    this.indexed = false;
  }
}
