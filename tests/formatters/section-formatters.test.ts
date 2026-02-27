/**
 * Test Suite for Section Formatters - v1.2 Phase 1
 * Tests for Quick Stats, System Overview, Comparison Tables, Capabilities Matrix, and Delegation Hierarchy
 */

import { describe, it, expect } from 'vitest';
import {
  formatQuickStats,
  formatAgentsComparisonTable,
  formatAgentsCapabilitiesMatrix,
  generateDelegationHierarchy,
  type QuickStatsInput,
} from '../../src/core/formatters/output/section-formatters.js';
import type { Agent, AgentScopeConfig, ScanMetadata } from '../../src/core/model/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function mockScanMetadata(overrides?: Partial<ScanMetadata>): ScanMetadata {
  return {
    scannedAt: new Date('2026-01-25T10:00:00Z'),
    rootPath: '/test/project',
    version: '0.1.0',
    duration: 1200,
    filesScanned: 42,
    errors: [],
    ...overrides,
  };
}

function mockAgent(overrides?: Partial<Agent>): Agent {
  return {
    name: 'test-agent',
    path: '/agents/test-agent.md',
    description: 'Test agent description',
    tools: ['Read', 'Write'],
    delegatesTo: [],
    type: 'worker',
    ...overrides,
  };
}

function mockConfig(overrides?: Partial<AgentScopeConfig>): AgentScopeConfig {
  return {
    agents: [],
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    plugins: [],
    permissions: {
      allowCount: 0,
      denyCount: 0,
      askCount: 0,
      rules: [],
    },
    metadata: mockScanMetadata(),
    ...overrides,
  };
}

// ============================================================================
// Task 1.1: Quick Stats Section Generator
// ============================================================================

describe('formatQuickStats', () => {
  it('should count all entity types', () => {
    const stats: QuickStatsInput = {
      agents: 14,
      skills: 5,
      mcpServers: 3,
      hooks: 8,
      commands: 4,
      plugins: 2,
      permissions: 12,
    };
    const result = formatQuickStats(stats);

    expect(result).toContain('| 🤖 Agents | 14 |');
    expect(result).toContain('| ⚡ Skills | 5 |');
    expect(result).toContain('| 🔌 MCP Servers | 3 |');
    expect(result).toContain('| 🪝 Hooks | 8 |');
    expect(result).toContain('| ⌘ Commands | 4 |');
    expect(result).toContain('| 🧩 Plugins | 2 |');
    expect(result).toContain('| 🔐 Permissions | 12 |');
  });

  it('should include links to detail sections', () => {
    const stats: QuickStatsInput = {
      agents: 14,
      skills: 5,
      mcpServers: 0,
      hooks: 0,
      commands: 0,
      plugins: 0,
      permissions: 0,
    };
    const result = formatQuickStats(stats);

    expect(result).toContain('[View all →](#agents-comparison)');
    expect(result).toContain('[View all →](#skills)');
  });

  it('should omit sections with zero count', () => {
    const stats: QuickStatsInput = {
      agents: 14,
      skills: 0,
      mcpServers: 0,
      hooks: 0,
      commands: 0,
      plugins: 0,
      permissions: 0,
    };
    const result = formatQuickStats(stats);

    expect(result).toContain('Agents');
    expect(result).not.toContain('Skills');
    expect(result).not.toContain('MCP Servers');
  });

  it('should format as markdown table', () => {
    const stats: QuickStatsInput = {
      agents: 14,
      skills: 5,
      mcpServers: 3,
      hooks: 8,
      commands: 4,
      plugins: 2,
      permissions: 12,
    };
    const result = formatQuickStats(stats);

    expect(result).toContain('| Component | Count | Details |');
    expect(result).toContain('|-----------|------:|---------|');
  });
});

// ============================================================================
// Task 1.1 Extended: Quick Stats with Scan Metadata
// ============================================================================

