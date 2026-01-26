/**
 * Enhanced Dataflow Diagram Generator
 * Generates data-centric view with sources, transformations, and sinks
 * Phase 3 Implementation: Tasks 3.1-3.3
 */

import type { AgentScopeConfig, Agent, Hook, McpServer } from '../../model/types.js';
import { MermaidThemeGenerator, resolveTheme, type ThemePalette } from '../../themes/index.js';

// ============================================================================
// Data Flow Metadata Types
// ============================================================================

export interface DataFlowMetadata {
  sources: DataSource[];
  transformations: DataTransformation[];
  sinks: DataSink[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'user' | 'config' | 'mcp' | 'filesystem';
  format: string;
  description?: string;
}

export interface DataTransformation {
  id: string;
  name: string;
  from: string;
  to: string;
  format: string;
  description?: string;
}

export interface DataSink {
  id: string;
  name: string;
  format: string;
  description?: string;
}

export interface EnhancedDataflowOptions {
  /** Custom title */
  title?: string;
  /** Theme palette or theme name */
  theme?: ThemePalette | string;
  /** Path to custom theme file */
  themePath?: string;
  /** Include data format annotations */
  includeFormats?: boolean;
}

// ============================================================================
// Task 3.1: Data Source and Sink Identification
// ============================================================================

/**
 * Identify all data sources, transformations, and sinks in the agent system
 *
 * Task 3.1: Data Source and Sink Identification (~70 lines)
 * - Identifies data sources (user, config files, MCP)
 * - Identifies transformations (parse, validate, generate)
 * - Identifies data sinks (documentation, diagrams, JSON)
 */
export function identifyDataFlow(config: AgentScopeConfig): DataFlowMetadata {
  const sources: DataSource[] = [];
  const transformations: DataTransformation[] = [];
  const sinks: DataSink[] = [];

  // Data Sources
  sources.push({
    id: 'user-input',
    name: 'User Input',
    type: 'user',
    format: 'Natural Language',
    description: 'User prompts and commands'
  });

  sources.push({
    id: 'config-files',
    name: 'Config Files',
    type: 'config',
    format: 'JSON/YAML',
    description: '.claude/settings.json, .mcp.json'
  });

  sources.push({
    id: 'agent-files',
    name: 'Agent Files',
    type: 'filesystem',
    format: 'Markdown',
    description: '.claude/agents/*.md, .claude/skills/*.md'
  });

  // MCP Server sources
  if (config.mcpServers.length > 0) {
    sources.push({
      id: 'mcp-servers',
      name: 'MCP Servers',
      type: 'mcp',
      format: 'JSON-RPC',
      description: 'External MCP server tools and data'
    });
  }

  // Transformations
  transformations.push({
    id: 'parse',
    name: 'Parser',
    from: 'JSON/YAML/Markdown',
    to: 'TypeScript Types',
    format: 'AgentScopeConfig',
    description: 'Parse configuration files into typed objects'
  });

  transformations.push({
    id: 'validate',
    name: 'Validator',
    from: 'TypeScript Types',
    to: 'Validated Config',
    format: 'AgentScopeConfig',
    description: 'Validate configuration integrity'
  });

  transformations.push({
    id: 'analyze',
    name: 'Analyzer',
    from: 'Validated Config',
    to: 'Analysis Results',
    format: 'Relationships, Delegations',
    description: 'Analyze agent relationships and delegation chains'
  });

  transformations.push({
    id: 'generate-diagrams',
    name: 'Diagram Generator',
    from: 'Analysis Results',
    to: 'Mermaid Diagrams',
    format: 'Mermaid Syntax',
    description: 'Generate component, hierarchy, and dataflow diagrams'
  });

  transformations.push({
    id: 'generate-docs',
    name: 'Documentation Generator',
    from: 'Analysis Results',
    to: 'Markdown',
    format: 'Markdown',
    description: 'Generate README.md and documentation files'
  });

  // Data Sinks
  sinks.push({
    id: 'readme',
    name: 'README.md',
    format: 'Markdown',
    description: 'Main documentation file'
  });

  sinks.push({
    id: 'component-map',
    name: 'component-map.md',
    format: 'Markdown + Mermaid',
    description: 'Component diagram documentation'
  });

  sinks.push({
    id: 'hierarchy',
    name: 'hierarchy.md',
    format: 'Markdown + Mermaid',
    description: 'Delegation hierarchy documentation'
  });

  sinks.push({
    id: 'dataflow',
    name: 'dataflow.md',
    format: 'Markdown + Mermaid',
    description: 'Dataflow diagram documentation'
  });

  sinks.push({
    id: 'config-json',
    name: 'config.json',
    format: 'JSON',
    description: 'Unified configuration export'
  });

  return { sources, transformations, sinks };
}

// ============================================================================
// Task 3.2: Enhanced Dataflow Diagram Generation
// ============================================================================

/**
 * Generate enhanced dataflow Mermaid diagram with data-centric view
 *
 * Task 3.2: Enhanced Dataflow Diagram Generation (~120 lines)
 * - Shows data sources in "Sources" subgraph
 * - Shows transformations in "Transformations" subgraph
 * - Shows data sinks in "Sinks" subgraph
 * - Edges annotated with data formats
 * - Different styles for source/transform/sink nodes
 */
export function generateEnhancedDataflowDiagram(
  metadata: DataFlowMetadata,
  options: EnhancedDataflowOptions = {}
): string {
  const {
    title = 'System Data Flow',
    theme,
    themePath,
    includeFormats = true,
  } = options;

  // Resolve theme
  const themeGenerator = new MermaidThemeGenerator(
    typeof theme === 'string' || !theme
      ? resolveTheme({ cliTheme: theme as string, themePath }).theme
      : theme
  );

  const lines: string[] = [
    '```mermaid',
    themeGenerator.getInit(),
    'graph LR',
    `    %% ${title}`,
    '',
  ];

  // Sources subgraph
  lines.push('    subgraph Sources["📥 Data Sources"]');
  for (const source of metadata.sources) {
    const icon = getSourceIcon(source.type);
    lines.push(`        ${source.id}["${icon} ${source.name}<br/><small>${source.format}</small>"]`);
  }
  lines.push('    end');
  lines.push('');

  // Transformations subgraph
  lines.push('    subgraph Transformations["⚙️ Data Transformations"]');
  for (const transform of metadata.transformations) {
    lines.push(`        ${transform.id}["🔄 ${transform.name}<br/><small>${transform.format}</small>"]`);
  }
  lines.push('    end');
  lines.push('');

  // Sinks subgraph
  lines.push('    subgraph Sinks["📤 Data Sinks"]');
  for (const sink of metadata.sinks) {
    const icon = getSinkIcon(sink.id);
    lines.push(`        ${sink.id}["${icon} ${sink.name}<br/><small>${sink.format}</small>"]`);
  }
  lines.push('    end');
  lines.push('');

  // Data flow connections
  lines.push('    %% Data Flow Connections');
  lines.push('');

  // Sources to Parser
  for (const source of metadata.sources) {
    const format = includeFormats ? `|"${source.format}"| ` : '';
    lines.push(`    ${source.id} -->${format}parse`);
  }

  // Parser to Validator
  lines.push('    parse -->|"TypeScript Types"| validate');

  // Validator to Analyzer
  lines.push('    validate -->|"Validated Config"| analyze');

  // Analyzer to Generators
  lines.push('    analyze -->|"Relationships"| generate-diagrams');
  lines.push('    analyze -->|"Relationships"| generate-docs');

  // Diagram Generator to Sinks
  const diagramSinks = metadata.sinks.filter(s =>
    s.id !== 'readme' && s.id !== 'config-json'
  );
  for (const sink of diagramSinks) {
    lines.push(`    generate-diagrams -->|"Mermaid"| ${sink.id}`);
  }

  // Documentation Generator to README
  lines.push('    generate-docs -->|"Markdown"| readme');

  // Config export
  lines.push('    validate -->|"JSON"| config-json');

  // Styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...themeGenerator.getClassDefs().map(def => `    ${def}`));

  // Custom class definitions for data flow
  lines.push('    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px');
  lines.push('    classDef transform fill:#fff3e0,stroke:#e65100,stroke-width:2px');
  lines.push('    classDef sink fill:#f1f8e9,stroke:#33691e,stroke-width:2px');

  // Apply classes
  const sourceIds = metadata.sources.map(s => s.id).join(',');
  const transformIds = metadata.transformations.map(t => t.id).join(',');
  const sinkIds = metadata.sinks.map(s => s.id).join(',');

  lines.push(`    class ${sourceIds} source`);
  lines.push(`    class ${transformIds} transform`);
  lines.push(`    class ${sinkIds} sink`);

  lines.push('```');

  return lines.join('\n');
}

// ============================================================================
// Task 3.3: Dataflow Markdown Formatter
// ============================================================================

/**
 * Generate complete dataflow.md file with diagram and annotations
 *
 * Task 3.3: Dataflow Markdown Formatter (~80 lines)
 * - Includes dataflow diagram
 * - Includes data format annotations table
 * - Back navigation to README
 */
export function formatDataflowDocument(
  config: AgentScopeConfig,
  options: EnhancedDataflowOptions = {}
): string {
  const metadata = identifyDataFlow(config);
  const diagram = generateEnhancedDataflowDiagram(metadata, options);

  const lines: string[] = [
    '# System Data Flow',
    '',
    '> Data-centric view of how information flows through the agent system',
    '',
    '[← Back to README](./README.md)',
    '',
    '---',
    '',
    diagram,
    '',
    '---',
    '',
    '## Data Format Annotations',
    '',
    '### Data Sources',
    '',
    '| Source | Type | Format | Description |',
    '|--------|------|--------|-------------|',
  ];

  for (const source of metadata.sources) {
    const typeIcon = getSourceIcon(source.type);
    lines.push(`| ${typeIcon} ${source.name} | ${source.type} | ${source.format} | ${source.description || 'N/A'} |`);
  }

  lines.push('');
  lines.push('### Data Transformations');
  lines.push('');
  lines.push('| From | Transformation | To | Output Format | Description |');
  lines.push('|------|----------------|-----|---------------|-------------|');

  for (const transform of metadata.transformations) {
    lines.push(`| ${transform.from} | 🔄 ${transform.name} | ${transform.to} | ${transform.format} | ${transform.description || 'N/A'} |`);
  }

  lines.push('');
  lines.push('### Data Sinks');
  lines.push('');
  lines.push('| Sink | Format | Description |');
  lines.push('|------|--------|-------------|');

  for (const sink of metadata.sinks) {
    const icon = getSinkIcon(sink.id);
    lines.push(`| ${icon} ${sink.name} | ${sink.format} | ${sink.description || 'N/A'} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Flow Summary');
  lines.push('');
  lines.push('1. **Input Layer**: User prompts and configuration files');
  lines.push('2. **Parsing Layer**: Convert raw data to TypeScript types');
  lines.push('3. **Validation Layer**: Validate configuration integrity');
  lines.push('4. **Analysis Layer**: Analyze relationships and delegation chains');
  lines.push('5. **Generation Layer**: Generate diagrams and documentation');
  lines.push('6. **Output Layer**: Write markdown files and export JSON');
  lines.push('');
  lines.push('[← Back to README](./README.md)');
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\.\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSourceIcon(type: string): string {
  switch (type) {
    case 'user': return '👤';
    case 'config': return '⚙️';
    case 'mcp': return '🔌';
    case 'filesystem': return '📁';
    default: return '📥';
  }
}

function getSinkIcon(id: string): string {
  switch (id) {
    case 'readme': return '📄';
    case 'component-map': return '🗺️';
    case 'hierarchy': return '🌳';
    case 'dataflow': return '🔄';
    case 'config-json': return '📋';
    default: return '📤';
  }
}
