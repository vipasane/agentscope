# ADR-104: Multi-Platform Support Architecture

## Status
**Accepted** - 2026-01-26

## Context

AgentScope Core must support multiple AI coding platforms:

1. **Claude Code** - Primary target (`.claude/` directory structure)
2. **Cursor** - Popular VS Code fork (`.cursor/` directory structure)
3. **Gemini CLI** - Google's AI CLI (different config format)

Each platform has different:
- **Directory structures** (`.claude/` vs `.cursor/` vs custom)
- **Configuration formats** (JSON, YAML, Markdown)
- **Entity types** (agents, skills, hooks, MCPs)
- **Naming conventions** (camelCase vs kebab-case)

### Platform Comparison

| Feature | Claude Code | Cursor | Gemini CLI |
|---------|-------------|--------|------------|
| **Config Dir** | `.claude/` | `.cursor/` | `.gemini/` |
| **Agent Format** | `.md` or `.yaml` | `.yaml` | `.json` |
| **Settings** | `settings.json` | `config.json` | `gemini.config.js` |
| **MCP** | `.mcp.json` | `.mcp.json` | Different format |
| **Hooks** | 9 types | Limited | Different |
| **Skills** | YAML frontmatter | YAML | JSON |

### Goals

1. **Unified API**: Single scanning interface regardless of platform
2. **Auto-Detection**: Automatically detect platform from directory structure
3. **Extensibility**: Easy to add new platforms in future
4. **Format Conversion**: Optional cross-platform conversion

## Decision

We implement a **platform abstraction layer** with adapter pattern:

```
┌─────────────────────────────────────────────────────┐
│              Unified Scanner Interface              │
│  (ScanResult: Agent[], Skill[], Hook[], MCP[])      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│             Platform Detector                       │
│  (Auto-detect platform from directory)              │
└───┬────────────┬────────────┬──────────────────────┘
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Claude │  │ Cursor │  │ Gemini │
│  Code  │  │ Adapter│  │ Adapter│
│ Adapter│  │        │  │        │
└────────┘  └────────┘  └────────┘
    │            │            │
    ▼            ▼            ▼
┌──────────────────────────────────┐
│      Unified Domain Model        │
│  (Agent, Skill, Hook, MCP)       │
└──────────────────────────────────┘
```

## Architecture Components

### 1. Platform Abstraction

```typescript
// src/scanner/PlatformScanner.ts

export interface PlatformScanner {
  // Metadata
  platform: Platform;
  version: string;

  // Detection
  canHandle(path: string): Promise<boolean>;

  // Scanning
  scanAgents(path: string): Promise<Agent[]>;
  scanSkills(path: string): Promise<Skill[]>;
  scanHooks(path: string): Promise<Hook[]>;
  scanMcpServers(path: string): Promise<McpServer[]>;
  scanSettings(path: string): Promise<Settings>;

  // Full scan
  scan(path: string): Promise<ScanResult>;
}

export interface ScanResult {
  platform: Platform;
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  mcpServers: McpServer[];
  settings: Settings;
  claudeMd?: string; // CLAUDE.md content if present
}

export enum Platform {
  ClaudeCode = 'claude-code',
  Cursor = 'cursor',
  GeminiCli = 'gemini-cli',
  Unknown = 'unknown'
}
```

### 2. Platform Detection

```typescript
// src/scanner/PlatformDetector.ts

export class PlatformDetector {
  private scanners: PlatformScanner[] = [
    new ClaudeCodeScanner(),
    new CursorScanner(),
    new GeminiScanner()
  ];

  async detect(path: string): Promise<PlatformScanner> {
    for (const scanner of this.scanners) {
      if (await scanner.canHandle(path)) {
        return scanner;
      }
    }
    throw new Error(`No platform detected at: ${path}`);
  }

  async detectPlatform(path: string): Promise<Platform> {
    const scanner = await this.detect(path);
    return scanner.platform;
  }

  async getSupportedPlatforms(): Promise<Platform[]> {
    return this.scanners.map(s => s.platform);
  }
}
```

### 3. Claude Code Adapter

