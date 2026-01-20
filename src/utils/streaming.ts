/**
 * Streaming Utilities for Large Output Handling
 *
 * These utilities provide streaming capabilities for generating large
 * documentation files without consuming excessive memory.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentScopeConfig, Agent, Skill, Hook, MCPServer } from '../model/types.js';

/**
 * Options for streaming output
 */
export interface StreamOptions {
  /** Buffer size before flushing (default: 64KB) */
  bufferSize?: number;
  /** Encoding for text output (default: 'utf-8') */
  encoding?: BufferEncoding;
}

/**
 * Streaming writer that buffers content and flushes to disk
 * to minimize memory usage for large outputs.
 */
export class StreamingWriter {
  private buffer: string[] = [];
  private bufferSize = 0;
  private maxBufferSize: number;
  private writeStream: fs.WriteStream | null = null;
  private filePath: string;
  private encoding: BufferEncoding;

  constructor(filePath: string, options: StreamOptions = {}) {
    this.filePath = filePath;
    this.maxBufferSize = options.bufferSize ?? 64 * 1024; // 64KB default
    this.encoding = options.encoding ?? 'utf-8';
  }

  /**
   * Open the stream for writing
   */
  async open(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    this.writeStream = fs.createWriteStream(this.filePath, {
      encoding: this.encoding,
      flags: 'w',
    });

    return new Promise((resolve, reject) => {
      this.writeStream!.once('open', () => resolve());
      this.writeStream!.once('error', reject);
    });
  }

  /**
   * Write content to the buffer
   */
  write(content: string): void {
    this.buffer.push(content);
    this.bufferSize += content.length;

    if (this.bufferSize >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Write a line with newline
   */
  writeLine(content: string = ''): void {
    this.write(content + '\n');
  }

  /**
   * Flush the buffer to disk
   */
  flush(): void {
    if (this.buffer.length === 0 || !this.writeStream) return;

    const content = this.buffer.join('');
    this.writeStream.write(content);
    this.buffer = [];
    this.bufferSize = 0;
  }

  /**
   * Close the stream
   */
  async close(): Promise<void> {
    this.flush();

    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.end(() => {
          this.writeStream = null;
          resolve();
        });
        this.writeStream!.once('error', reject);
      });
    }
  }
}

/**
 * Streaming Mermaid diagram generator
 * Generates diagrams incrementally to handle large configurations
 */
export class StreamingDiagramGenerator {
  private writer: StreamingWriter;

  constructor(outputPath: string, options: StreamOptions = {}) {
    this.writer = new StreamingWriter(outputPath, options);
  }

