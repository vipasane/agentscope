# AgentScope Memory Architecture

> **Version**: 1.0
> **Date**: January 2026
> **Status**: Implementation Ready

---

## Executive Summary

This document defines the memory and self-learning architecture for AgentScope using claude-flow capabilities. The architecture enables AgentScope to learn from successful operations, remember user preferences, and continuously improve its scanning and diagram generation capabilities.

### Architecture Goals

| Goal | Description | Metric |
|------|-------------|--------|
| **Pattern Recognition** | Learn successful scan configurations | 90%+ pattern match accuracy |
| **Error Prevention** | Predict and prevent common errors | 50% reduction in scan failures |
| **User Adaptation** | Learn user preferences over time | Personalized diagram output |
| **Performance** | Fast pattern retrieval | <10ms HNSW search latency |

---

## 1. Memory Architecture Overview

```
                    AgentScope Memory Architecture
   +------------------------------------------------------------------+
   |                     Unified Memory Service                        |
   |                    (claude-flow ADR-006)                          |
   +------------------------------------------------------------------+
                                  |
   +------------------------------------------------------------------+
   |                    Hybrid Memory Backend                          |
   |                    (claude-flow ADR-009)                          |
   |                                                                   |
   |   +---------------+  +----------------+  +--------------------+  |
   |   |    SQLite     |  |    AgentDB     |  |       HNSW         |  |
   |   | (Structured)  |  |   (Vectors)    |  |  (150x-12,500x)    |  |
   |   +---------------+  +----------------+  +--------------------+  |
   |        |                    |                      |             |
   |   Sessions         Pattern Embeddings       Similarity Search    |
   |   Metadata         Semantic Search          Fast Retrieval       |
   |   Error Logs       Context Matching         Pattern Matching     |
   +------------------------------------------------------------------+
```

### Memory Namespaces

AgentScope uses three primary namespaces for organizing learned data:

| Namespace | Purpose | TTL | Index Type |
|-----------|---------|-----|------------|
| `patterns` | Successful scan patterns | 90 days | HNSW + fulltext |
| `errors` | Error resolution patterns | 30 days | HNSW + fulltext |
| `preferences` | User diagram preferences | Permanent | SQLite |

---

## 2. Pattern Storage (HNSW-Indexed)

### 2.1 Successful Scan Patterns

Store patterns that lead to successful scans for future reference and learning.

```typescript
interface ScanPattern {
  id: string;
  type: 'scan-success';
  timestamp: number;

  // Pattern identification
  configType: 'claude-code' | 'mcp' | 'mixed';
  projectStructure: string;       // Hashed project layout

  // What worked
  scanConfig: {
    sourcePaths: string[];
    includedComponents: string[];
    excludedPaths: string[];
    parserOptions: Record<string, unknown>;
  };

  // Results
  metrics: {
    scanDuration: number;
    componentsFound: number;
    warningsCount: number;
    errorsCount: number;
  };

  // For HNSW search
  embedding: number[];            // 1536-dim semantic embedding

  // Learning metadata
  confidence: number;             // 0-1 confidence score
  usageCount: number;             // How often this pattern helped
  lastUsed: number;               // Timestamp
}
```

**Storage Commands**:

```bash
# Store successful scan pattern
npx @claude-flow/cli@latest memory store \
  --namespace patterns \
  --key "scan:${projectHash}:${timestamp}" \
  --value '{"type":"scan-success","configType":"claude-code",...}' \
  --tags "scan,claude-code,success"

# Search for similar patterns
npx @claude-flow/cli@latest memory search \
  --namespace patterns \
  --query "claude-code project with 3 agents and mcp servers"
```

### 2.2 Error Resolution Patterns

Store patterns that resolved scan errors to prevent future failures.

```typescript
interface ErrorResolutionPattern {
  id: string;
  type: 'error-resolution';
  timestamp: number;

  // Error identification
  errorCategory: 'fatal' | 'warning' | 'info';
  errorCode: string;
  errorMessage: string;
  errorContext: {
    file: string;
    line?: number;
    configType: string;
  };

  // Resolution
  resolution: {
    action: 'fix' | 'skip' | 'fallback';
    description: string;
    codeChanges?: string[];
    configChanges?: Record<string, unknown>;
  };

  // Effectiveness
  successRate: number;            // 0-1, how often this fix works
  applicableContexts: string[];   // When this fix applies

  // For HNSW search
  embedding: number[];
}
```

**Storage Commands**:

```bash
# Store error resolution
npx @claude-flow/cli@latest memory store \
  --namespace errors \
  --key "error:${errorCode}:${hash}" \
  --value '{"type":"error-resolution","errorCode":"INVALID_MCP_JSON",...}' \
  --tags "error,mcp,json-parse"
```

### 2.3 Diagram Generation Patterns

Store patterns for successful diagram layouts and configurations.

```typescript
interface DiagramPattern {
  id: string;
  type: 'diagram-success';
  timestamp: number;

  // Input characteristics
  diagramType: 'component-map' | 'workflow-sequence' | 'hierarchy' | 'dataflow';
  inputMetrics: {
    agentCount: number;
    skillCount: number;
    hookCount: number;
    mcpServerCount: number;
    totalComponents: number;
  };

  // Layout preferences
  layout: {
    direction: 'TB' | 'LR' | 'BT' | 'RL';
    subgraphGrouping: 'by-type' | 'by-source' | 'by-function';
    maxNodesPerRow: number;
    nodeSpacing: number;
  };

  // Rendering options
  rendering: {
    theme: 'default' | 'dark' | 'forest' | 'neutral';
    fontSize: number;
    lineStyle: 'ortho' | 'polyline' | 'curved';
    includeIcons: boolean;
  };

  // Success metrics
  userSatisfaction?: number;      // 1-5 if rated
  renderTime: number;
  validMermaid: boolean;

  // For HNSW search
  embedding: number[];
}
```