```typescript
// src/scanner/ClaudeCodeScanner.ts

export class ClaudeCodeScanner implements PlatformScanner {
  platform = Platform.ClaudeCode;
  version = '1.0.0';

  async canHandle(path: string): Promise<boolean> {
    // Check for .claude/ directory
    const claudeDir = join(path, '.claude');
    try {
      const stats = await stat(claudeDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async scanAgents(path: string): Promise<Agent[]> {
    const agentsDir = join(path, '.claude', 'agents');
    const agents: Agent[] = [];

    try {
      const files = await readdir(agentsDir);
      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.yaml')) {
          const agent = await this.parseAgentFile(join(agentsDir, file));
          agents.push(agent);
        }
      }
    } catch (error) {
      // No agents directory or empty
    }

    return agents;
  }

  private async parseAgentFile(filePath: string): Promise<Agent> {
    const content = await readFile(filePath, 'utf-8');

    if (filePath.endsWith('.yaml')) {
      return this.parseYamlAgent(content, filePath);
    } else {
      return this.parseMarkdownAgent(content, filePath);
    }
  }

  private parseYamlAgent(content: string, filePath: string): Agent {
    // Parse YAML frontmatter
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (!match) {
      throw new Error(`No frontmatter in: ${filePath}`);
    }

    const yaml = match[1];
    const config = this.parseYaml(yaml);

    return {
      id: this.generateId(filePath),
      name: config.name || basename(filePath, extname(filePath)),
      type: config.type || AgentType.Custom,
      description: config.description,
      tools: config.tools || [],
      capabilities: config.capabilities || [],
      delegatesTo: config.delegatesTo || [],
      skills: config.skills || [],
      source: {
        path: filePath,
        platform: Platform.ClaudeCode,
        lastModified: (await stat(filePath)).mtime.getTime()
      }
    };
  }

  private parseMarkdownAgent(content: string, filePath: string): Agent {
    // Similar to YAML but parse Markdown
    // Extract frontmatter if present, otherwise use heuristics
    return this.parseYamlAgent(content, filePath);
  }

  async scanSkills(path: string): Promise<Skill[]> {
    const skillsDir = join(path, '.claude', 'skills');
    const skills: Skill[] = [];

    try {
      const files = await readdir(skillsDir);
      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.yaml')) {
          const skill = await this.parseSkillFile(join(skillsDir, file));
          skills.push(skill);
        }
      }
    } catch (error) {
      // No skills directory
    }

    return skills;
  }

  private async parseSkillFile(filePath: string): Promise<Skill> {
    const content = await readFile(filePath, 'utf-8');
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (!match) {
      throw new Error(`No frontmatter in: ${filePath}`);
    }

    const config = this.parseYaml(match[1]);

    return {
      id: this.generateId(filePath),
      name: config.name || basename(filePath, extname(filePath)),
      parameters: config.parameters || {},
      description: config.description,
      source: {
        path: filePath,
        platform: Platform.ClaudeCode,
        lastModified: (await stat(filePath)).mtime.getTime()
      }
    };
  }

  async scanHooks(path: string): Promise<Hook[]> {
    // Claude Code hooks are in CLAUDE.md or settings.json
    const hooks: Hook[] = [];

    // Check settings.json
    const settingsPath = join(path, '.claude', 'settings.json');
    try {
      const settings = JSON.parse(await readFile(settingsPath, 'utf-8'));
      if (settings.hooks) {
        for (const [type, handler] of Object.entries(settings.hooks)) {
          hooks.push({
            id: this.generateId(`${settingsPath}:${type}`),
            type: type as HookType,
            handler: handler as string,
            source: {
              path: settingsPath,
              platform: Platform.ClaudeCode,
              lastModified: (await stat(settingsPath)).mtime.getTime()
            }
          });
        }
      }
    } catch {
      // No hooks
    }

    return hooks;
  }

  async scanMcpServers(path: string): Promise<McpServer[]> {
    const mcpPath = join(path, '.mcp.json');
    const mcpServers: McpServer[] = [];

    try {
      const content = JSON.parse(await readFile(mcpPath, 'utf-8'));
      for (const [name, config] of Object.entries(content.mcpServers || {})) {
        mcpServers.push({
          id: this.generateId(`${mcpPath}:${name}`),
          name,
          url: (config as McpServerConfig).url,
          capabilities: (config as McpServerConfig).capabilities || [],
          transport: (config as McpServerConfig).transport || 'stdio',
          source: {
            path: mcpPath,
            platform: Platform.ClaudeCode,
            lastModified: (await stat(mcpPath)).mtime.getTime()
          }
        });
      }
    } catch {
      // No MCP config
    }

    return mcpServers;
  }

  async scanSettings(path: string): Promise<Settings> {
    const settingsPath = join(path, '.claude', 'settings.json');
    try {
      const content = await readFile(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async scan(path: string): Promise<ScanResult> {
    const [agents, skills, hooks, mcpServers, settings] = await Promise.all([
      this.scanAgents(path),
      this.scanSkills(path),
      this.scanHooks(path),
      this.scanMcpServers(path),
      this.scanSettings(path)
    ]);

    // Try to load CLAUDE.md
    let claudeMd: string | undefined;
    try {
      claudeMd = await readFile(join(path, 'CLAUDE.md'), 'utf-8');
    } catch {
      try {
        claudeMd = await readFile(join(path, '.claude', 'CLAUDE.md'), 'utf-8');
      } catch {
        // No CLAUDE.md
      }
    }

    return {
      platform: Platform.ClaudeCode,
      agents,
      skills,
      hooks,
      mcpServers,
      settings,
      claudeMd
    };
  }

  private parseYaml(yaml: string): Record<string, unknown> {
    // Minimal YAML parser (only key: value pairs)
    const lines = yaml.split('\n');
    const result: Record<string, unknown> = {};

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        result[key] = this.parseValue(value);
      }
    }

    return result;
  }

  private parseValue(value: string): unknown {
    // Parse YAML values
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.match(/^\d+$/)) return parseInt(value, 10);
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(v => v.trim());
    }
    return value;
  }

  private generateId(path: string): string {
    return createHash('sha256').update(path).digest('hex').slice(0, 16);
  }
}

interface McpServerConfig {
  url: string;
  capabilities?: string[];
  transport?: 'stdio' | 'http';
}
```

