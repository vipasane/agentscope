/**
 * AgentScope Unified Configuration Model
 * Based on PRD v2.0 specification
 */

export interface AgentScopeConfig {
  meta: ConfigMeta;
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  commands: Command[];
  mcpServers: MCPServer[];
  settings: Settings;
  errors: ScanError[];
}

export interface ConfigMeta {
  name: string;
  version: string;
  scanDate: string;
  projectPath: string;
  scanDurationMs?: number;
  componentCount?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  source: 'project' | 'user';
  sourcePath: string;
  allowedTools: string[];
  skills: string[];
  configSnippet: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  source: 'project' | 'user';
  sourcePath: string;
  configSnippet: string;
}

export interface Hook {
  id: string;
  name: string;
  trigger: string;
  description: string;
  source: 'project' | 'user';
  sourcePath: string;
  configSnippet: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  agent?: string;
  skill?: string;
  source: 'project' | 'user';
  sourcePath: string;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  tools: MCPTool[];
  source: string;
}

export interface MCPTool {
  name: string;
  description?: string;
}

export interface Settings {
  projectSettings: Record<string, unknown>;
  userSettings: Record<string, unknown>;
}

export interface ScanError {
  level: 'fatal' | 'warning' | 'info';
  message: string;
  file: string;
  suggestion?: string;
}

/**
 * Diagram generation options
 */
export interface DiagramOptions {
  type: 'component' | 'workflow' | 'hierarchy' | 'dataflow' | 'permissions' | 'hooks';
  title?: string;
  includeOrphans?: boolean;
}

/**
 * Performance metrics collected during operations
 */
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  memoryUsedBytes: number;
  memoryDeltaBytes: number;
  itemCount?: number;
  itemsPerSecond?: number;
}

/**
 * Benchmark result structure
 */
export interface BenchmarkResult {
  name: string;
  metrics: PerformanceMetrics[];
  summary: {
    minMs: number;
    maxMs: number;
    avgMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    stdDevMs: number;
    iterations: number;
  };
  target: {
    maxMs: number;
    passed: boolean;
  };
}

/**
 * Cache statistics for optimization tracking
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}