---

## 3. Self-Learning Hooks Integration

### 3.1 Hook Architecture Overview

```
User Request → pre-task → [Load Patterns] → Scan/Generate → post-task → [Store Outcome]
                   ↓                                              ↓
              Memory Search                                 Memory Store
                   ↓                                              ↓
           Pattern Suggestions                            Pattern Training
```

### 3.2 pre-task Hook: Load Relevant Patterns

**Purpose**: Before any scan or diagram generation, load relevant patterns from memory.

```bash
# Hook configuration in .claude/settings.json
{
  "hooks": {
    "PreTask": [
      {
        "matcher": "scan|diagram",
        "command": "npx @claude-flow/cli@latest hooks pre-task --description \"${TASK_DESCRIPTION}\" --coordinate-swarm false"
      }
    ]
  }
}
```

**Implementation**:

```typescript
// src/hooks/pre-task.ts
export async function preTaskHook(task: TaskContext): Promise<PreTaskResult> {
  const results: PreTaskResult = {
    suggestedPatterns: [],
    recommendedConfig: null,
    warnings: []
  };

  // 1. Search for similar scan patterns
  if (task.type === 'scan') {
    const patterns = await claudeFlow.memorySearch({
      query: `${task.configType} scan with ${task.estimatedComponents} components`,
      namespace: 'patterns',
      limit: 5,
      threshold: 0.7
    });

    results.suggestedPatterns = patterns.map(p => ({
      id: p.key,
      confidence: p.similarity,
      config: p.value.scanConfig
    }));

    // Use highest confidence pattern as recommendation
    if (patterns.length > 0 && patterns[0].similarity > 0.85) {
      results.recommendedConfig = patterns[0].value.scanConfig;
    }
  }

  // 2. Search for known errors to avoid
  const potentialErrors = await claudeFlow.memorySearch({
    query: `common errors for ${task.configType} projects`,
    namespace: 'errors',
    limit: 3,
    threshold: 0.6
  });

  results.warnings = potentialErrors.map(e => ({
    code: e.value.errorCode,
    message: `Potential issue: ${e.value.errorMessage}`,
    prevention: e.value.resolution.description
  }));

  // 3. Load user preferences for diagram generation
  if (task.type === 'diagram') {
    const prefs = await claudeFlow.memoryRetrieve({
      key: 'user:diagram-preferences',
      namespace: 'preferences'
    });

    if (prefs) {
      results.userPreferences = prefs.value;
    }
  }

  return results;
}
```

**CLI Integration**:

```bash
# Before starting a scan
npx @claude-flow/cli@latest hooks pre-task \
  --task-id "scan-${timestamp}" \
  --description "Scanning claude-code project for agent documentation"

# Output example:
# {
#   "suggestedPatterns": [
#     {"id": "scan:abc123", "confidence": 0.92, "config": {...}}
#   ],
#   "warnings": [
#     {"code": "MCP_PARSE_ERROR", "message": "Check .mcp.json syntax", "prevention": "Validate JSON before scan"}
#   ],
#   "recommendedConfig": {...}
# }
```

### 3.3 post-task Hook: Store Successful Outcomes

**Purpose**: After successful operations, store patterns for future learning.

```bash
# Hook configuration
{
  "hooks": {
    "PostTask": [
      {
        "matcher": "scan|diagram",
        "command": "npx @claude-flow/cli@latest hooks post-task --task-id \"${TASK_ID}\" --success ${SUCCESS} --store-results true"
      }
    ]
  }
}
```

**Implementation**:

```typescript
// src/hooks/post-task.ts
export async function postTaskHook(
  taskId: string,
  success: boolean,
  result: TaskResult
): Promise<void> {

  if (success && result.type === 'scan') {
    // Store successful scan pattern
    const pattern: ScanPattern = {
      id: `scan:${taskId}`,
      type: 'scan-success',
      timestamp: Date.now(),
      configType: result.configType,
      projectStructure: hashProjectStructure(result.projectPath),
      scanConfig: result.config,
      metrics: {
        scanDuration: result.duration,
        componentsFound: result.components.length,
        warningsCount: result.warnings.length,
        errorsCount: result.errors.length
      },
      embedding: await generateEmbedding(describePattern(result)),
      confidence: calculateConfidence(result),
      usageCount: 1,
      lastUsed: Date.now()
    };

    await claudeFlow.memoryStore({
      namespace: 'patterns',
      key: pattern.id,
      value: JSON.stringify(pattern),
      tags: ['scan', result.configType, 'success']
    });

    // Train neural patterns
    await claudeFlow.hooks.postEdit({
      filePath: result.projectPath,
      success: true,
      trainNeural: true
    });
  }

  if (!success && result.errors.length > 0) {
    // Store error pattern for future prevention
    for (const error of result.errors) {
      const errorPattern: ErrorResolutionPattern = {
        id: `error:${error.code}:${Date.now()}`,
        type: 'error-resolution',
        timestamp: Date.now(),
        errorCategory: error.level,
        errorCode: error.code,
        errorMessage: error.message,
        errorContext: {
          file: error.file,
          line: error.line,
          configType: result.configType
        },
        resolution: {
          action: 'pending',
          description: 'Awaiting resolution'
        },
        successRate: 0,
        applicableContexts: [result.configType],
        embedding: await generateEmbedding(error.message)
      };

      await claudeFlow.memoryStore({
        namespace: 'errors',
        key: errorPattern.id,
        value: JSON.stringify(errorPattern),
        tags: ['error', error.code, result.configType]
      });
    }
  }
}
```

### 3.4 pre-edit Hook: Context for Diagram Generation

**Purpose**: Provide context and suggestions before modifying diagram templates.

