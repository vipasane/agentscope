# API Documentation - AgentScope v1.2

> **Complete TypeScript interface reference for v1.2** | Programmatic usage guide

## Table of Contents

1. [Core Types](#core-types)
2. [Configuration Types](#configuration-types)
3. [Scan & Generation](#scan--generation)
4. [Output Types](#output-types)
5. [Category System](#category-system)
6. [Template Generation](#template-generation)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Core Types

### Agent

```typescript
interface Agent {
  name: string;
  type: 'coordinator' | 'worker' | 'specialist' | 'validator';
  description: string;

  // v1.2: Enhanced fields
  category?: string;  // e.g., 'github', 'security', 'development', 'testing'

  // Core capabilities
  tools?: string[];
  skills?: string[];
  delegations?: string[];  // References to other agents

  // Metadata
  created?: string;
  updated?: string;
  tags?: string[];

  // Configuration
  config?: Record<string, unknown>;
}
```

### Skill

```typescript
interface Skill {
  name: string;
  description: string;
  version: string;

  // Implementation
  type: 'prompt' | 'code' | 'workflow' | 'template';
  handler?: string;

  // Parameters
  parameters?: Record<string, {
    type: string;
    description: string;
    required: boolean;
    default?: unknown;
  }>;

  // Metadata
  author?: string;
  tags?: string[];
}
```

### Hook

```typescript
interface Hook {
  name: string;
  event: HookEventType;
  handler: string;

  // v1.2: Enhanced trigger system
  condition?: HookCondition;
  priority?: number;  // Higher = runs first

  enabled: boolean;
  description?: string;
}

type HookEventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Error'
  | 'TaskComplete'
  | 'StateChange'
  | 'Warning'
  | 'Stop';

interface HookCondition {
  type: 'always' | 'regex' | 'callback';
  value?: string | (() => boolean);
}
```

### MCP Server

```typescript
interface MCPServer {
  name: string;
  type: 'stdio' | 'sse' | 'websocket';

  // Connection info
  command?: string;  // For stdio
  url?: string;      // For SSE/websocket

  // Capabilities
  tools?: MCPTool[];
  resources?: MCPResource[];
  capabilities?: string[];

  // Configuration
  config?: Record<string, unknown>;
  environment?: Record<string, string>;

  // Metadata
  version?: string;
  author?: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
}
```

### Permission

```typescript
interface Permission {
  id: string;
  subject: string;        // 'agent:name' or 'role:admin'
  resource: string;       // Tool, skill, or resource name
  action: PermissionAction;
  effect: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
  priority?: number;
}

type PermissionAction =
  | 'use'
  | 'read'
  | 'write'
  | 'delete'
  | 'execute'
  | '*';
```

### Plugin

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;

  // Marketplace reference
  registry?: string;  // e.g., 'npm', 'github'
  url?: string;

  // Capabilities
  provides?: string[];
  requires?: string[];

  // Configuration
  config?: Record<string, unknown>;
  enabled: boolean;
}
```

### Command

```typescript
interface Command {
  name: string;
  description: string;

  // Execution
  handler: string;
  type: 'script' | 'function' | 'shell' | 'workflow';

  // Parameters
  parameters?: Record<string, unknown>;

  // Metadata
  aliases?: string[];
  tags?: string[];
}
```

---

## Configuration Types

### Project Configuration

```typescript
interface ProjectConfig {
  // Metadata
  name: string;
  version: string;
  description?: string;

  // Entities
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  commands: Command[];
  mcpServers: MCPServer[];
  plugins: Plugin[];
  permissions: Permission[];

  // v1.2: Category configuration
  categories?: CategoryConfig[];

  // Settings
  settings: ProjectSettings;
}

interface ProjectSettings {
  theme?: string;
  output?: string;
  language?: string;

  // v1.2: New settings
  generateCategories?: boolean;
  generateAdr?: boolean;
  generateContext?: boolean;
  adrLocation?: string;
  contextTemplate?: 'arc42' | 'minimal' | 'custom';

  // Display
  showDiagrams?: boolean;
  diagramTypes?: DiagramType[];

  // Export
  excludeSecrets?: boolean;
  excludePersonalInfo?: boolean;
  excludePatterns?: string[];
}

type DiagramType =
  | 'hierarchy'
  | 'component-map'
  | 'dataflow'
  | 'permission-matrix'
  | 'hook-lifecycle';
```

### Category Configuration

```typescript
interface CategoryConfig {
  id: string;
  name: string;
  displayName: string;
  description?: string;

  // Detection
  keywords?: string[];
  pattern?: RegExp;

  // Customization
  icon?: string;
  color?: string;
  order?: number;

  // Content
  agents: Agent[];
}
```

---

## Scan & Generation

### Scan Function

```typescript
// Main scanning function
export async function scan(
  projectPath: string,
  options?: ScanOptions
): Promise<ProjectConfig>

interface ScanOptions {
  // Discovery
  recursive?: boolean;
  excludePatterns?: string[];

  // Processing
  validateEntities?: boolean;
  transformPaths?: boolean;

  // Output
  theme?: string;
  output?: string;

  // v1.2: New options
  categories?: boolean;  // Force category generation
  generateAdr?: boolean;
  generateContext?: boolean;
  verbose?: boolean;
}
```

### Validation Function

```typescript
export function validate(config: ProjectConfig): ValidationResult

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];

  // v1.2: Risk scoring
  riskScore: number;  // 0-1, lower is safer
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ValidationError {
  entity: string;
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  entity: string;
  field?: string;
  message: string;
  suggestion?: string;
}
```

### Diagram Generation

```typescript
// v1.1: Existing functions
export function generateHierarchy(
  config: ProjectConfig,
  options?: DiagramOptions
): string  // Mermaid diagram

export function generateComponentMap(
  config: ProjectConfig,
  options?: DiagramOptions
): string  // Mermaid diagram

// v1.1: Dataflow
export function generateDataflow(
  config: ProjectConfig,
  options?: DiagramOptions
): string  // Mermaid sequence diagram

// v1.2: Enhanced dataflow with transformations
export function generateEnhancedDataflow(
  config: ProjectConfig,
  options?: EnhancedDataflowOptions
): string  // Enhanced Mermaid diagram

interface EnhancedDataflowOptions extends DiagramOptions {
  // v1.2: Transformation focus
  showTransformations?: boolean;
  showDataFormats?: boolean;
  showSources?: boolean;
  showSinks?: boolean;
  detailLevel?: 'summary' | 'detailed' | 'comprehensive';
}

// v1.2: New diagram types
export function generatePermissionMatrix(
  config: ProjectConfig,
  options?: DiagramOptions
): string  // Permission matrix diagram

export function generateHookLifecycle(
  config: ProjectConfig,
  options?: DiagramOptions
): string  // Hook lifecycle diagram

interface DiagramOptions {
  theme?: string;
  format?: 'mermaid' | 'svg' | 'png';
  title?: string;
  includeDescription?: boolean;
  width?: number;
  height?: number;
}
```

### Category Generation

```typescript
// v1.2: Category-based generation
export async function generateCategoryDocs(
  config: ProjectConfig,
  outputPath: string,
  options?: CategoryDocOptions
): Promise<void>

interface CategoryDocOptions {
  overwrite?: boolean;
  includeEmptyCategories?: boolean;
  generateDiagrams?: boolean;
  theme?: string;
}

// Get categorized agents
export function getCategorizedAgents(
  agents: Agent[],
  categories?: CategoryConfig[]
): Map<string, Agent[]>

// Detect agent category
export function detectAgentCategory(
  agent: Agent,
  categories?: CategoryConfig[]
): string
```

---

## Output Types

### Documentation Output

```typescript
interface DocumentationOutput {
  // Main files
  readme: string;               // README.md content
  componentMap: string;          // component-map.md
  hierarchy: string;             // hierarchy.md
  dataflow: string;              // dataflow.md (enhanced in v1.2)

  // v1.2: Category-specific
  categories?: Map<string, {
    overview: string;
    diagram: string;
    agents: string;
  }>;

  // v1.2: Templates
  adrIndex?: string;             // ADR index content
  contextTemplate?: string;      // CONTEXT.md template

  // Configuration
  configJson: string;            // config.json content

  // Metadata
  timestamp: string;
  version: string;
  duration: number;              // Generation time in ms
}
```

### Export Output

```typescript
export async function exportConfig(
  config: ProjectConfig,
  options?: ExportOptions
): Promise<ExportedConfig>

interface ExportedConfig {
  config: ProjectConfig;
  metadata: {
    exportedAt: string;
    exportedFrom: string;
    version: string;
  };
  secrets?: SecretsMapping;
}

interface ExportOptions {
  sanitizeSecrets?: boolean;
  transformPaths?: boolean;
  targetPlatform?: 'windows' | 'linux' | 'macos';
  excludeSecrets?: boolean;

  // v1.2: Enhanced export
  excludePatterns?: string[];
  includeMetadata?: boolean;
}

interface SecretsMapping {
  [key: string]: string;  // Maps placeholder to secret
}
```

### Import Output

```typescript
export async function importConfig(
  exportedConfig: ExportedConfig,
  targetPath: string,
  options?: ImportOptions
): Promise<ImportResult>

interface ImportOptions {
  overwrite?: boolean;
  restoreSecrets?: boolean;
  validateTarget?: boolean;
  transformPaths?: boolean;

  // v1.2: Enhanced import
  mergeWithExisting?: boolean;
  conflictResolution?: 'keep' | 'overwrite' | 'merge';
}

interface ImportResult {
  success: boolean;
  itemsImported: number;
  warnings: string[];
  errors: string[];
  details: {
    agents: number;
    skills: number;
    hooks: number;
    commands: number;
    mcpServers: number;
    plugins: number;
    permissions: number;
  };
}
```

---

## Category System

### Category Detection

```typescript
interface CategoryDetection {
  // Auto-detection result
  category: string;
  confidence: number;  // 0-1
  reason: 'explicit' | 'keyword' | 'pattern' | 'default';

  // Alternatives considered
  alternatives?: Array<{
    category: string;
    confidence: number;
  }>;
}

// Detect category for an agent
export function detectCategory(
  agent: Agent,
  categoryConfig?: CategoryConfig[]
): CategoryDetection

// Get all built-in categories
export function getBuiltInCategories(): CategoryConfig[]

// Create custom category
export function createCategory(
  config: Omit<CategoryConfig, 'id'>
): CategoryConfig
```

### Built-in Categories

```typescript
// All built-in categories (v1.2)
const BUILT_IN_CATEGORIES = {
  github: {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'GitHub-related agents (PR management, issues, releases)',
    keywords: ['github', 'pr', 'pull', 'issue', 'release', 'workflow'],
    icon: '🐙',
    color: '#333333',
    order: 1,
  },

  security: {
    id: 'security',
    name: 'security',
    displayName: 'Security',
    description: 'Security agents (auditing, compliance, PII detection)',
    keywords: ['security', 'audit', 'compliance', 'pii', 'auth', 'crypto'],
    icon: '🔒',
    color: '#FF6B6B',
    order: 2,
  },

  development: {
    id: 'development',
    name: 'development',
    displayName: 'Development',
    description: 'Development agents (backend, frontend, architecture)',
    keywords: ['develop', 'backend', 'frontend', 'api', 'db', 'architect'],
    icon: '💻',
    color: '#4ECDC4',
    order: 3,
  },

  testing: {
    id: 'testing',
    name: 'testing',
    displayName: 'Testing',
    description: 'Testing agents (TDD, validation, code review)',
    keywords: ['test', 'validate', 'review', 'verify', 'qa', 'tdd'],
    icon: '🧪',
    color: '#95E1D3',
    order: 4,
  },

  devops: {
    id: 'devops',
    name: 'devops',
    displayName: 'DevOps',
    description: 'DevOps agents (deployment, infrastructure)',
    keywords: ['deploy', 'infra', 'ops', 'docker', 'k8s', 'ci', 'cd'],
    icon: '🚀',
    color: '#F38181',
    order: 5,
  },
};
```

---

## Template Generation

### ADR Generation

```typescript
export async function generateAdrIndex(
  config: ProjectConfig,
  options?: AdrGenerationOptions
): Promise<AdrIndexOutput>

interface AdrGenerationOptions {
  outputPath?: string;
  includeTemplate?: boolean;
  adrVersion?: string;  // 'madr-3.0' | 'adr-0-10'
  categories?: boolean;
}

interface AdrIndexOutput {
  index: string;           // README.md with index
  template: string;        // MADR template
  discovered: AdrEntry[];  // Found ADRs
}

interface AdrEntry {
  filename: string;
  path: string;
  title: string;
  status: string;  // Proposed, Accepted, Deprecated, Superseded
  date: string;
  authors: string[];
}
```

### CONTEXT.md Generation

```typescript
export async function generateContextTemplate(
  config: ProjectConfig,
  options?: ContextGenerationOptions
): Promise<ContextOutput>

interface ContextGenerationOptions {
  outputPath?: string;
  template?: 'arc42' | 'minimal' | 'custom';
  fillAuto?: boolean;  // Auto-populate from scan
  sections?: number[]; // Which sections to generate (1-3 for arc42)
}

interface ContextOutput {
  content: string;      // Full CONTEXT.md
  sections: {
    section1: string;   // Introduction and Goals
    section2: string;   // Constraints
    section3: string;   // Context and Scope
  };
  autoPopulated: {
    goals: string[];
    constraints: string[];
    externalSystems: string[];
  };
}
```

---

## Error Handling

### Error Types

```typescript
class AgentScopeError extends Error {
  code: string;
  context?: Record<string, unknown>;
}

class ValidationError extends AgentScopeError {
  code: 'VALIDATION_ERROR';
  entity: string;
  field: string;
  value: unknown;
}

class FileError extends AgentScopeError {
  code: 'FILE_NOT_FOUND' | 'FILE_READ_ERROR' | 'FILE_WRITE_ERROR';
  path: string;
}

class ParsingError extends AgentScopeError {
  code: 'INVALID_JSON' | 'INVALID_YAML' | 'PARSE_ERROR';
  format: string;
  details: string;
}

class ConfigError extends AgentScopeError {
  code: 'INVALID_CONFIG' | 'MISSING_REQUIRED_FIELD';
  configPath: string;
  issues: ValidationError[];
}

class GenerationError extends AgentScopeError {
  code: 'DIAGRAM_GENERATION_FAILED' | 'DOCUMENT_GENERATION_FAILED';
  details: string;
}
```

### Error Handling Pattern

```typescript
try {
  const config = await scan('/path/to/project');
  const output = await generateDocs(config, { theme: 'dark' });
  console.log('Success:', output);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed for ${error.entity}.${error.field}`);
  } else if (error instanceof FileError) {
    console.error(`File error at ${error.path}: ${error.message}`);
  } else if (error instanceof AgentScopeError) {
    console.error(`AgentScope error [${error.code}]: ${error.message}`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Examples

### Basic Scanning

```typescript
import { scan } from '@vipasane/agentscope';

async function example1() {
  // Scan current directory
  const config = await scan('/path/to/project');

  console.log('Found:');
  console.log(`  - ${config.agents.length} agents`);
  console.log(`  - ${config.skills.length} skills`);
  console.log(`  - ${config.hooks.length} hooks`);
}

example1().catch(console.error);
```

### Generate All Diagrams

```typescript
import {
  scan,
  generateHierarchy,
  generateComponentMap,
  generateDataflow,
} from '@vipasane/agentscope';

async function example2() {
  const config = await scan('/path/to/project');
  const theme = 'dark';

  const hierarchy = generateHierarchy(config, { theme });
  const componentMap = generateComponentMap(config, { theme });
  const dataflow = generateDataflow(config, { theme });

  console.log('Diagrams generated');
}

example2().catch(console.error);
```

### Generate Category Documentation

```typescript
import { scan, generateCategoryDocs } from '@vipasane/agentscope';

async function example3() {
  const config = await scan('/path/to/project');

  // Generate category-based documentation
  await generateCategoryDocs(config, './docs/agent-architecture/', {
    generateDiagrams: true,
    theme: 'dark',
  });

  console.log('Category documentation generated');
}

example3().catch(console.error);
```

### Generate ADR Index

```typescript
import { scan, generateAdrIndex } from '@vipasane/agentscope';

async function example4() {
  const config = await scan('/path/to/project');

  // Generate ADR index with MADR template
  const adrOutput = await generateAdrIndex(config, {
    outputPath: './docs/adr/',
    includeTemplate: true,
    adrVersion: 'madr-3.0',
  });

  console.log('ADR index generated');
  console.log(`Found ${adrOutput.discovered.length} ADRs`);
}

example4().catch(console.error);
```

### Generate CONTEXT Template

```typescript
import { scan, generateContextTemplate } from '@vipasane/agentscope';

async function example5() {
  const config = await scan('/path/to/project');

  // Generate arc42 CONTEXT template
  const contextOutput = await generateContextTemplate(config, {
    template: 'arc42',
    fillAuto: true,
    sections: [1, 2, 3],
  });

  console.log('CONTEXT template generated');
  console.log('Auto-populated goals:', contextOutput.autoPopulated.goals);
}

example5().catch(console.error);
```

### Export and Import Configuration

```typescript
import { scan, exportConfig, importConfig } from '@vipasane/agentscope';

async function example6() {
  // Export from one project
  const config = await scan('/project/A');
  const exported = await exportConfig(config, {
    sanitizeSecrets: true,
    transformPaths: true,
  });

  // Import to another project
  const result = await importConfig(exported, '/project/B', {
    overwrite: true,
    validateTarget: true,
  });

  console.log(`Imported ${result.itemsImported} items`);
}

example6().catch(console.error);
```

### Validate Configuration

```typescript
import { scan, validate } from '@vipasane/agentscope';

async function example7() {
  const config = await scan('/path/to/project');
  const result = validate(config);

  if (!result.valid) {
    console.error('Validation failed:');
    result.errors.forEach(error => {
      console.error(`  ${error.entity}.${error.field}: ${error.message}`);
    });
  }

  console.log(`Risk level: ${result.riskLevel}`);
}

example7().catch(console.error);
```

### Custom Category Detection

```typescript
import { detectCategory, getBuiltInCategories } from '@vipasane/agentscope';

async function example8() {
  const agent = {
    name: 'PullRequestReviewer',
    description: 'Reviews pull requests for quality',
    type: 'worker' as const,
  };

  const detection = detectCategory(agent);

  console.log(`Category: ${detection.category}`);
  console.log(`Confidence: ${detection.confidence}`);
  console.log(`Reason: ${detection.reason}`);
}

example8().catch(console.error);
```

---

## See Also

- [CLI Reference](./CLI-REFERENCE.md) - Command-line usage
- [User Guide](./USER-GUIDE-v1.2.md) - Feature guide
- [Migration Guide](./MIGRATION-GUIDE-v1.2.md) - Upgrade from v1.1
- [Examples](./EXAMPLES.md) - Complete output examples