### 4. Cursor Adapter

```typescript
// src/scanner/CursorScanner.ts

export class CursorScanner implements PlatformScanner {
  platform = Platform.Cursor;
  version = '1.0.0';

  async canHandle(path: string): Promise<boolean> {
    // Check for .cursor/ directory
    const cursorDir = join(path, '.cursor');
    try {
      const stats = await stat(cursorDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async scanAgents(path: string): Promise<Agent[]> {
    // Cursor uses similar structure to Claude Code
    // but with .cursor/ directory
    const agentsDir = join(path, '.cursor', 'agents');
    const agents: Agent[] = [];

    try {
      const files = await readdir(agentsDir);
      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const agent = await this.parseAgentFile(join(agentsDir, file));
          agents.push(agent);
        }
      }
    } catch (error) {
      // No agents directory
    }

    return agents;
  }

  private async parseAgentFile(filePath: string): Promise<Agent> {
    const content = await readFile(filePath, 'utf-8');
    const config = this.parseYaml(content);

    return {
      id: this.generateId(filePath),
      name: config.name as string,
      type: (config.type as AgentType) || AgentType.Custom,
      description: config.description as string,
      tools: (config.tools as string[]) || [],
      capabilities: (config.capabilities as string[]) || [],
      delegatesTo: (config.delegatesTo as string[]) || [],
      skills: (config.skills as string[]) || [],
      source: {
        path: filePath,
        platform: Platform.Cursor,
        lastModified: (await stat(filePath)).mtime.getTime()
      }
    };
  }

  // Similar implementations for scanSkills, scanHooks, scanMcpServers, scanSettings
  // (adapted for Cursor's structure)

  async scan(path: string): Promise<ScanResult> {
    // Similar to ClaudeCodeScanner but for .cursor/ directory
    const [agents, skills, hooks, mcpServers, settings] = await Promise.all([
      this.scanAgents(path),
      this.scanSkills(path),
      this.scanHooks(path),
      this.scanMcpServers(path),
      this.scanSettings(path)
    ]);

    return {
      platform: Platform.Cursor,
      agents,
      skills,
      hooks,
      mcpServers,
      settings
    };
  }

  private parseYaml(yaml: string): Record<string, unknown> {
    // Reuse from ClaudeCodeScanner or extract to utility
    return {};
  }

  private generateId(path: string): string {
    return createHash('sha256').update(path).digest('hex').slice(0, 16);
  }

  // Stub implementations - would be similar to ClaudeCodeScanner
  async scanSkills(path: string): Promise<Skill[]> { return []; }
  async scanHooks(path: string): Promise<Hook[]> { return []; }
  async scanMcpServers(path: string): Promise<McpServer[]> { return []; }
  async scanSettings(path: string): Promise<Settings> { return {}; }
}
```

### 5. Gemini Adapter