```typescript
// src/hooks/pre-edit.ts
export async function preEditHook(
  filePath: string,
  operation: 'create' | 'update'
): Promise<PreEditResult> {

  // Get relevant diagram patterns
  const diagramPatterns = await claudeFlow.memorySearch({
    query: `diagram layout for ${getFileType(filePath)}`,
    namespace: 'patterns',
    limit: 3
  });

  // Get user preferences
  const preferences = await claudeFlow.memoryRetrieve({
    key: 'user:diagram-preferences',
    namespace: 'preferences'
  });

  return {
    suggestedLayouts: diagramPatterns.map(p => p.value.layout),
    userPreferences: preferences?.value,
    context: {
      recentDiagrams: await getRecentDiagrams(5),
      projectTheme: await detectProjectTheme(filePath)
    }
  };
}
```

### 3.5 post-edit Hook: Learn from User Modifications

**Purpose**: When users modify generated diagrams, learn from their changes.

```typescript
// src/hooks/post-edit.ts
export async function postEditHook(
  filePath: string,
  originalContent: string,
  newContent: string
): Promise<void> {

  // Analyze what the user changed
  const changes = analyzeDiagramChanges(originalContent, newContent);

  if (changes.length > 0) {
    // Extract preference updates
    const preferenceUpdates = changes.map(change => ({
      aspect: change.type,        // 'layout', 'theme', 'grouping', etc.
      original: change.from,
      preferred: change.to
    }));

    // Update user preferences
    const currentPrefs = await claudeFlow.memoryRetrieve({
      key: 'user:diagram-preferences',
      namespace: 'preferences'
    }) || { value: {} };

    const updatedPrefs = mergePreferences(currentPrefs.value, preferenceUpdates);

    await claudeFlow.memoryStore({
      namespace: 'preferences',
      key: 'user:diagram-preferences',
      value: JSON.stringify(updatedPrefs)
    });

    // Store this as a learned pattern
    const diagramPattern: DiagramPattern = {
      id: `diagram:${Date.now()}`,
      type: 'diagram-success',
      timestamp: Date.now(),
      diagramType: detectDiagramType(newContent),
      inputMetrics: extractMetrics(newContent),
      layout: extractLayout(newContent),
      rendering: extractRendering(newContent),
      userSatisfaction: 5,        // User modified = they care
      renderTime: 0,
      validMermaid: true,
      embedding: await generateEmbedding(describePattern(newContent))
    };

    await claudeFlow.memoryStore({
      namespace: 'patterns',
      key: diagramPattern.id,
      value: JSON.stringify(diagramPattern),
      tags: ['diagram', diagramPattern.diagramType, 'user-modified']
    });

    // Train on successful user interaction
    await claudeFlow.hooks.postEdit({
      filePath,
      success: true,
      trainNeural: true
    });
  }
}
```

---

## 4. Neural Pattern Training

### 4.1 Training Pipeline

```
                Neural Pattern Training Pipeline
   +------------------------------------------------------------+
   |                                                             |
   |   Successful Outcomes → RETRIEVE → JUDGE → DISTILL → CONSOLIDATE
   |         ↓                  ↓         ↓        ↓          ↓
   |   Pattern Collection   Pattern    Verdict   LoRA     EWC++
   |                        Fetch      (0-1)    Extract  Preserve
   |                                                             |
   +------------------------------------------------------------+
```

### 4.2 Training on Scan-to-Diagram Workflows

```typescript
// src/neural/workflow-trainer.ts
export class WorkflowTrainer {

  async trainOnWorkflow(workflow: WorkflowExecution): Promise<TrainingResult> {
    // 1. Start trajectory tracking
    const trajectoryId = await claudeFlow.intelligence.trajectoryStart({
      task: `Scan ${workflow.configType} and generate ${workflow.diagramTypes.join(', ')} diagrams`,
      agent: 'agentscope-scanner'
    });

    // 2. Record steps
    for (const step of workflow.steps) {
      await claudeFlow.intelligence.trajectoryStep({
        trajectoryId,
        action: step.action,
        result: step.result,
        quality: step.success ? 1.0 : 0.0
      });
    }

    // 3. End trajectory with final outcome
    await claudeFlow.intelligence.trajectoryEnd({
      trajectoryId,
      success: workflow.success,
      feedback: workflow.userFeedback
    });

    // 4. Store pattern for HNSW retrieval
    if (workflow.success) {
      await claudeFlow.intelligence.patternStore({
        pattern: describeWorkflow(workflow),
        type: 'workflow',
        confidence: workflow.confidence,
        metadata: {
          configType: workflow.configType,
          diagramTypes: workflow.diagramTypes,
          componentsCount: workflow.components.length
        }
      });
    }

    // 5. Trigger learning cycle
    const learningResult = await claudeFlow.intelligence.learn({
      trajectoryIds: [trajectoryId],
      consolidate: true           // Apply EWC++ to prevent forgetting
    });

    return {
      trajectoryId,
      patternsLearned: learningResult.patternsLearned,
      consolidationApplied: learningResult.consolidated
    };
  }
}
```

### 4.3 Optimal Agent Routing Training

Learn which agents work best for different configuration types.

