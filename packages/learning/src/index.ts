/**
 * @claude-flow/learning - ReasoningBank integration layer
 *
 * 4-step learning pipeline:
 * 1. RETRIEVE - Fetch relevant patterns via HNSW (150x faster)
 * 2. JUDGE - Evaluate with verdicts
 * 3. DISTILL - Extract key learnings
 * 4. CONSOLIDATE - Prevent catastrophic forgetting via EWC++
 */

export { ReasoningBank } from './reasoning-bank';
export { TrajectoryTracker } from './trajectory/tracker';
export { VerdictJudge } from './verdict/judge';
export { MemoryDistiller } from './distill/distiller';
export { EWCConsolidator } from './consolidate/ewc';
export { PatternMatcher } from './matching/matcher';

export * from './types';