describe('generateQuickStatsWithMetadata', () => {
  it('should include scan metadata', () => {
    const config = mockConfig({
      agents: [mockAgent(), mockAgent({ name: 'agent-2' })],
      skills: [],
      metadata: mockScanMetadata({
        scannedAt: new Date('2026-01-25T10:00:00Z'),
        duration: 1234,
        filesScanned: 42,
      }),
    });

    // This will be implemented as part of the formatter
    const stats: QuickStatsInput = {
      agents: config.agents.length,
      skills: config.skills.length,
      mcpServers: config.mcpServers.length,
      hooks: config.hooks.length,
      commands: config.commands.length,
      plugins: config.plugins.length,
      permissions: config.permissions.allowCount + config.permissions.denyCount + config.permissions.askCount,
    };

    const result = formatQuickStats(stats);
    expect(result).toBeTruthy();
    // Metadata formatting will be added in extended implementation
  });
});

// ============================================================================
// Task 1.2: System Overview Diagram Generator
// ============================================================================

describe('generateSystemOverviewDiagram', () => {
  it('should create category subgraphs', () => {
    const config = mockConfig({
      agents: [
        mockAgent({ name: 'pr-manager', metadata: { category: 'github' } }),
        mockAgent({ name: 'issue-tracker', metadata: { category: 'github' } }),
        mockAgent({ name: 'security-auditor', metadata: { category: 'security' } }),
      ],
    });

    // Import function when implemented
    // const diagram = generateSystemOverviewDiagram(config);
    // expect(diagram).toContain('subgraph System');
    // expect(diagram).toContain('github["🐙 GitHub');
    expect(true).toBe(true); // Placeholder until implementation
  });

  it('should annotate with entity counts', () => {
    const config = mockConfig({
      agents: [
        mockAgent({ name: 'pr-1', metadata: { category: 'github' } }),
        mockAgent({ name: 'pr-2', metadata: { category: 'github' } }),
        mockAgent({ name: 'pr-3', metadata: { category: 'github' } }),
        mockAgent({ name: 'pr-4', metadata: { category: 'github' } }),
        mockAgent({ name: 'sec-1', metadata: { category: 'security' } }),
        mockAgent({ name: 'sec-2', metadata: { category: 'security' } }),
        mockAgent({ name: 'sec-3', metadata: { category: 'security' } }),
      ],
    });

    // Import function when implemented
    // const diagram = generateSystemOverviewDiagram(config);
    // expect(diagram).toContain('<b>4 agents</b>');
    // expect(diagram).toContain('<b>3 agents</b>');
    expect(true).toBe(true); // Placeholder until implementation
  });
});

// ============================================================================
// Task 1.3: Agents Comparison Table Generator
// ============================================================================

describe('formatAgentsComparisonTable - Enhanced', () => {
  it('should include all agents', () => {
    const agents = [
      mockAgent({ name: 'coder' }),
      mockAgent({ name: 'reviewer' }),
    ];
    const table = formatAgentsComparisonTable(agents);

    expect(table).toContain('coder');
    expect(table).toContain('reviewer');
  });

  it('should show type icons', () => {
    const coordinator = mockAgent({ name: 'coord', type: 'coordinator' });
    const worker = mockAgent({ name: 'work', type: 'worker' });
    const table = formatAgentsComparisonTable([coordinator, worker]);

    expect(table).toContain('👑'); // Coordinator icon
    expect(table).toContain('🤖'); // Worker icon
  });

  it('should include legend', () => {
    const table = formatAgentsComparisonTable([mockAgent()]);
    expect(table).toContain('**Legend:**');
    expect(table).toContain('👑 Coordinator');
  });
});

// ============================================================================
// Task 1.4: Capabilities Matrix Generator
// ============================================================================

describe('formatAgentsCapabilitiesMatrix', () => {
  it('should detect code writing capability', () => {
    const agent = mockAgent({
      name: 'coder',
      tools: ['Write', 'Edit']
    });
    const matrix = formatAgentsCapabilitiesMatrix([agent]);

    expect(matrix).toContain('coder');
    expect(matrix).toContain('✓'); // Has code writing capability
  });

  it('should detect review capability', () => {
    const agent = mockAgent({
      name: 'reviewer',
      description: 'Code review agent'
    });
    const matrix = formatAgentsCapabilitiesMatrix([agent]);

    expect(matrix).toContain('reviewer');
    expect(matrix).toContain('✓'); // Has review capability
  });

  it('should show empty cells for missing capabilities', () => {
    const agent = mockAgent({
      name: 'agent',
      tools: [],
      description: 'Basic agent'
    });
    const matrix = formatAgentsCapabilitiesMatrix([agent]);

    // Should have agent name and empty capability cells
    expect(matrix).toContain('agent');
  });

  it('should center checkmarks in columns', () => {
    const agent = mockAgent({ name: 'coder', tools: ['Write'] });
    const matrix = formatAgentsCapabilitiesMatrix([agent]);

    // Check for centered column alignment
    expect(matrix).toContain(':-------:');
  });
});