```typescript
// src/neural/routing-trainer.ts
export class RoutingTrainer {

  async trainRouting(
    task: TaskDescription,
    agentUsed: string,
    outcome: TaskOutcome
  ): Promise<void> {

    // Record routing outcome for learning
    await claudeFlow.hooks.modelOutcome({
      task: task.description,
      model: agentUsed as 'haiku' | 'sonnet' | 'opus',
      outcome: outcome.success ? 'success' : 'failure'
    });

    // Store routing pattern
    if (outcome.success) {
      await claudeFlow.intelligence.patternStore({
        pattern: `For ${task.configType} with ${task.complexity} complexity, use ${agentUsed}`,
        type: 'routing',
        confidence: outcome.confidence,
        metadata: {
          taskType: task.type,
          configType: task.configType,
          complexity: task.complexity,
          agent: agentUsed,
          duration: outcome.duration,
          quality: outcome.quality
        }
      });
    }
  }

  async getOptimalAgent(task: TaskDescription): Promise<AgentRecommendation> {
    // Search learned routing patterns
    const patterns = await claudeFlow.intelligence.patternSearch({
      query: `${task.configType} ${task.complexity} ${task.type}`,
      topK: 5,
      minConfidence: 0.6
    });

    // Aggregate recommendations
    const votes: Map<string, number> = new Map();
    for (const pattern of patterns) {
      const agent = pattern.metadata.agent;
      votes.set(agent, (votes.get(agent) || 0) + pattern.similarity);
    }

    // Return highest voted agent
    const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1]);

    return {
      recommended: sorted[0]?.[0] || 'sonnet',
      confidence: sorted[0]?.[1] || 0.5,
      alternatives: sorted.slice(1).map(([agent, score]) => ({ agent, score }))
    };
  }
}
```

### 4.4 EWC++ for Preventing Catastrophic Forgetting

```typescript
// src/neural/ewc-manager.ts
export class EWCManager {
  private lambda = 5000;          // Regularization strength
  private gamma = 0.9;            // Decay factor

  async consolidate(
    newPatterns: Pattern[],
    existingPatterns: Pattern[]
  ): Promise<ConsolidationResult> {

    // Compute importance weights for existing patterns
    const importanceWeights = await this.computeImportanceWeights(existingPatterns);

    // Calculate EWC penalty for each new pattern
    const consolidatedPatterns: Pattern[] = [];

    for (const newPattern of newPatterns) {
      const penalty = this.calculateEWCPenalty(newPattern, importanceWeights);

      if (penalty < this.lambda * 0.1) {
        // Safe to consolidate - low penalty means it doesn't conflict
        const merged = await this.safeConsolidate(newPattern, existingPatterns);
        consolidatedPatterns.push(merged);
      } else {
        // Add as new pattern to preserve existing knowledge
        consolidatedPatterns.push(newPattern);
      }
    }

    return {
      consolidated: consolidatedPatterns,
      preserved: existingPatterns.length,
      added: consolidatedPatterns.length - existingPatterns.length
    };
  }

  private calculateEWCPenalty(
    pattern: Pattern,
    importanceWeights: Map<string, number>
  ): number {
    let penalty = 0;

    for (const [key, weight] of importanceWeights) {
      if (pattern.embedding) {
        const diff = this.embeddingDistance(pattern.embedding, key);
        penalty += weight * diff * diff;
      }
    }

    return (this.lambda / 2) * penalty;
  }
}
```

---

## 5. Session Persistence

### 5.1 Cross-Session Context Preservation

```typescript
// src/session/persistence.ts
interface SessionState {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;

  // Scan context
  lastScannedProjects: string[];
  scanHistory: ScanHistoryEntry[];

  // Diagram context
  generatedDiagrams: DiagramHistoryEntry[];
  activePreferences: UserPreferences;

  // Error context
  recentErrors: ErrorHistoryEntry[];
  resolvedErrors: string[];

  // Learning context
  patternsUsed: string[];
  patternsFeedback: PatternFeedback[];
}

export class SessionPersistence {

  async saveSession(state: SessionState): Promise<void> {
    // Save to claude-flow session management
    await claudeFlow.session.save({
      name: `agentscope-${state.id}`,
      description: `AgentScope session with ${state.scanHistory.length} scans`,
      includeAgents: false,
      includeMemory: true,
      includeTasks: true
    });

    // Also save to memory for cross-session learning
    await claudeFlow.memoryStore({
      namespace: 'sessions',
      key: `session:${state.id}`,
      value: JSON.stringify(state),
      metadata: {
        scanCount: state.scanHistory.length,
        diagramCount: state.generatedDiagrams.length,
        errorCount: state.recentErrors.length
      }
    });
  }

  async restoreSession(sessionId?: string): Promise<SessionState | null> {
    // Try to restore from claude-flow
    if (sessionId) {
      const restored = await claudeFlow.session.restore({ sessionId });
      if (restored) {
        const state = await claudeFlow.memoryRetrieve({
          namespace: 'sessions',
          key: `session:${sessionId}`
        });
        return state?.value ? JSON.parse(state.value) : null;
      }
    }

    // Restore latest session
    const latest = await claudeFlow.hooks.sessionRestore({ latest: true });
    if (latest) {
      const sessions = await claudeFlow.memorySearch({
        query: 'agentscope session',
        namespace: 'sessions',
        limit: 1
      });
      return sessions[0]?.value ? JSON.parse(sessions[0].value) : null;
    }

    return null;
  }
}
```

### 5.2 User Preference Learning

