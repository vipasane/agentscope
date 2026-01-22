/**
 * Scan Performance Benchmark Suite
 *
 * Performance Targets (from PRD):
 * - Scan completion: <5 seconds for configs with <50 components
 * - Post-MVP optimization: <3 seconds for <50 components
 *
 * This benchmark measures:
 * - Full scan time for various fixture sizes
 * - File discovery performance
 * - YAML/Markdown parsing performance
 * - Configuration aggregation performance
 */

import { describe, bench, beforeAll, afterAll, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import {
  PERFORMANCE_TARGETS,
  measurePerformance,
  benchmark,
  Timer,
  PerformanceCache,
} from '../src/utils/performance.js';
import {
  generateConfig,
  writeFixtureToDisk,
  cleanupFixture,
  FIXTURE_PRESETS,
  getComponentCount,
} from '../tests/fixtures/fixture-generator.js';
import type { AgentScopeConfig } from '../src/model/types.js';

// Fixture paths for disk-based scanning
const FIXTURE_BASE = '/tmp/agentscope-bench';
const FIXTURES = {
  minimal: path.join(FIXTURE_BASE, 'minimal'),
  small: path.join(FIXTURE_BASE, 'small'),
  typical: path.join(FIXTURE_BASE, 'typical'),
  large: path.join(FIXTURE_BASE, 'large'),
  stress: path.join(FIXTURE_BASE, 'stress'),
};

describe('Scan Performance Benchmarks', () => {
  beforeAll(async () => {
    // Create fixture directories with actual files
    await fs.promises.mkdir(FIXTURE_BASE, { recursive: true });

    console.log('\nGenerating fixtures for disk-based scanning...');
    for (const [name, fixturePath] of Object.entries(FIXTURES)) {
      const preset = FIXTURE_PRESETS[name as keyof typeof FIXTURE_PRESETS];
      if (preset) {
        await writeFixtureToDisk(fixturePath, preset);
        console.log(`  Created ${name} fixture (${getComponentCount(preset)} components)`);
      }
    }
  });

  afterAll(async () => {
    // Cleanup fixtures
    await cleanupFixture(FIXTURE_BASE);
  });

  describe('In-Memory Config Generation', () => {
    bench('generate minimal config (2 components)', () => {
      generateConfig(FIXTURE_PRESETS.minimal);
    });

    bench('generate small config (12 components)', () => {
      generateConfig(FIXTURE_PRESETS.small);
    });

    bench('generate typical config (27 components)', () => {
      generateConfig(FIXTURE_PRESETS.typical);
    });

    bench('generate large config (110 components)', () => {
      generateConfig(FIXTURE_PRESETS.large);
    });

    bench('generate stress config (220 components)', () => {
      generateConfig(FIXTURE_PRESETS.stress);
    });
  });

  describe('File Discovery Simulation', () => {
    /**
     * Simulates the file discovery phase of scanning.
     * In real implementation, this uses globby/fast-glob.
     */
    bench('discover files - minimal fixture', async () => {
      const patterns = [
        path.join(FIXTURES.minimal, '.claude', 'agents', '*.md'),
        path.join(FIXTURES.minimal, '.claude', 'skills', '*.md'),
        path.join(FIXTURES.minimal, '.claude', 'hooks', '*.js'),
        path.join(FIXTURES.minimal, '.mcp.json'),
        path.join(FIXTURES.minimal, 'CLAUDE.md'),
      ];

      for (const pattern of patterns) {
        const basePath = pattern.replace(/\*.*$/, '');
        if (fs.existsSync(basePath) || fs.existsSync(pattern)) {
          // File exists check simulation
        }
      }
    });

    bench('discover files - typical fixture', async () => {
      const patterns = [
        path.join(FIXTURES.typical, '.claude', 'agents', '*.md'),
        path.join(FIXTURES.typical, '.claude', 'skills', '*.md'),
        path.join(FIXTURES.typical, '.claude', 'hooks', '*.js'),
        path.join(FIXTURES.typical, '.mcp.json'),
        path.join(FIXTURES.typical, 'CLAUDE.md'),
      ];

      for (const pattern of patterns) {
        const basePath = pattern.replace(/\*.*$/, '');
        if (fs.existsSync(basePath) || fs.existsSync(pattern)) {
          // File exists check simulation
        }
      }
    });

    bench('discover files - large fixture', async () => {
      const patterns = [
        path.join(FIXTURES.large, '.claude', 'agents', '*.md'),
        path.join(FIXTURES.large, '.claude', 'skills', '*.md'),
        path.join(FIXTURES.large, '.claude', 'hooks', '*.js'),
        path.join(FIXTURES.large, '.mcp.json'),
        path.join(FIXTURES.large, 'CLAUDE.md'),
      ];

      for (const pattern of patterns) {
        const basePath = pattern.replace(/\*.*$/, '');
        if (fs.existsSync(basePath) || fs.existsSync(pattern)) {
          // File exists check simulation
        }
      }
    });
  });

  describe('File Read Performance', () => {
    bench('read single agent file', async () => {
      const agentPath = path.join(FIXTURES.typical, '.claude', 'agents', 'agent-0.md');
      if (fs.existsSync(agentPath)) {
        await fs.promises.readFile(agentPath, 'utf-8');
      }
    });

    bench('read MCP config', async () => {
      const mcpPath = path.join(FIXTURES.typical, '.mcp.json');
      if (fs.existsSync(mcpPath)) {
        const content = await fs.promises.readFile(mcpPath, 'utf-8');
        JSON.parse(content);
      }
    });

    bench('read all agent files - typical', async () => {
      const agentsDir = path.join(FIXTURES.typical, '.claude', 'agents');
      if (fs.existsSync(agentsDir)) {
        const files = await fs.promises.readdir(agentsDir);
        await Promise.all(
          files.map(file =>
            fs.promises.readFile(path.join(agentsDir, file), 'utf-8')
          )
        );
      }
    });

    bench('read all files - typical fixture', async () => {
      const dirs = [
        path.join(FIXTURES.typical, '.claude', 'agents'),
        path.join(FIXTURES.typical, '.claude', 'skills'),
        path.join(FIXTURES.typical, '.claude', 'hooks'),
      ];

      const readPromises: Promise<string>[] = [];

      for (const dir of dirs) {
        if (fs.existsSync(dir)) {
          const files = await fs.promises.readdir(dir);
          for (const file of files) {
            readPromises.push(
              fs.promises.readFile(path.join(dir, file), 'utf-8')
            );
          }
        }
      }

      await Promise.all(readPromises);
    });
  });

  describe('JSON Parsing Performance', () => {
    const smallJson = JSON.stringify({ name: 'test', value: 123 });
    const mediumJson = JSON.stringify(generateConfig(FIXTURE_PRESETS.small));
    const largeJson = JSON.stringify(generateConfig(FIXTURE_PRESETS.large));

    bench('parse small JSON', () => {
      JSON.parse(smallJson);
    });

    bench('parse medium JSON (small config)', () => {
      JSON.parse(mediumJson);
    });

    bench('parse large JSON (large config)', () => {
      JSON.parse(largeJson);
    });
  });

  describe('Config Aggregation Performance', () => {
    const configs = {
      minimal: generateConfig(FIXTURE_PRESETS.minimal),
      small: generateConfig(FIXTURE_PRESETS.small),
      typical: generateConfig(FIXTURE_PRESETS.typical),
      large: generateConfig(FIXTURE_PRESETS.large),
    };

    bench('aggregate agents - typical config', () => {
      const agents = configs.typical.agents;
      const agentMap = new Map(agents.map(a => [a.id, a]));
      // Simulate aggregation operations
      const projectAgents = agents.filter(a => a.source === 'project');
      const userAgents = agents.filter(a => a.source === 'user');
    });

    bench('aggregate all components - typical config', () => {
      const { agents, skills, hooks, mcpServers } = configs.typical;

      // Build relationship maps
      const agentMap = new Map(agents.map(a => [a.id, a]));
      const skillMap = new Map(skills.map(s => [s.id, s]));

      // Resolve skill references
      for (const agent of agents) {
        const resolvedSkills = agent.skills
          .map(id => skillMap.get(id))
          .filter(Boolean);
      }
    });

    bench('aggregate all components - large config', () => {
      const { agents, skills, hooks, mcpServers } = configs.large;

      const agentMap = new Map(agents.map(a => [a.id, a]));
      const skillMap = new Map(skills.map(s => [s.id, s]));

      for (const agent of agents) {
        const resolvedSkills = agent.skills
          .map(id => skillMap.get(id))
          .filter(Boolean);
      }
    });
  });

  describe('Caching Performance', () => {
    const cache = new PerformanceCache<string, AgentScopeConfig>(100);
    const testConfig = generateConfig(FIXTURE_PRESETS.typical);

    bench('cache miss + store', () => {
      const key = `config-${Math.random()}`;
      cache.get(key);
      cache.set(key, testConfig);
    });

    bench('cache hit', () => {
      cache.set('test-key', testConfig);
      cache.get('test-key');
    });

    bench('cache with 1000 entries', () => {
      const largeCache = new PerformanceCache<string, number>(1000);
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key-${i}`, i);
      }
      // Access pattern simulation
      for (let i = 0; i < 100; i++) {
        largeCache.get(`key-${i % 1000}`);
      }
    });
  });

  describe('Full Scan Simulation', () => {
    /**
     * Simulates a complete scan operation.
     * This is what the actual scanner will do.
     */
    async function simulateFullScan(fixturePath: string): Promise<AgentScopeConfig> {
      const timer = new Timer();
      timer.start();

      // Phase 1: File discovery
      const agentsDir = path.join(fixturePath, '.claude', 'agents');
      const skillsDir = path.join(fixturePath, '.claude', 'skills');
      const hooksDir = path.join(fixturePath, '.claude', 'hooks');
      const mcpPath = path.join(fixturePath, '.mcp.json');
      const claudeMdPath = path.join(fixturePath, 'CLAUDE.md');

      timer.lap('file-discovery');

      // Phase 2: Read files
      const fileContents: Map<string, string> = new Map();

      const readDir = async (dir: string) => {
        if (fs.existsSync(dir)) {
          const files = await fs.promises.readdir(dir);
          await Promise.all(
            files.map(async file => {
              const content = await fs.promises.readFile(
                path.join(dir, file),
                'utf-8'
              );
              fileContents.set(path.join(dir, file), content);
            })
          );
        }
      };

      await Promise.all([
        readDir(agentsDir),
        readDir(skillsDir),
        readDir(hooksDir),
      ]);

      if (fs.existsSync(mcpPath)) {
        fileContents.set(mcpPath, await fs.promises.readFile(mcpPath, 'utf-8'));
      }

      if (fs.existsSync(claudeMdPath)) {
        fileContents.set(
          claudeMdPath,
          await fs.promises.readFile(claudeMdPath, 'utf-8')
        );
      }

      timer.lap('file-read');

      // Phase 3: Parse files
      const mcpContent = fileContents.get(mcpPath);
      const mcpConfig = mcpContent ? JSON.parse(mcpContent) : { mcpServers: {} };

      timer.lap('parse');

      // Phase 4: Build config
      const config: AgentScopeConfig = {
        meta: {
          name: 'scan-result',
          version: '1.0.0',
          scanDate: new Date().toISOString(),
          projectPath: fixturePath,
          scanDurationMs: timer.getDuration(),
          componentCount: fileContents.size,
        },
        agents: [],
        skills: [],
        hooks: [],
        commands: [],
        mcpServers: [],
        settings: { projectSettings: {}, userSettings: {} },
        errors: [],
      };

      timer.lap('build-config');
      timer.stop();

      return config;
    }

    bench('full scan - minimal fixture', async () => {
      await simulateFullScan(FIXTURES.minimal);
    });

    bench('full scan - typical fixture', async () => {
      await simulateFullScan(FIXTURES.typical);
    });

    bench('full scan - large fixture', async () => {
      await simulateFullScan(FIXTURES.large);
    });

    bench('full scan - stress fixture', async () => {
      await simulateFullScan(FIXTURES.stress);
    });
  });
});

// Export for use in other benchmarks
export { FIXTURES, FIXTURE_BASE };
