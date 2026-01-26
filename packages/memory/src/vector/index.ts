/**
 * Vector Search Module
 * Provides HNSW-indexed semantic search with quantization
 */

export { VectorSearch } from './VectorSearch.js';
export { HNSWIndex } from './HNSWIndex.js';
export { Quantizer } from './Quantizer.js';
export { FlashAttention } from './FlashAttention.js';

export type {
  SearchResult,
  SearchOptions,
  HNSWStats,
  QuantizationStats,
  GraphContext,
  FlashAttentionConfig,
  FlashAttentionResult
} from '../types.js';