```typescript
// src/session/preference-learner.ts
interface UserPreferences {
  // Diagram preferences
  diagram: {
    defaultDirection: 'TB' | 'LR' | 'BT' | 'RL';
    preferredTheme: string;
    includeIcons: boolean;
    groupingStrategy: 'by-type' | 'by-source' | 'by-function';
    maxNodesPerRow: number;
  };

  // Output preferences
  output: {
    defaultOutputDir: string;
    generateReadme: boolean;
    generateAgentsFile: boolean;
    generateRawJson: boolean;
    verboseMode: boolean;
  };

  // Scan preferences
  scan: {
    excludePaths: string[];
    defaultStrict: boolean;
    autoFix: boolean;
  };

  // Confidence scores (0-1) for each preference
  confidence: Record<string, number>;

  // Learning metadata
  lastUpdated: number;
  learningIterations: number;
}

export class PreferenceLearner {

  async learn(
    action: UserAction,
    context: ActionContext
  ): Promise<void> {

    const currentPrefs = await this.getPreferences();

    switch (action.type) {
      case 'diagram-modified':
        // User modified a generated diagram
        await this.learnDiagramPreference(action, context, currentPrefs);
        break;

      case 'output-moved':
        // User moved output to different location
        await this.learnOutputPreference(action, context, currentPrefs);
        break;

      case 'config-changed':
        // User changed scan configuration
        await this.learnScanPreference(action, context, currentPrefs);
        break;

      case 'flag-used':
        // User explicitly used a CLI flag
        await this.learnFromFlag(action, context, currentPrefs);
        break;
    }

    // Save updated preferences
    await claudeFlow.memoryStore({
      namespace: 'preferences',
      key: 'user:preferences',
      value: JSON.stringify(currentPrefs)
    });
  }

  private async learnDiagramPreference(
    action: DiagramModifiedAction,
    context: ActionContext,
    prefs: UserPreferences
  ): Promise<void> {

    const changes = action.changes;

    // Update preferences based on changes
    if (changes.direction) {
      prefs.diagram.defaultDirection = changes.direction;
      prefs.confidence['diagram.direction'] = this.updateConfidence(
        prefs.confidence['diagram.direction'],
        0.1                       // Small increment per observation
      );
    }

    if (changes.theme) {
      prefs.diagram.preferredTheme = changes.theme;
      prefs.confidence['diagram.theme'] = this.updateConfidence(
        prefs.confidence['diagram.theme'],
        0.1
      );
    }

    if (changes.grouping) {
      prefs.diagram.groupingStrategy = changes.grouping;
      prefs.confidence['diagram.grouping'] = this.updateConfidence(
        prefs.confidence['diagram.grouping'],
        0.1
      );
    }

    prefs.lastUpdated = Date.now();
    prefs.learningIterations++;
  }

  private updateConfidence(current: number = 0.5, increment: number): number {
    // Confidence grows logarithmically, max 0.99
    return Math.min(0.99, current + increment * (1 - current));
  }
}
```

### 5.3 Error History for Improved Suggestions

```typescript
// src/session/error-history.ts
interface ErrorHistoryEntry {
  id: string;
  timestamp: number;

  error: {
    code: string;
    message: string;
    file: string;
    line?: number;
  };

  context: {
    projectPath: string;
    configType: string;
    scanPhase: string;
  };

  resolution?: {
    method: 'auto-fix' | 'user-fix' | 'skipped' | 'unresolved';
    description?: string;
    timeToResolve?: number;
  };
}

export class ErrorHistoryManager {

  async recordError(error: ScanError, context: ScanContext): Promise<void> {
    const entry: ErrorHistoryEntry = {
      id: `error:${Date.now()}`,
      timestamp: Date.now(),
      error: {
        code: error.code,
        message: error.message,
        file: error.file,
        line: error.line
      },
      context: {
        projectPath: context.projectPath,
        configType: context.configType,
        scanPhase: context.currentPhase
      }
    };

    // Store in error namespace
    await claudeFlow.memoryStore({
      namespace: 'errors',
      key: entry.id,
      value: JSON.stringify(entry),
      tags: ['error', error.code, context.configType]
    });

    // Check for similar past errors with resolutions
    const similar = await claudeFlow.memorySearch({
      query: `${error.code} ${error.message}`,
      namespace: 'errors',
      limit: 5
    });

    // Return suggestions based on past resolutions
    const suggestions = similar
      .filter(s => s.value.resolution?.method === 'auto-fix' || s.value.resolution?.method === 'user-fix')
      .map(s => ({
        description: s.value.resolution.description,
        confidence: s.similarity,
        previousSuccess: true
      }));

    return suggestions;
  }

  async recordResolution(
    errorId: string,
    resolution: ErrorResolution
  ): Promise<void> {

    // Update the error entry with resolution
    const entry = await claudeFlow.memoryRetrieve({
      namespace: 'errors',
      key: errorId
    });

    if (entry) {
      const updated = JSON.parse(entry.value);
      updated.resolution = {
        method: resolution.method,
        description: resolution.description,
        timeToResolve: Date.now() - updated.timestamp
      };

      await claudeFlow.memoryStore({
        namespace: 'errors',
        key: errorId,
        value: JSON.stringify(updated)
      });

      // If successfully resolved, create a resolution pattern
      if (resolution.method === 'auto-fix' || resolution.method === 'user-fix') {
        await this.createResolutionPattern(updated);
      }
    }
  }

  private async createResolutionPattern(entry: ErrorHistoryEntry): Promise<void> {
    const pattern: ErrorResolutionPattern = {
      id: `resolution:${entry.error.code}:${Date.now()}`,
      type: 'error-resolution',
      timestamp: Date.now(),
      errorCategory: 'warning',
      errorCode: entry.error.code,
      errorMessage: entry.error.message,
      errorContext: {
        file: entry.error.file,
        configType: entry.context.configType
      },
      resolution: {
        action: entry.resolution.method === 'auto-fix' ? 'fix' : 'fix',
        description: entry.resolution.description
      },
      successRate: 1.0,
      applicableContexts: [entry.context.configType],
      embedding: await generateEmbedding(`${entry.error.code} ${entry.error.message} ${entry.resolution.description}`)
    };

    await claudeFlow.memoryStore({
      namespace: 'errors',
      key: pattern.id,
      value: JSON.stringify(pattern),
      tags: ['resolution', entry.error.code, 'success']
    });
  }
}
```

---

## 6. Background Workers

### 6.1 Worker Configuration

AgentScope leverages three claude-flow background workers for continuous improvement.

| Worker | Trigger | Purpose | Priority |
|--------|---------|---------|----------|
| `optimize` | After large scans | Analyze scan performance | high |
| `testgaps` | After releases | Identify missing test coverage | normal |
| `audit` | Weekly or on-demand | Security pattern analysis | critical |

