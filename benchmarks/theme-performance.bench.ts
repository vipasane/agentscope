/**
 * Theme System Performance Benchmarks
 * Measures performance of theme generation operations
 */

import { describe, bench, beforeEach } from 'vitest';
import {
  MermaidThemeGenerator,
  createThemeGenerator,
} from '../src/core/themes/generator.js';
import {
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  colorblindLightTheme,
  builtinPalettes,
} from '../src/core/themes/palettes/index.js';
import { ThemeRegistry, getThemeRegistry } from '../src/core/themes/registry.js';
import { ThemeLoader } from '../src/core/themes/loader.js';
import { generateHierarchy } from '../src/core/generators/diagrams/hierarchy.js';
import { generateComponentMap } from '../src/core/generators/diagrams/component-map.js';
import type { AgentScopeConfig, Agent, McpServer, Skill } from '../src/core/model/types.js';

// Create test configs of various sizes
function createConfig(agentCount: number): AgentScopeConfig {
  const agents: Agent[] = [];
  for (let i = 0; i < agentCount; i++) {
    const types = ['coordinator', 'worker', 'specialist', 'reviewer'] as const;
    agents.push({
      name: `agent-${i}`,
      path: `.claude/agents/agent-${i}.md`,
      type: types[i % 4],
      delegatesTo: i > 0 ? [`agent-${i - 1}`] : undefined,
    });
  }

  const skills: Skill[] = [
    { name: 'code-review', path: '.claude/skills/code-review/SKILL.md' },
    { name: 'testing', path: '.claude/skills/testing/SKILL.md' },
  ];

  const mcpServers: McpServer[] = [
    { name: 'github', command: 'npx', args: ['@github/mcp-server'] },
    { name: 'filesystem', command: 'npx', args: ['@fs/mcp-server'] },
  ];

  return {
    agents,
    skills,
    hooks: [],
    commands: [],
    mcpServers,
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 10,
      errors: [],
    },
  };
}

const smallConfig = createConfig(5);
const mediumConfig = createConfig(20);
const largeConfig = createConfig(50);

describe('Theme Generator Performance', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  bench('MermaidThemeGenerator initialization - light theme', () => {
    new MermaidThemeGenerator(lightTheme);
  });

  bench('MermaidThemeGenerator initialization - by name', () => {
    new MermaidThemeGenerator('dark');
  });

  bench('MermaidThemeGenerator.getInit()', () => {
    const generator = new MermaidThemeGenerator(lightTheme);
    generator.getInit();
  });

  bench('MermaidThemeGenerator.getClassDefs()', () => {
    const generator = new MermaidThemeGenerator(lightTheme);
    generator.getClassDefs();
  });

  bench('MermaidThemeGenerator.getAllStyles()', () => {
    const generator = new MermaidThemeGenerator(lightTheme);
    generator.getAllStyles();
  });

  bench('MermaidThemeGenerator.getMermaidConfig()', () => {
    const generator = new MermaidThemeGenerator(lightTheme);
    generator.getMermaidConfig();
  });
});

describe('Theme Registry Performance', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  bench('ThemeRegistry.getInstance()', () => {
    ThemeRegistry.getInstance();
  });

  bench('ThemeRegistry.get() - builtin theme', () => {
    const registry = getThemeRegistry();
    registry.get('dark');
  });

  bench('ThemeRegistry.getOrDefault()', () => {
    const registry = getThemeRegistry();
    registry.getOrDefault('nonexistent');
  });

  bench('ThemeRegistry.list()', () => {
    const registry = getThemeRegistry();
    registry.list();
  });

  bench('ThemeRegistry.getAll()', () => {
    const registry = getThemeRegistry();
    registry.getAll();
  });

  bench('ThemeRegistry.validate() - valid theme', () => {
    const registry = getThemeRegistry();
    registry.validate(lightTheme);
  });
});

describe('Theme Loader Performance', () => {
  bench('ThemeLoader.resolve() - default', () => {
    const loader = new ThemeLoader();
    loader.resolve();
  });

  bench('ThemeLoader.resolve() - with CLI theme', () => {
    const loader = new ThemeLoader();
    loader.resolve({ cliTheme: 'dark' });
  });
});

describe('createThemeGenerator Helper Performance', () => {
  bench('createThemeGenerator - by name', () => {
    createThemeGenerator('dark');
  });

  bench('createThemeGenerator - by palette', () => {
    createThemeGenerator(lightTheme);
  });
});

describe('Full Diagram Generation with Theme', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  bench('generateHierarchy - small config (5 agents) - light theme', () => {
    generateHierarchy(smallConfig, { theme: 'light' });
  });

  bench('generateHierarchy - small config (5 agents) - dark theme', () => {
    generateHierarchy(smallConfig, { theme: 'dark' });
  });

  bench('generateHierarchy - medium config (20 agents) - light theme', () => {
    generateHierarchy(mediumConfig, { theme: 'light' });
  });

  bench('generateHierarchy - large config (50 agents) - light theme', () => {
    generateHierarchy(largeConfig, { theme: 'light' });
  });

  bench('generateComponentMap - small config - light theme', () => {
    generateComponentMap(smallConfig, { theme: 'light' });
  });

  bench('generateComponentMap - medium config - light theme', () => {
    generateComponentMap(mediumConfig, { theme: 'light' });
  });
});

describe('Theme Switching Performance', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  bench('Switch between all 6 themes', () => {
    const themeNames = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'colorblind-light', 'colorblind-dark'];
    for (const name of themeNames) {
      const generator = createThemeGenerator(name);
      generator.getInit();
      generator.getClassDefs();
    }
  });

  bench('Generate hierarchy with each theme', () => {
    const themeNames = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'colorblind-light', 'colorblind-dark'];
    for (const name of themeNames) {
      generateHierarchy(smallConfig, { theme: name });
    }
  });
});

describe('Memory Efficiency', () => {
  beforeEach(() => {
    ThemeRegistry.reset();
  });

  bench('Multiple generator instances', () => {
    // Simulate multiple diagram generations
    for (let i = 0; i < 10; i++) {
      const generator = new MermaidThemeGenerator(builtinPalettes[i % 6]);
      generator.getAllStyles();
    }
  });

  bench('Reuse single generator instance', () => {
    const generators = builtinPalettes.map(p => new MermaidThemeGenerator(p));
    for (let i = 0; i < 10; i++) {
      generators[i % 6].getAllStyles();
    }
  });
});