  /**
   * Generate a component map diagram with streaming
   */
  async generateComponentMap(config: AgentScopeConfig): Promise<void> {
    await this.writer.open();

    this.writer.writeLine('```mermaid');
    this.writer.writeLine('flowchart TB');

    // Stream agents subgraph
    if (config.agents.length > 0) {
      this.writer.writeLine('    subgraph Agents');
      for (const agent of config.agents) {
        this.writer.writeLine(`        ${this.sanitizeId(agent.id)}["${this.escapeLabel(agent.name)}"]`);
      }
      this.writer.writeLine('    end');
    }

    // Stream skills subgraph
    if (config.skills.length > 0) {
      this.writer.writeLine('    subgraph Skills');
      for (const skill of config.skills) {
        this.writer.writeLine(`        ${this.sanitizeId(skill.id)}["${this.escapeLabel(skill.name)}"]`);
      }
      this.writer.writeLine('    end');
    }

    // Stream hooks subgraph
    if (config.hooks.length > 0) {
      this.writer.writeLine('    subgraph Hooks');
      for (const hook of config.hooks) {
        this.writer.writeLine(`        ${this.sanitizeId(hook.id)}["${this.escapeLabel(hook.name)}"]`);
      }
      this.writer.writeLine('    end');
    }

    // Stream MCP servers subgraph
    if (config.mcpServers.length > 0) {
      this.writer.writeLine('    subgraph MCPs');
      for (const mcp of config.mcpServers) {
        this.writer.writeLine(`        ${this.sanitizeId(mcp.id)}["${this.escapeLabel(mcp.name)}"]`);
      }
      this.writer.writeLine('    end');
    }

    // Stream relationships
    for (const agent of config.agents) {
      for (const skillId of agent.skills) {
        this.writer.writeLine(`    ${this.sanitizeId(agent.id)} --> ${this.sanitizeId(skillId)}`);
      }
    }

    this.writer.writeLine('```');

    await this.writer.close();
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private escapeLabel(label: string): string {
    return label.replace(/"/g, "'").replace(/\n/g, ' ');
  }
}

/**
 * Streaming documentation generator
 * Generates README.md and AGENTS.md with streaming for large configs
 */
export class StreamingDocsGenerator {
  /**
   * Generate README.md with streaming
   */
  async generateReadme(
    config: AgentScopeConfig,
    outputPath: string,
    options: StreamOptions = {}
  ): Promise<void> {
    const writer = new StreamingWriter(outputPath, options);
    await writer.open();

    // Header
    writer.writeLine('# Agent Architecture Overview');
    writer.writeLine();
    writer.writeLine(`Generated: ${config.meta.scanDate}`);
    writer.writeLine();

    // Statistics
    writer.writeLine('## Summary');
    writer.writeLine();
    writer.writeLine(`- **Agents**: ${config.agents.length}`);
    writer.writeLine(`- **Skills**: ${config.skills.length}`);
    writer.writeLine(`- **Hooks**: ${config.hooks.length}`);
    writer.writeLine(`- **MCP Servers**: ${config.mcpServers.length}`);
    writer.writeLine();

    // Note about diagrams
    writer.writeLine('## Diagrams');
    writer.writeLine();
    writer.writeLine('See the embedded Mermaid diagrams below for visual representation.');
    writer.writeLine();

    // Quick Reference Table
    writer.writeLine('## Quick Reference');
    writer.writeLine();
    writer.writeLine('| Component | Type | Description |');
    writer.writeLine('|-----------|------|-------------|');

    // Stream agents (limited for README)
    const displayAgents = config.agents.slice(0, 20);
    for (const agent of displayAgents) {
      const desc = agent.description.slice(0, 50).replace(/\|/g, '\\|');
      writer.writeLine(`| ${agent.name} | Agent | ${desc}... |`);
    }

    if (config.agents.length > 20) {
      writer.writeLine(`| ... | ... | ${config.agents.length - 20} more agents |`);
    }

    writer.writeLine();
    writer.writeLine('See [AGENTS.md](AGENTS.md) for detailed documentation.');

    await writer.close();
  }

  /**
   * Generate AGENTS.md with streaming
   */
  async generateAgentsDocs(
    config: AgentScopeConfig,
    outputPath: string,
    options: StreamOptions = {}
  ): Promise<void> {
    const writer = new StreamingWriter(outputPath, options);
    await writer.open();

    // Header
    writer.writeLine('# Agent Documentation');
    writer.writeLine();
    writer.writeLine(`Generated: ${config.meta.scanDate}`);
    writer.writeLine();

    // Table of Contents
    writer.writeLine('## Table of Contents');
    writer.writeLine();
    for (const agent of config.agents) {
      writer.writeLine(`- [${agent.name}](#${this.sanitizeAnchor(agent.name)})`);
    }
    writer.writeLine();

    // Agent Details - streamed one at a time
    for (const agent of config.agents) {
      await this.writeAgentSection(writer, agent, config);
    }

    await writer.close();
  }

  private async writeAgentSection(
    writer: StreamingWriter,
    agent: Agent,
    config: AgentScopeConfig
  ): Promise<void> {
    writer.writeLine(`## ${agent.name}`);
    writer.writeLine();
    writer.writeLine(`**ID**: \`${agent.id}\``);
    writer.writeLine();
    writer.writeLine(`**Source**: ${agent.source} (\`${agent.sourcePath}\`)`);
    writer.writeLine();
    writer.writeLine(`**Description**: ${agent.description}`);
    writer.writeLine();

    if (agent.skills.length > 0) {
      writer.writeLine('### Skills');
      writer.writeLine();
      for (const skillId of agent.skills) {
        const skill = config.skills.find(s => s.id === skillId);
        if (skill) {
          writer.writeLine(`- **${skill.name}**: ${skill.description.slice(0, 100)}...`);
        } else {
          writer.writeLine(`- \`${skillId}\` (not found)`);
        }
      }
      writer.writeLine();
    }

    if (agent.allowedTools.length > 0) {
      writer.writeLine('### Allowed Tools');
      writer.writeLine();
      writer.writeLine('```');
      writer.writeLine(agent.allowedTools.join(', '));
      writer.writeLine('```');
      writer.writeLine();
    }

    writer.writeLine('### Configuration');
    writer.writeLine();
    writer.writeLine('```yaml');
    writer.writeLine(agent.configSnippet);
    writer.writeLine('```');
    writer.writeLine();
    writer.writeLine('---');
    writer.writeLine();
  }

  private sanitizeAnchor(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}

/**
 * Generator that produces output in chunks
 * Useful for piping to other processes or network streams
 */
export async function* generateComponentMapChunks(
  config: AgentScopeConfig,
  chunkSize: number = 1024
): AsyncGenerator<string> {
  let buffer = '';

  const emit = (content: string): string | null => {
    buffer += content;
    if (buffer.length >= chunkSize) {
      const chunk = buffer;
      buffer = '';
      return chunk;
    }
    return null;
  };

  const chunk = emit('flowchart TB\n');
  if (chunk) yield chunk;

  // Agents
  if (config.agents.length > 0) {
    const c1 = emit('    subgraph Agents\n');
    if (c1) yield c1;

    for (const agent of config.agents) {
      const id = agent.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const name = agent.name.replace(/"/g, "'");
      const line = `        ${id}["${name}"]\n`;
      const c = emit(line);
      if (c) yield c;
    }

    const c2 = emit('    end\n');
    if (c2) yield c2;
  }

  // Skills
  if (config.skills.length > 0) {
    const c1 = emit('    subgraph Skills\n');
    if (c1) yield c1;

    for (const skill of config.skills) {
      const id = skill.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const name = skill.name.replace(/"/g, "'");
      const line = `        ${id}["${name}"]\n`;
      const c = emit(line);
      if (c) yield c;
    }

    const c2 = emit('    end\n');
    if (c2) yield c2;
  }

  // Relationships
  for (const agent of config.agents) {
    const agentId = agent.id.replace(/[^a-zA-Z0-9_]/g, '_');
    for (const skillId of agent.skills) {
      const cleanSkillId = skillId.replace(/[^a-zA-Z0-9_]/g, '_');
      const line = `    ${agentId} --> ${cleanSkillId}\n`;
      const c = emit(line);
      if (c) yield c;
    }
  }

  // Emit remaining buffer
  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Process configuration in batches to limit memory usage
 */
export async function processBatched<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Lazy iterator for processing large arrays without loading all into memory
 */
export function* lazyMap<T, R>(
  items: Iterable<T>,
  transform: (item: T) => R
): Generator<R> {
  for (const item of items) {
    yield transform(item);
  }
}