### 6.2 Optimize Worker: Performance Tuning

```typescript
// src/workers/optimize.ts
export class OptimizeWorker {

  async run(context: WorkerContext): Promise<WorkerResult> {
    // 1. Analyze recent scan performance
    const recentScans = await claudeFlow.memorySearch({
      query: 'scan-success',
      namespace: 'patterns',
      limit: 100
    });

    // 2. Identify slow scans
    const slowScans = recentScans.filter(s =>
      s.value.metrics.scanDuration > 3000    // >3s threshold
    );

    // 3. Analyze patterns in slow scans
    const bottlenecks = this.analyzeBottlenecks(slowScans);

    // 4. Generate optimization recommendations
    const recommendations = bottlenecks.map(b => ({
      issue: b.description,
      impact: b.averageTimeAdded,
      suggestion: b.optimization,
      confidence: b.confidence
    }));

    // 5. Store recommendations
    await claudeFlow.memoryStore({
      namespace: 'patterns',
      key: `optimization:${Date.now()}`,
      value: JSON.stringify(recommendations)
    });

    return {
      status: 'completed',
      findings: recommendations.length,
      recommendations
    };
  }

  private analyzeBottlenecks(scans: ScanPattern[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check for large MCP configurations
    const largeMCPs = scans.filter(s =>
      s.value.scanConfig.includedComponents.filter(c => c.startsWith('mcp:')).length > 5
    );
    if (largeMCPs.length > scans.length * 0.3) {
      bottlenecks.push({
        description: 'Large number of MCP servers slowing scans',
        averageTimeAdded: this.calculateAvgTimeImpact(largeMCPs),
        optimization: 'Consider lazy-loading MCP tool definitions',
        confidence: 0.85
      });
    }

    // Check for deep directory structures
    const deepStructures = scans.filter(s =>
      s.value.projectStructure.split('/').length > 10
    );
    if (deepStructures.length > scans.length * 0.2) {
      bottlenecks.push({
        description: 'Deep directory structures increasing scan time',
        averageTimeAdded: this.calculateAvgTimeImpact(deepStructures),
        optimization: 'Add common deep paths to excludePaths',
        confidence: 0.75
      });
    }

    return bottlenecks;
  }
}
```

**Dispatch Command**:

```bash
# Manually trigger optimization analysis
npx @claude-flow/cli@latest hooks worker dispatch \
  --trigger optimize \
  --context "large-config" \
  --priority high
```

### 6.3 TestGaps Worker: Missing Test Coverage

```typescript
// src/workers/testgaps.ts
export class TestGapsWorker {

  async run(context: WorkerContext): Promise<WorkerResult> {
    // 1. Load scan patterns
    const patterns = await claudeFlow.memorySearch({
      query: 'scan-success diagram-success',
      namespace: 'patterns',
      limit: 50
    });

    // 2. Identify untested code paths
    const untestedPaths = await this.findUntestedPaths(patterns);

    // 3. Identify untested error scenarios
    const untestedErrors = await this.findUntestedErrors();

    // 4. Generate test gap report
    const gaps = [
      ...untestedPaths.map(p => ({
        type: 'code-path',
        description: p.description,
        priority: p.usageFrequency > 0.5 ? 'high' : 'medium',
        suggestedTest: p.testSuggestion
      })),
      ...untestedErrors.map(e => ({
        type: 'error-scenario',
        description: `Error ${e.code}: ${e.message}`,
        priority: e.frequency > 5 ? 'high' : 'low',
        suggestedTest: `Test handling of ${e.code}`
      }))
    ];

    // 5. Store gap report
    await claudeFlow.memoryStore({
      namespace: 'patterns',
      key: `testgaps:${Date.now()}`,
      value: JSON.stringify(gaps),
      tags: ['testgaps', 'quality']
    });

    return {
      status: 'completed',
      gaps: gaps.length,
      highPriority: gaps.filter(g => g.priority === 'high').length
    };
  }

  private async findUntestedErrors(): Promise<UntestedError[]> {
    // Find errors that have occurred but don't have test coverage
    const errors = await claudeFlow.memorySearch({
      query: 'error',
      namespace: 'errors',
      limit: 100
    });

    // Group by error code
    const errorCounts = new Map<string, number>();
    for (const e of errors) {
      const code = e.value.errorCode;
      errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
    }

    // Return errors without corresponding resolution patterns
    const untested: UntestedError[] = [];
    for (const [code, count] of errorCounts) {
      const hasResolution = await claudeFlow.memorySearch({
        query: `resolution ${code}`,
        namespace: 'errors',
        limit: 1
      });

      if (hasResolution.length === 0 || hasResolution[0].value.successRate < 0.5) {
        untested.push({
          code,
          message: errors.find(e => e.value.errorCode === code)?.value.errorMessage || code,
          frequency: count
        });
      }
    }

    return untested;
  }
}
```

**Dispatch Command**:

```bash
# Trigger test gap analysis
npx @claude-flow/cli@latest hooks worker dispatch \
  --trigger testgaps \
  --priority normal
```

### 6.4 Audit Worker: Security Pattern Analysis

