/**
 * Example: Using the Output Formatter Domain
 * Demonstrates DocumentBuilder, navigation, legend, and relationship utilities
 */

import {
  DocumentBuilder,
  generateNavLinks,
  standardLegend,
  calculateRelationships,
  type AgentScopeConfig,
  type Agent,
} from '../core/index.js';

/**
 * Example 1: Building a complete document with all features
 */
function buildCompleteDocument() {
  const doc = new DocumentBuilder()
    // Add navigation
    .addNavigation('./overview.md', './details.md')

    // Add title section
    .addSection({
      id: 'title',
      title: 'Component Map',
      content: '# Component Map\n\nVisualization of all agents and their relationships.',
      level: 1,
    })

    // Add a Mermaid diagram
    .addDiagram(
      `graph TD
  Coordinator[Coordinator Agent] --> Worker1[Worker 1]
  Coordinator --> Worker2[Worker 2]
  Worker1 --> Specialist[Specialist]`,
      'System Architecture'
    )

    // Add category navigation
    .addCategoryNavigation([
      { category: 'Coordinators', count: 1, sectionLink: '#coordinators', detailsLink: './coord.md' },
      { category: 'Workers', count: 2, sectionLink: '#workers' },
      { category: 'Specialists', count: 1, sectionLink: '#specialists' },
    ])

    // Add legend
    .addLegend(standardLegend)

    // Add timestamp
    .addTimestamp()

    // Build the final document
    .build();

  console.log('Complete Document:');
  console.log(doc);
  console.log('\n---\n');
}

/**
 * Example 2: Building with relationship summary
 */
function buildWithRelationships() {
  // Mock configuration
  const config: AgentScopeConfig = {
    agents: [
      {
        name: 'MainCoordinator',
        path: './coordinator.ts',
        type: 'coordinator',
        tools: ['git', 'npm'],
        delegatesTo: ['Worker1', 'Worker2'],
      },
      {
        name: 'Worker1',
        path: './worker1.ts',
        type: 'worker',
        tools: ['bash', 'docker'],
        delegatesTo: ['Specialist'],
      },
      {
        name: 'Worker2',
        path: './worker2.ts',
        type: 'worker',
        tools: ['git'],
      },
      {
        name: 'Specialist',
        path: './specialist.ts',
        type: 'specialist',
        tools: ['python', 'typescript'],
      },
    ],
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 4,
      errors: [],
    },
  };

  // Calculate relationships
  const relationships = calculateRelationships(config);

  const doc = new DocumentBuilder()
    .addSection({
      id: 'overview',
      title: 'System Overview',
      content: '## System Overview\n\nAgent system with delegation and tool usage.',
      level: 2,
    })
    .addRelationshipSummary(relationships)
    .addTimestamp()
    .build();

  console.log('Document with Relationships:');
  console.log(doc);
  console.log('\n---\n');
}

/**
 * Example 3: Simple navigation links
 */
function demonstrateNavigation() {
  // Generate navigation links
  const nav1 = generateNavLinks('./overview.md', './hierarchy.md');
  console.log('Navigation (both):', nav1);

  const nav2 = generateNavLinks('./overview.md');
  console.log('Navigation (prev only):', nav2);

  const nav3 = generateNavLinks(undefined, './hierarchy.md');
  console.log('Navigation (next only):', nav3);

  console.log('\n---\n');
}

/**
 * Example 4: Table builder
 */
function buildTable() {
  const doc = new DocumentBuilder()
    .addTable(
      ['Agent', 'Type', 'Tools', 'Delegates To'],
      [
        ['Coordinator', 'coordinator', '2', '2 agents'],
        ['Worker1', 'worker', '2', '1 agent'],
        ['Worker2', 'worker', '1', 'None'],
      ],
      'Agent Summary'
    )
    .build();

  console.log('Table Document:');
  console.log(doc);
  console.log('\n---\n');
}

/**
 * Example 5: Fluent chaining
 */
function demonstrateFluentAPI() {
  const doc = new DocumentBuilder({ includeTimestamp: true })
    .addNavigation('./prev.md', './next.md')
    .addSection({
      id: 'intro',
      title: 'Introduction',
      content: '## Introduction\n\nThis is a test document.',
      level: 2,
    })
    .addDiagram('graph LR\nA-->B', 'Simple Flow')
    .addTable(['Column A', 'Column B'], [['Value 1', 'Value 2']])
    .addTimestamp()
    .build();

  console.log('Fluent API Document:');
  console.log(doc);
}

// Run all examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== Output Formatter Examples ===\n');

  buildCompleteDocument();
  buildWithRelationships();
  demonstrateNavigation();
  buildTable();
  demonstrateFluentAPI();
}