```typescript
// src/scanner/GeminiScanner.ts

export class GeminiScanner implements PlatformScanner {
  platform = Platform.GeminiCli;
  version = '1.0.0';

  async canHandle(path: string): Promise<boolean> {
    // Check for .gemini/ directory or gemini.config.js
    const geminiDir = join(path, '.gemini');
    const geminiConfig = join(path, 'gemini.config.js');
    try {
      const stats = await stat(geminiDir);
      return stats.isDirectory();
    } catch {
      try {
        await stat(geminiConfig);
        return true;
      } catch {
        return false;
      }
    }
  }

  async scanAgents(path: string): Promise<Agent[]> {
    // Gemini uses JSON format
    const agentsDir = join(path, '.gemini', 'agents');
    const agents: Agent[] = [];

    try {
      const files = await readdir(agentsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const agent = await this.parseAgentFile(join(agentsDir, file));
          agents.push(agent);
        }
      }
    } catch (error) {
      // No agents directory
    }

    return agents;
  }

  private async parseAgentFile(filePath: string): Promise<Agent> {
    const content = await readFile(filePath, 'utf-8');
    const config = JSON.parse(content);

    return {
      id: this.generateId(filePath),
      name: config.name,
      type: config.type || AgentType.Custom,
      description: config.description,
      tools: config.tools || [],
      capabilities: config.capabilities || [],
      delegatesTo: config.delegatesTo || [],
      skills: config.skills || [],
      source: {
        path: filePath,
        platform: Platform.GeminiCli,
        lastModified: (await stat(filePath)).mtime.getTime()
      }
    };
  }

  async scan(path: string): Promise<ScanResult> {
    const [agents, skills, hooks, mcpServers, settings] = await Promise.all([
      this.scanAgents(path),
      this.scanSkills(path),
      this.scanHooks(path),
      this.scanMcpServers(path),
      this.scanSettings(path)
    ]);

    return {
      platform: Platform.GeminiCli,
      agents,
      skills,
      hooks,
      mcpServers,
      settings
    };
  }

  private generateId(path: string): string {
    return createHash('sha256').update(path).digest('hex').slice(0, 16);
  }

  // Stub implementations
  async scanSkills(path: string): Promise<Skill[]> { return []; }
  async scanHooks(path: string): Promise<Hook[]> { return []; }
  async scanMcpServers(path: string): Promise<McpServer[]> { return []; }
  async scanSettings(path: string): Promise<Settings> { return {}; }
}
```

## Platform Conversion (Optional)

```typescript
// src/converter/PlatformConverter.ts

export class PlatformConverter {
  static async convert(
    result: ScanResult,
    targetPlatform: Platform,
    outputPath: string
  ): Promise<void> {
    switch (targetPlatform) {
      case Platform.ClaudeCode:
        await this.convertToClaudeCode(result, outputPath);
        break;
      case Platform.Cursor:
        await this.convertToCursor(result, outputPath);
        break;
      case Platform.GeminiCli:
        await this.convertToGemini(result, outputPath);
        break;
      default:
        throw new Error(`Unsupported target platform: ${targetPlatform}`);
    }
  }

  private static async convertToClaudeCode(
    result: ScanResult,
    outputPath: string
  ): Promise<void> {
    const claudeDir = join(outputPath, '.claude');
    await mkdir(claudeDir, { recursive: true });

    // Convert agents
    const agentsDir = join(claudeDir, 'agents');
    await mkdir(agentsDir, { recursive: true });
    for (const agent of result.agents) {
      const content = this.agentToYaml(agent);
      await writeFile(join(agentsDir, `${agent.name}.yaml`), content);
    }

    // Convert skills, hooks, MCP servers similarly
  }

  private static agentToYaml(agent: Agent): string {
    return `---
name: ${agent.name}
type: ${agent.type}
description: ${agent.description || ''}
tools: ${JSON.stringify(agent.tools)}
capabilities: ${JSON.stringify(agent.capabilities)}
delegatesTo: ${JSON.stringify(agent.delegatesTo)}
skills: ${JSON.stringify(agent.skills)}
---`;
  }

  // Similar methods for convertToCursor, convertToGemini
}
```

## Consequences

### Positive
- **Unified API**: Single interface for all platforms
- **Auto-Detection**: No manual platform specification needed
- **Extensibility**: Easy to add new platforms (implement PlatformScanner)
- **Conversion**: Optional cross-platform migration
- **Testability**: Each adapter can be tested independently

### Negative
- **Complexity**: Multiple adapters to maintain
- **Edge Cases**: Platform-specific features may not map perfectly
- **Conversion Loss**: Some platform-specific features may be lost in conversion

### Neutral
- **Performance**: Auto-detection adds ~10ms overhead (acceptable)

## Related Decisions
- ADR-101: Core Architecture
- ADR-102: Zero Dependency Strategy
- DDD-101: Core Domain Model

## References
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [Cursor Documentation](https://cursor.sh/docs)

---

**Approved by**: ADR Architect Agent
**Implementation**: Week 1 of v1.2
**Review Date**: 2026-02-15