```typescript
// src/workers/audit.ts
export class AuditWorker {

  private securityPatterns = [
    { pattern: /api[_-]?key/i, risk: 'high', description: 'Potential API key exposure' },
    { pattern: /password/i, risk: 'high', description: 'Password in configuration' },
    { pattern: /secret/i, risk: 'high', description: 'Secret value in configuration' },
    { pattern: /token/i, risk: 'medium', description: 'Token in configuration' },
    { pattern: /credential/i, risk: 'high', description: 'Credentials in configuration' },
    { pattern: /\.env/i, risk: 'medium', description: 'Environment file reference' }
  ];

  async run(context: WorkerContext): Promise<WorkerResult> {
    // 1. Load recent scan configurations
    const configs = await claudeFlow.memorySearch({
      query: 'scan-success',
      namespace: 'patterns',
      limit: 50
    });

    // 2. Analyze for security issues
    const findings: SecurityFinding[] = [];

    for (const config of configs) {
      const configStr = JSON.stringify(config.value);

      for (const pattern of this.securityPatterns) {
        if (pattern.pattern.test(configStr)) {
          findings.push({
            patternId: config.key,
            risk: pattern.risk,
            description: pattern.description,
            location: this.findLocation(config.value, pattern.pattern),
            recommendation: this.getRecommendation(pattern)
          });
        }
      }
    }

    // 3. Check for insecure MCP configurations
    const mcpIssues = await this.auditMCPConfigs(configs);
    findings.push(...mcpIssues);

    // 4. Store audit report
    await claudeFlow.memoryStore({
      namespace: 'patterns',
      key: `audit:${Date.now()}`,
      value: JSON.stringify({
        timestamp: Date.now(),
        findings,
        summary: {
          total: findings.length,
          high: findings.filter(f => f.risk === 'high').length,
          medium: findings.filter(f => f.risk === 'medium').length,
          low: findings.filter(f => f.risk === 'low').length
        }
      }),
      tags: ['audit', 'security']
    });

    return {
      status: 'completed',
      findings: findings.length,
      highRiskCount: findings.filter(f => f.risk === 'high').length
    };
  }

  private async auditMCPConfigs(configs: Pattern[]): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const config of configs) {
      const mcpServers = config.value.scanConfig?.includedComponents?.filter(
        (c: string) => c.startsWith('mcp:')
      ) || [];

      // Check for overly permissive MCP configurations
      for (const server of mcpServers) {
        if (server.includes('filesystem') && !server.includes('readonly')) {
          findings.push({
            patternId: config.key,
            risk: 'medium',
            description: 'Filesystem MCP server without readonly restriction',
            location: server,
            recommendation: 'Consider using readonly mode for filesystem MCP'
          });
        }

        if (server.includes('shell') || server.includes('exec')) {
          findings.push({
            patternId: config.key,
            risk: 'high',
            description: 'Shell execution MCP server detected',
            location: server,
            recommendation: 'Audit shell MCP permissions and sandboxing'
          });
        }
      }
    }

    return findings;
  }
}
```

**Dispatch Command**:

```bash
# Trigger security audit
npx @claude-flow/cli@latest hooks worker dispatch \
  --trigger audit \
  --priority critical
```

### 6.5 Worker Scheduling

```typescript
// src/workers/scheduler.ts
export class WorkerScheduler {

  private schedules = {
    optimize: {
      trigger: 'after-large-scan',
      threshold: 10,              // Trigger after 10 components scanned
      cooldown: 3600000           // 1 hour minimum between runs
    },
    testgaps: {
      trigger: 'weekly',
      dayOfWeek: 0,               // Sunday
      hour: 3                     // 3 AM
    },
    audit: {
      trigger: 'weekly',
      dayOfWeek: 1,               // Monday
      hour: 2                     // 2 AM
    }
  };

  async checkAndDispatch(event: WorkerEvent): Promise<void> {
    if (event.type === 'scan-complete') {
      const componentCount = event.components.length;

      if (componentCount >= this.schedules.optimize.threshold) {
        const lastRun = await this.getLastRun('optimize');
        const elapsed = Date.now() - lastRun;

        if (elapsed > this.schedules.optimize.cooldown) {
          await claudeFlow.hooks.workerDispatch({
            trigger: 'optimize',
            context: `scan-${event.scanId}`,
            priority: 'normal',
            background: true
          });
        }
      }
    }

    // Check weekly schedules
    if (event.type === 'daily-tick') {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      for (const [worker, schedule] of Object.entries(this.schedules)) {
        if (schedule.trigger === 'weekly' &&
            schedule.dayOfWeek === day &&
            schedule.hour === hour) {
          await claudeFlow.hooks.workerDispatch({
            trigger: worker as any,
            priority: worker === 'audit' ? 'critical' : 'normal',
            background: true
          });
        }
      }
    }
  }
}
```

---

## 7. Implementation Guide

### 7.1 CLI Integration

```typescript
// src/cli/commands/scan.ts
export async function scanCommand(options: ScanOptions): Promise<void> {
  // 1. Start session
  await claudeFlow.hooks.sessionStart({
    sessionId: `agentscope-${Date.now()}`,
    startDaemon: true
  });

  try {
    // 2. Run pre-task hook
    const preTask = await claudeFlow.hooks.preTask({
      taskId: `scan-${Date.now()}`,
      description: `Scan ${options.path} for agent configurations`,
      filePath: options.path
    });

    // Apply recommended config if available
    if (preTask.recommendedConfig) {
      options = { ...options, ...preTask.recommendedConfig };
    }

    // Show warnings from memory
    for (const warning of preTask.warnings) {
      console.warn(`[Memory Warning] ${warning.message}`);
      console.warn(`  Prevention: ${warning.prevention}`);
    }

    // 3. Execute scan
    const result = await scanner.scan(options);

    // 4. Run post-task hook
    await claudeFlow.hooks.postTask({
      taskId: `scan-${Date.now()}`,
      success: result.errors.filter(e => e.level === 'fatal').length === 0,
      agent: 'agentscope-scanner',
      quality: calculateQuality(result)
    });

    // 5. Generate diagrams with user preferences
    const prefs = await claudeFlow.memoryRetrieve({
      key: 'user:diagram-preferences',
      namespace: 'preferences'
    });

    await diagramGenerator.generate(result, prefs?.value);

    // 6. Check if optimize worker should run
    if (result.components.length > 10) {
      await claudeFlow.hooks.workerDispatch({
        trigger: 'optimize',
        context: JSON.stringify({ scanId: result.id, components: result.components.length }),
        background: true
      });
    }

  } finally {
    // 7. End session
    await claudeFlow.hooks.sessionEnd({
      saveState: true,
      exportMetrics: true,
      stopDaemon: false
    });
  }
}
```