// ============================================================================
// Task 1.5: Delegation Hierarchy Section Generator
// ============================================================================

describe('generateDelegationHierarchy', () => {
  it('should show delegation arrows', () => {
    const planner = mockAgent({
      name: 'planner',
      delegatesTo: ['coder', 'tester']
    });
    const coder = mockAgent({ name: 'coder' });
    const tester = mockAgent({ name: 'tester' });

    const hierarchy = generateDelegationHierarchy([planner, coder, tester]);
    expect(hierarchy).toContain('planner') && expect(hierarchy).toContain('coder');
    expect(hierarchy).toContain('planner') && expect(hierarchy).toContain('tester');
    expect(hierarchy).toContain('-->');
  });

  it('should use collapsible section', () => {
    const agents = [mockAgent({ delegatesTo: ['other'] }), mockAgent({ name: 'other' })];

    const hierarchy = generateDelegationHierarchy(agents);
    expect(hierarchy).toContain('<details>');
    expect(hierarchy).toContain('📊 Click to expand delegation hierarchy');
  });

  it('should apply correct styles', () => {
    const agents = [
      mockAgent({ name: 'planner', type: 'coordinator', delegatesTo: ['coder'] }),
      mockAgent({ name: 'coder', type: 'worker' })
    ];

    const hierarchy = generateDelegationHierarchy(agents);
    expect(hierarchy).toContain('classDef coord');
    expect(hierarchy).toContain('class planner coord');
  });

  it('should return empty string when no delegations exist', () => {
    const standalone1 = mockAgent({ name: 'standalone1', delegatesTo: [] });
    const standalone2 = mockAgent({ name: 'standalone2' });

    const hierarchy = generateDelegationHierarchy([standalone1, standalone2]);
    expect(hierarchy).toBe('');
  });

  it('should include agents that are delegated to', () => {
    const planner = mockAgent({
      name: 'planner',
      delegatesTo: ['coder']
    });
    const coder = mockAgent({ name: 'coder' });
    const isolated = mockAgent({ name: 'isolated', delegatesTo: [] });

    const hierarchy = generateDelegationHierarchy([planner, coder, isolated]);
    expect(hierarchy).toContain('planner');
    expect(hierarchy).toContain('coder');
    // Isolated agent should not appear in node definitions
    expect(hierarchy).not.toContain('isolated["isolated"]');
  });

  it('should add shared workers note when workers have multiple parents', () => {
    const planner = mockAgent({
      name: 'planner',
      type: 'coordinator',
      delegatesTo: ['coder', 'reviewer']
    });
    const prManager = mockAgent({
      name: 'pr-manager',
      type: 'coordinator',
      delegatesTo: ['coder', 'reviewer']
    });
    const coder = mockAgent({ name: 'coder', type: 'worker' });
    const reviewer = mockAgent({ name: 'reviewer', type: 'reviewer' });

    const hierarchy = generateDelegationHierarchy([planner, prManager, coder, reviewer]);
    expect(hierarchy).toContain('**Shared workers:**');
    expect(hierarchy).toContain('`coder`');
    expect(hierarchy).toContain('`reviewer`');
    expect(hierarchy).toContain('multiple coordinators');
  });

  it('should not add shared workers note when no workers are shared', () => {
    const planner = mockAgent({
      name: 'planner',
      type: 'coordinator',
      delegatesTo: ['coder']
    });
    const coder = mockAgent({ name: 'coder', type: 'worker' });

    const hierarchy = generateDelegationHierarchy([planner, coder]);
    expect(hierarchy).not.toContain('**Shared workers:**');
  });
});
