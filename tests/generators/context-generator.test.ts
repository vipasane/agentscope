/**
 * Tests for CONTEXT.md Generator
 * Phase 3 Implementation Tests
 */

import { describe, it, expect } from 'vitest';
import { generateContextMd } from '../../src/core/generators/docs/context-generator.js';
import type { AgentScopeConfig } from '../../src/core/model/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(overrides: Partial<AgentScopeConfig> = {}): AgentScopeConfig {
  return {
    agents: [
      {
        name: 'planner',
        path: '.claude/agents/planner.md',
        description: 'Plans and coordinates code development',
        type: 'coordinator',
        delegatesTo: ['coder', 'reviewer'],
        tools: ['Task', 'Memory'],
      },
      {
        name: 'coder',
        path: '.claude/agents/coder.md',
        description: 'Implements code following best practices',
        type: 'worker',
        tools: ['Read', 'Write', 'Edit'],
      },
      {
        name: 'reviewer',
        path: '.claude/agents/reviewer.md',
        description: 'Reviews code for security and quality',
        type: 'reviewer',
        tools: ['Read', 'Grep'],
      },
      {
        name: 'tester',
        path: '.claude/agents/tester.md',
        description: 'Writes comprehensive tests',
        type: 'worker',
        tools: ['Read', 'Write', 'Bash'],
      },
    ],
    skills: [],
    hooks: [],
    commands: [],
    plugins: [],
    mcpServers: [
      {
        name: 'github-mcp',
        type: 'stdio',
        command: 'npx',
        args: ['@github/mcp'],
        tools: ['github-pr', 'github-issue'],
        disabled: false,
      },
      {
        name: 'database-mcp',
        type: 'sse',
        command: 'npx',
        args: ['@db/mcp'],
        tools: ['query', 'migrate'],
        disabled: false,
      },
    ],
    permissions: {
      filesystem: { allowed: ['read', 'write'] },
      network: { allowed: ['https'] },
    },
    metadata: {
      scanDate: '2026-01-25',
      version: '1.2.0',
    },
    errors: [],
    ...overrides,
  };
}

// ============================================================================
// CONTEXT.md Generator Tests
// ============================================================================

describe('generateContextMd', () => {
  it('should populate section 1 from agents', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('## 1. Introduction and Goals');
    expect(context).toContain('consists of 4 agents');
  });

  it('should extract goals from agent descriptions', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 1.1 Requirements Overview');
    expect(context).toContain('Code generation and implementation');
    expect(context).toContain('Code review and quality assurance');
    expect(context).toContain('Testing and validation');
    expect(context).toContain('Planning and coordination');
  });

  it('should include quality goals section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 1.2 Quality Goals');
    expect(context).toContain('USER INPUT REQUIRED');
  });

  it('should include stakeholders section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 1.3 Stakeholders');
  });

  it('should populate section 2 from MCP servers', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('## 2. Constraints');
    expect(context).toContain('### 2.1 Technical Constraints');
    expect(context).toContain('**MCP Server Dependencies:**');
  });

  it('should list MCP servers with tools', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('**github-mcp** (stdio)');
    expect(context).toContain('Tools: github-pr, github-issue');
    expect(context).toContain('**database-mcp** (sse)');
    expect(context).toContain('Tools: query, migrate');
  });

  it('should list tool dependencies', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('**Tool Dependencies:**');
    expect(context).toContain('* Bash');
    expect(context).toContain('* Edit');
    expect(context).toContain('* Read');
    expect(context).toContain('* Write');
  });

  it('should not list MCP servers when none configured', () => {
    const config = createMockConfig({ mcpServers: [] });
    const context = generateContextMd(config);

    expect(context).not.toContain('**MCP Server Dependencies:**');
  });

  it('should include organizational constraints section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 2.2 Organizational Constraints');
  });

  it('should include conventions section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 2.3 Conventions');
  });

  it('should include system boundary diagram', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('## 3. Context and Scope');
    expect(context).toContain('```mermaid');
    expect(context).toContain('C4Context');
    expect(context).toContain('System Boundary Diagram');
  });

  it('should show user and agent system in boundary diagram', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('Person(user');
    expect(context).toContain('System(agentCore');
    expect(context).toContain('4 agents');
  });

  it('should include MCP servers as external systems', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('System_Ext(github_mcp');
    expect(context).toContain('System_Ext(database_mcp');
  });

  it('should list external entities in table', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('**External Entities:**');
    expect(context).toContain('| Entity | Type | Interface | Purpose |');
    expect(context).toContain('| User | Human | Natural Language |');
    expect(context).toContain('| github-mcp | MCP Server | stdio |');
  });

  it('should include technical context section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('### 3.2 Technical Context');
    expect(context).toContain('**Communication Channels:**');
    expect(context).toContain('**Data Formats:**');
  });

  it('should list communication channels from MCP types', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('* **stdio**:');
    expect(context).toContain('* **sse**:');
  });

  it('should list data formats', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('**Configuration**: JSON, YAML');
    expect(context).toContain('**Agent Communication**: JSON');
    expect(context).toContain('**Documentation Output**: Markdown, Mermaid');
    expect(context).toContain('**MCP Protocol**: JSON-RPC 2.0');
  });

  it('should include solution strategy section', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('## 4. Solution Strategy');
    expect(context).toContain('### 4.1 Technology Decisions');
    expect(context).toContain('### 4.2 Top-Level Decomposition');
    expect(context).toContain('### 4.3 Quality Achievement');
  });

  it('should list agents by type in decomposition', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('* **coordinator** (1): planner');
    expect(context).toContain('* **worker** (2): coder, tester');
    expect(context).toContain('* **reviewer** (1): reviewer');
  });

  it('should include back navigation', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('[← Back to README](./README.md)');
  });

  it('should include timestamp footer', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toMatch(/Generated by AgentScope on \d{4}-\d{2}-\d{2}/);
  });

  it('should mark auto-generated sections', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('<!-- AUTO-GENERATED');
  });

  it('should mark user input sections', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    expect(context).toContain('<!-- USER INPUT REQUIRED');
  });

  it('should use custom project name when provided', () => {
    const config = createMockConfig();
    const context = generateContextMd(config, {
      projectName: 'My Custom Project',
    });

    expect(context).toContain('**My Custom Project**');
  });

  it('should use custom project description when provided', () => {
    const config = createMockConfig();
    const context = generateContextMd(config, {
      projectDescription: 'Custom Description',
    });

    expect(context).toContain('**Custom Description**');
  });

  it('should follow arc42 structure', () => {
    const config = createMockConfig();
    const context = generateContextMd(config);

    // Check sections are in correct order
    const sections = [
      '# Architecture Context (arc42)',
      '## 1. Introduction and Goals',
      '## 2. Constraints',
      '## 3. Context and Scope',
    ];

    let lastIndex = -1;
    for (const section of sections) {
      const index = context.indexOf(section);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
