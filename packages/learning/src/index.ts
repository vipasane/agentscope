/**
 * @claude-flow/learning - Self-learning and adaptive intelligence
 *
 * Implements ReasoningBank 4-step learning pipeline for continuous improvement
 * through pattern recognition, trajectory tracking, and consolidation with
 * catastrophic forgetting prevention.
 *
 * ## 4-Step Learning Pipeline
 *
 * 1. **RETRIEVE** - Fetch relevant patterns via HNSW (150x-12,500x faster)
 * 2. **JUDGE** - Evaluate trajectories with verdicts
 * 3. **DISTILL** - Extract key learnings via pattern consolidation
 * 4. **CONSOLIDATE** - Prevent catastrophic forgetting via EWC++
 *
 * ## Features
 *
 * - **Pattern Storage**: Store and retrieve successful execution patterns
 * - **Trajectory Tracking**: Track complete execution paths with steps
 * - **Verdict Judgment**: Evaluate quality with detailed feedback
 * - **Memory Distillation**: Consolidate similar patterns into learnings
 * - **EWC++ Protection**: Prevent forgetting of important patterns
 * - **HNSW Indexing**: 150x-12,500x faster pattern retrieval
 * - **SONA Adaptation**: Self-Optimizing Neural Architecture (<0.05ms)
 *
 * ## Performance Targets
 *
 * - Pattern retrieval: <10ms with HNSW for 1M patterns
 * - Trajectory tracking: <1ms per step
 * - Pattern distillation: <50ms per epoch
 * - Memory consolidation: <100ms per pattern
 * - SONA adaptation: <0.05ms
 *
 * ## Installation
 *
 * ```bash
 * npm install @claude-flow/learning @claude-flow/memory
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { ReasoningBank, VectorDatabase } from '@claude-flow/learning';
 * import { createVectorDatabase } from '@claude-flow/memory';
 *
 * // Initialize vector database for pattern storage
 * const vectorDB = await createVectorDatabase({
 *   backend: 'hybrid',
 *   enableHNSW: true,
 * });
 *
 * // Create ReasoningBank instance
 * const reasoningBank = new ReasoningBank(vectorDB, {
 *   retrievalK: 5,
 *   minReward: 0.7,
 *   ewcLambda: 0.5,
 *   distillationEpochs: 10,
 *   learningRate: 0.001,
 *   enableHNSW: true,
 * });
 *
 * // Step 1: Track execution trajectory
 * const trajectoryId = await reasoningBank.startTrajectory(
 *   'session-123',
 *   'Implement authentication',
 *   { method: 'JWT' }
 * );
 *
 * // Step 2: Add execution steps
 * await reasoningBank.addTrajectoryStep(trajectoryId, {
 *   action: 'Create JWT validator',
 *   observation: 'Validator created successfully',
 *   thought: 'Use industry-standard library',
 *   timestamp: Date.now(),
 * });
 *
 * // Step 3: Complete trajectory
 * await reasoningBank.endTrajectory(
 *   trajectoryId,
 *   { implemented: true },
 *   true
 * );
 *
 * // Step 4: Judge and distill
 * const verdict = await reasoningBank.judge(
 *   trajectoryId,
 *   true,
 *   0.95,
 *   'Successfully implemented secure authentication'
 * );
 *
 * const distilledPattern = await reasoningBank.distill(trajectoryId);
 * await reasoningBank.consolidate(distilledPattern);
 *
 * // Step 5: Retrieve similar patterns for future tasks
 * const similarPatterns = await reasoningBank.retrieve(
 *   'Implement authorization',
 *   5
 * );
 * ```
 *
 * ## Architecture
 *
 * ```
 * ┌────────────────────────────────────────────────────────┐
 * │                   ReasoningBank                        │
 * │  (Orchestrates 4-step learning pipeline)              │
 * └────────────────────────────────────────────────────────┘
 *          │
 *          ├─→ TrajectoryTracker (Step tracking)
 *          ├─→ VerdictJudge (Quality evaluation)
 *          ├─→ MemoryDistiller (Pattern extraction)
 *          ├─→ EWCConsolidator (Forgetting prevention)
 *          ├─→ PatternMatcher (Similarity search)
 *          └─→ VectorDatabase (Pattern storage)
 * ```
 *
 * ## V3 Self-Learning Protocol
 *
 * ### Before Each Task: Learn from History
 *
 * ```typescript
 * // Search for similar past implementations (HNSW-indexed)
 * const similarPatterns = await reasoningBank.searchPatterns(
 *   'Implement user authentication',
 *   {
 *     k: 5,
 *     minReward: 0.85,
 *     useHNSW: true,
 *   }
 * );
 *
 * if (similarPatterns.length > 0) {
 *   console.log('Learning from past implementations:');
 *   similarPatterns.forEach(pattern => {
 *     console.log(`- ${pattern.task}: ${pattern.reward} quality score`);
 *     console.log(`  Key learnings: ${pattern.critique}`);
 *   });
 * }
 * ```
 *
 * ### During Execution: Track Steps
 *
 * ```typescript
 * // Automatic trajectory tracking
 * const trajectoryId = await reasoningBank.startTrajectory(
 *   sessionId,
 *   task,
 *   input
 * );
 *
 * // Track each action-observation pair
 * await reasoningBank.addTrajectoryStep(trajectoryId, {
 *   action: 'Generated code',
 *   observation: 'Tests passed',
 *   thought: 'Used proven pattern from past success',
 *   timestamp: Date.now(),
 * });
 * ```
 *
 * ### After Completion: Store Learnings
 *
 * ```typescript
 * // Judge trajectory quality
 * const verdict = await reasoningBank.judge(
 *   trajectoryId,
 *   success,
 *   reward,
 *   critique
 * );
 *
 * // Extract and consolidate pattern
 * const pattern = await reasoningBank.distill(trajectoryId);
 * await reasoningBank.consolidate(pattern);
 * ```
 *
 * @see {@link https://github.com/ruvnet/agentscope/docs/learning | Learning Documentation}
 * @see {@link https://arxiv.org/abs/2406.14061 | ReasoningBank Paper}
 *
 * @packageDocumentation
 */

export { ReasoningBank } from './reasoning-bank';
export { TrajectoryTracker } from './trajectory/tracker';
export { VerdictJudge } from './verdict/judge';
export { MemoryDistiller } from './distill/distiller';
export { EWCConsolidator } from './consolidate/ewc';
export { PatternMatcher } from './matching/matcher';

export * from './types';