### 7.2 Memory Initialization

```bash
# Initialize AgentScope memory namespaces
npx @claude-flow/cli@latest memory init --force --verbose

# Create namespaces
npx @claude-flow/cli@latest memory store \
  --namespace patterns \
  --key "_namespace_init" \
  --value '{"created": true, "version": "1.0"}'

npx @claude-flow/cli@latest memory store \
  --namespace errors \
  --key "_namespace_init" \
  --value '{"created": true, "version": "1.0"}'

npx @claude-flow/cli@latest memory store \
  --namespace preferences \
  --key "_namespace_init" \
  --value '{"created": true, "version": "1.0"}'
```

### 7.3 Pattern Seeding

Seed initial patterns for common configurations.

```typescript
// src/setup/seed-patterns.ts
export async function seedPatterns(): Promise<void> {
  const initialPatterns = [
    {
      key: 'pattern:claude-code-basic',
      namespace: 'patterns',
      value: {
        type: 'scan-success',
        configType: 'claude-code',
        scanConfig: {
          sourcePaths: ['.claude/', 'CLAUDE.md'],
          includedComponents: ['agents', 'skills', 'hooks', 'commands'],
          excludedPaths: ['node_modules', '.git']
        },
        metrics: { scanDuration: 500, componentsFound: 5 },
        confidence: 0.9
      },
      tags: ['seed', 'claude-code', 'basic']
    },
    {
      key: 'pattern:mcp-basic',
      namespace: 'patterns',
      value: {
        type: 'scan-success',
        configType: 'mcp',
        scanConfig: {
          sourcePaths: ['.mcp.json'],
          includedComponents: ['mcp-servers', 'tools'],
          excludedPaths: []
        },
        metrics: { scanDuration: 200, componentsFound: 3 },
        confidence: 0.9
      },
      tags: ['seed', 'mcp', 'basic']
    },
    {
      key: 'pattern:diagram-component-map',
      namespace: 'patterns',
      value: {
        type: 'diagram-success',
        diagramType: 'component-map',
        layout: {
          direction: 'TB',
          subgraphGrouping: 'by-type',
          maxNodesPerRow: 5
        },
        rendering: {
          theme: 'default',
          fontSize: 12,
          includeIcons: true
        },
        confidence: 0.85
      },
      tags: ['seed', 'diagram', 'component-map']
    }
  ];

  for (const pattern of initialPatterns) {
    await claudeFlow.memoryStore({
      namespace: pattern.namespace,
      key: pattern.key,
      value: JSON.stringify(pattern.value),
      tags: pattern.tags
    });
  }
}
```

---

## 8. Testing the Memory Architecture

### 8.1 Unit Tests

```typescript
// tests/memory/pattern-storage.test.ts
describe('Pattern Storage', () => {
  test('stores scan pattern with embedding', async () => {
    const pattern = createMockScanPattern();

    await memoryStore.store({
      namespace: 'patterns',
      key: pattern.id,
      value: JSON.stringify(pattern)
    });

    const retrieved = await memoryStore.retrieve({
      namespace: 'patterns',
      key: pattern.id
    });

    expect(JSON.parse(retrieved.value)).toEqual(pattern);
  });

  test('searches patterns by semantic similarity', async () => {
    // Seed test patterns
    await seedTestPatterns();

    const results = await memoryStore.search({
      query: 'claude-code with agents and skills',
      namespace: 'patterns',
      limit: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0.7);
  });
});
```

### 8.2 Integration Tests

```typescript
// tests/integration/hooks.test.ts
describe('Hook Integration', () => {
  test('pre-task loads relevant patterns', async () => {
    const result = await claudeFlow.hooks.preTask({
      taskId: 'test-task-1',
      description: 'Scan claude-code project'
    });

    expect(result.suggestedPatterns).toBeDefined();
    expect(result.warnings).toBeDefined();
  });

  test('post-task stores successful patterns', async () => {
    await claudeFlow.hooks.postTask({
      taskId: 'test-task-1',
      success: true,
      quality: 0.95
    });

    const stored = await claudeFlow.memorySearch({
      query: 'test-task-1',
      namespace: 'patterns'
    });

    expect(stored.length).toBeGreaterThan(0);
  });
});
```

---

## 9. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pattern search latency | <10ms | HNSW query time |
| Memory store latency | <50ms | SQLite + embedding generation |
| Pre-task hook latency | <100ms | Total hook execution |
| Post-task hook latency | <200ms | Including pattern training |
| Worker execution | <30s | Background worker runtime |
| Memory usage | <100MB | Total memory namespace size |

---

## 10. Security Considerations

### Data Privacy

- No PII stored in patterns
- Configuration paths sanitized before storage
- Embeddings cannot be reverse-engineered to original text
- Audit worker detects potential secret exposure

### Access Control

- Memory namespaces isolated by project
- Cross-project pattern sharing opt-in only
- Audit logs for all memory operations

### Data Retention

- Patterns: 90-day TTL with usage-based extension
- Errors: 30-day TTL
- Preferences: Permanent until user reset
- Audit logs: 1-year retention

---

## References

- [AgentScope PRD v2.0](/docs/AgentScope-PRD-v2.md)
- [Claude Code Tuning Best Practices](/docs/research/06-claude-code-tuning-best-practices.md)
- [claude-flow ADR-006: Unified Memory Service](https://github.com/ruvnet/claude-flow)
- [claude-flow ADR-009: Hybrid Memory Backend](https://github.com/ruvnet/claude-flow)

---

*Document Version: 1.0 | January 2026 | Status: Implementation Ready*
