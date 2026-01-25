/**
 * Parser for .claude/ directory and CLAUDE.md files
 * Extracts agent configurations, skills, hooks, and commands
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, basename, extname } from 'node:path';
import type {
  Agent,
  Skill,
  Hook,
  Command,
  HookEvent,
  ScanError,
} from '../model/types.js';

// ============================================================================
// Types
// ============================================================================

export interface ClaudeCodeParseResult {
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  commands: Command[];
  errors: ScanError[];
}

interface HeadingContext {
  type: Agent['type'];
  level: number;
  startLine: number;
  endLine?: number;
}

interface BulletAgent {
  name: string;
  description: string;
  lineNumber: number;
  indentLevel: number;
}

interface SettingsJson {
  hooks?: HookConfig[] | Record<string, HookEventConfig[]>;
  permissions?: PermissionsConfig;
  mcpServers?: Record<string, unknown>;
}

// Old format: array of configs with matcher
interface HookConfig {
  matcher: string;
  hooks: HookDefinition[];
}

// New format: event-keyed object with array of hook configs
interface HookEventConfig {
  matcher?: string;
  hooks: HookDefinition[];
}

interface HookDefinition {
  type: string;
  command?: string;
  workingDirectory?: string;
  timeout?: number;
  continueOnError?: boolean;
}

interface PermissionsConfig {
  allow?: string[];
  deny?: string[];
}

interface CommandConfig {
  description?: string;
  allowed_tools?: string[];
  disallowed_tools?: string[];
}

// ============================================================================
// Main Parser Class
// ============================================================================

export class ClaudeCodeParser {
  private errors: ScanError[] = [];

  constructor(private rootPath: string) {}

  /**
   * Parse the .claude/ directory and CLAUDE.md file
   */
  async parse(): Promise<ClaudeCodeParseResult> {
    this.errors = [];

    const [agents, skills, hooks, commands] = await Promise.all([
      this.parseAgents(),
      this.parseSkills(),
      this.parseHooks(),
      this.parseCommands(),
    ]);

    return {
      agents,
      skills,
      hooks,
      commands,
      errors: this.errors,
    };
  }

  /**
   * Parse agent definitions from various sources
   */
  private async parseAgents(): Promise<Agent[]> {
    const agents: Agent[] = [];

    // Check for agents in .claude/agents/ directory
    const agentsDir = join(this.rootPath, '.claude', 'agents');
    if (await this.directoryExists(agentsDir)) {
      const agentFiles = await this.findFiles(agentsDir, ['.md', '.yaml', '.yml']);
      for (const file of agentFiles) {
        const agent = await this.parseAgentFile(file);
        if (agent) {
          agents.push(agent);
        }
      }
    }

    // Check CLAUDE.md for inline agent definitions
    const claudeMd = join(this.rootPath, 'CLAUDE.md');
    if (await this.fileExists(claudeMd)) {
      const inlineAgents = await this.parseAgentsFromClaudeMd(claudeMd);
      agents.push(...inlineAgents);
    }

    return agents;
  }

  /**
   * Parse a single agent definition file
   */
  private async parseAgentFile(filePath: string): Promise<Agent | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const name = basename(filePath, extname(filePath));

      // Parse YAML frontmatter if present
      const frontmatter = this.parseFrontmatter(content);

      const agentName = typeof frontmatter.name === 'string' ? frontmatter.name : name;

      // Use explicit type if provided, otherwise infer from name
      const agentType = this.isValidAgentType(frontmatter.type)
        ? frontmatter.type
        : this.inferAgentType(agentName);

      // Extract category from frontmatter (Task 2.1: Category Extraction)
      const category = typeof frontmatter.category === 'string' && frontmatter.category.trim().length > 0
        ? frontmatter.category.trim()
        : undefined;

      return {
        name: agentName,
        path: relative(this.rootPath, filePath),
        description: typeof frontmatter.description === 'string' ? frontmatter.description : this.extractDescription(content),
        tools: Array.isArray(frontmatter.tools) ? frontmatter.tools as string[] : [],
        delegatesTo: Array.isArray(frontmatter.delegatesTo) ? frontmatter.delegatesTo as string[] : [],
        type: agentType,
        category,
        metadata: typeof frontmatter.metadata === 'object' ? frontmatter.metadata as Record<string, unknown> : undefined,
      };
    } catch (error) {
      this.addError('warning', 'AGENT_PARSE_ERROR', `Failed to parse agent file: ${filePath}`, filePath);
      return null;
    }
  }

  /**
   * Check if a value is a valid agent type
   */
  private isValidAgentType(value: unknown): value is Agent['type'] {
    return typeof value === 'string' && value.length > 0;
  }

  /**
   * Parse agents defined inline in CLAUDE.md
   */
  private async parseAgentsFromClaudeMd(filePath: string): Promise<Agent[]> {
    const agents: Agent[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');

      // Step 1: Parse heading contexts to understand agent type sections
      const headingContexts = this.parseHeadingContexts(content);

      // Step 2: Extract global delegation relationships
      const delegatesTo = this.extractDelegatesTo(content);

      // Step 3: Extract global tool associations
      const tools = this.extractTools(content);

      // Step 4: Parse bullet list agents with context awareness
      const bulletAgents = this.parseBulletAgents(content);
      for (const bulletAgent of bulletAgents) {
        // Find the heading context for this agent
        const context = headingContexts.find(
          ctx => bulletAgent.lineNumber >= ctx.startLine &&
                 (!ctx.endLine || bulletAgent.lineNumber <= ctx.endLine)
        );

        agents.push({
          name: bulletAgent.name,
          path: relative(this.rootPath, filePath),
          description: bulletAgent.description,
          type: context?.type || this.inferAgentType(bulletAgent.name),
          delegatesTo: delegatesTo[bulletAgent.name] || [],
          tools: tools[bulletAgent.name] || [],
        });
      }

      // Step 5: Parse agent tables as fallback
      const tableAgents = this.parseAgentTable(content);
      for (const tableAgent of tableAgents) {
        // Skip if already parsed from bullet list or if missing required fields
        if (!tableAgent.name || agents.some(a => a.name === tableAgent.name)) {
          continue;
        }
        agents.push({
          name: tableAgent.name,
          path: relative(this.rootPath, filePath),
          description: tableAgent.description,
          type: tableAgent.type || 'worker',
          delegatesTo: tableAgent.delegatesTo || [],
          tools: tableAgent.tools || [],
        });
      }
    } catch (error) {
      this.addError('warning', 'CLAUDE_MD_PARSE_ERROR', `Failed to parse CLAUDE.md: ${filePath}`, filePath);
    }

    return agents;
  }

  /**
   * Extract agent type from markdown headings
   * Regex: /^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/gim
   */
  private parseHeadingContexts(content: string): HeadingContext[] {
    const contexts: HeadingContext[] = [];
    const lines = content.split('\n');
    const headingRegex = /^(#{2,4})\s+(Coordinators?|Orchestrators?|Workers?|Specialists?|Experts?|Reviewers?|Custom)\s*$/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(headingRegex);
      if (match) {
        const level = match[1].length;
        const typeText = match[2].toLowerCase();

        // Map heading text to agent type
        let type: Agent['type'] = 'worker';
        if (typeText.startsWith('coordinator') || typeText.startsWith('orchestrator')) {
          type = 'coordinator';
        } else if (typeText.startsWith('reviewer')) {
          type = 'reviewer';
        } else if (typeText.startsWith('specialist') || typeText.startsWith('expert')) {
          type = 'specialist';
        } else if (typeText.startsWith('worker')) {
          type = 'worker';
        } else if (typeText.startsWith('custom')) {
          type = 'custom';
        }

        contexts.push({
          type,
          level,
          startLine: i + 1,
        });
      }
    }

    // Set endLine for each context (up to the next heading of same or higher level)
    for (let i = 0; i < contexts.length; i++) {
      const current = contexts[i];
      const next = contexts.find((ctx, idx) => idx > i && ctx.level <= current.level);
      if (next) {
        current.endLine = next.startLine - 1;
      }
    }

    return contexts;
  }

  /**
   * Extract delegation relationships from content
   * Regex: /(?:(?:\*\*)?Delegates?\s*(?:to)?(?:\*\*)?:\s*)([`\w,\s-]+)/gi
   */
  private extractDelegatesTo(content: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const lines = content.split('\n');

    let currentAgent: string | null = null;

    for (const line of lines) {
      // Track current agent from bullet list (no indent or minimal indent)
      const agentMatch = line.match(/^[\s]{0,2}[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)/i);
      if (agentMatch) {
        currentAgent = agentMatch[1] || agentMatch[2];
      }

      // Extract delegation info from nested bullets or inline
      if (currentAgent && /Delegates?\s*(?:to)?:/i.test(line)) {
        const delegateMatch = line.match(/Delegates?\s*(?:to)?:\s*([`\w,\s-]+)/i);
        if (delegateMatch && delegateMatch[1]) {
          const delegates = delegateMatch[1]
            .split(',')
            .map(d => d.trim().replace(/`/g, ''))
            .filter(d => d.length > 0);

          result[currentAgent] = delegates;
        }
      }
    }

    return result;
  }

  /**
   * Extract tool associations from content
   * Regex: /(?:(?:\*\*)?(Tools?|Uses|Available\s+tools?)(?:\*\*)?:\s*)([^-\n]+)/gi
   */
  private extractTools(content: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const lines = content.split('\n');

    let currentAgent: string | null = null;

    for (const line of lines) {
      // Track current agent from bullet list (no indent or minimal indent)
      const agentMatch = line.match(/^[\s]{0,2}[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)/i);
      if (agentMatch) {
        currentAgent = agentMatch[1] || agentMatch[2];
      }

      // Extract tool info from nested bullets or inline
      if (currentAgent && /Tools?:/i.test(line)) {
        const toolMatch = line.match(/Tools?:\s*(.+)/i);
        if (toolMatch && toolMatch[1]) {
          const tools = toolMatch[1]
            .split(',')
            .map(t => t.trim().replace(/`/g, ''))
            .filter(t => t.length > 0);

          result[currentAgent] = tools;
        }
      }
    }

    return result;
  }

  /**
   * Extract agents from bullet lists
   * Regex: /^[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)\s*[:\-]\s*(.+)$/gim
   */
  private parseBulletAgents(content: string): BulletAgent[] {
    const agents: BulletAgent[] = [];
    const lines = content.split('\n');
    const bulletRegex = /^([\s]*)[-*]\s+(?:`([a-z][\w-]*)`|\*\*([a-z][\w-]*)\*\*)\s*[:\-]\s*(.+)$/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(bulletRegex);
      if (match) {
        const indent = match[1];
        const name = match[2] || match[3];
        const description = match[4].trim();

        // Calculate indent level (2 spaces = 1 level)
        const indentLevel = Math.floor(indent.length / 2);

        agents.push({
          name,
          description,
          lineNumber: i + 1,
          indentLevel,
        });
      }
    }

    return agents;
  }

  /**
   * Parse multi-column agent tables
   * Detects columns: agent/name, type, description, tools, delegates
   */
  private parseAgentTable(content: string): Partial<Agent>[] {
    const agents: Partial<Agent>[] = [];
    const lines = content.split('\n');

    // Find table headers
    let headerLine = -1;
    let separatorLine = -1;
    const columnMap: Record<string, number> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for header row
      if (line.startsWith('|') && line.endsWith('|')) {
        const columns = line.split('|').map(c => c.trim().toLowerCase()).filter(c => c);

        // Check if this looks like a header row
        if (columns.some(c => c.includes('agent') || c.includes('name') || c.includes('type'))) {
          headerLine = i;

          // Map column names to indices
          columns.forEach((col, idx) => {
            if (col.includes('agent') || col.includes('name')) {
              columnMap.name = idx;
            } else if (col === 'type' || col.includes('subagent')) {
              columnMap.type = idx;
            } else if (col.includes('description')) {
              columnMap.description = idx;
            } else if (col.includes('tool')) {
              columnMap.tools = idx;
            } else if (col.includes('delegate')) {
              columnMap.delegates = idx;
            }
          });

          // Check for separator line
          if (i + 1 < lines.length && lines[i + 1].match(/^\|[\s:-]+\|/)) {
            separatorLine = i + 1;
            break;
          }
        }
      }
    }

    // Parse table rows
    if (headerLine >= 0 && separatorLine >= 0) {
      for (let i = separatorLine + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Stop at end of table
        if (!line.startsWith('|') || !line.endsWith('|')) {
          break;
        }

        const cells = line.split('|').map(c => c.trim()).filter(c => c);

        // Extract agent info based on column map
        const name = columnMap.name !== undefined ? cells[columnMap.name]?.replace(/`/g, '') : '';

        if (!name || !this.looksLikeAgentName(name)) {
          continue;
        }

        const agent: Partial<Agent> = {
          name,
        };

        if (columnMap.description !== undefined) {
          agent.description = cells[columnMap.description];
        }

        if (columnMap.type !== undefined) {
          const typeText = cells[columnMap.type]?.toLowerCase();
          if (typeText) {
            agent.type = this.inferAgentType(typeText);
          }
        }

        if (columnMap.tools !== undefined) {
          const toolsText = cells[columnMap.tools];
          if (toolsText) {
            agent.tools = toolsText.split(',').map(t => t.trim()).filter(t => t);
          }
        }

        if (columnMap.delegates !== undefined) {
          const delegatesText = cells[columnMap.delegates];
          if (delegatesText) {
            agent.delegatesTo = delegatesText.split(',').map(d => d.trim().replace(/`/g, '')).filter(d => d);
          }
        }

        // Infer type if not explicitly set
        if (!agent.type) {
          agent.type = this.inferAgentType(name);
        }

        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Parse skill definitions from .claude/skills/ directory
   */
  private async parseSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    const skillsDir = join(this.rootPath, '.claude', 'skills');
    if (!(await this.directoryExists(skillsDir))) {
      return skills;
    }

    const skillFiles = await this.findFiles(skillsDir, ['.md', '.yaml', '.yml']);
    for (const file of skillFiles) {
      const skill = await this.parseSkillFile(file);
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Parse a single skill definition file
   */
  private async parseSkillFile(filePath: string): Promise<Skill | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const name = basename(filePath, extname(filePath));
      const frontmatter = this.parseFrontmatter(content);

      return {
        name: typeof frontmatter.name === 'string' ? frontmatter.name : name,
        path: relative(this.rootPath, filePath),
        description: typeof frontmatter.description === 'string' ? frontmatter.description : this.extractDescription(content),
        triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers as string[] : [],
        dependencies: Array.isArray(frontmatter.dependencies) ? frontmatter.dependencies as string[] : [],
        enabled: typeof frontmatter.enabled === 'boolean' ? frontmatter.enabled : true,
      };
    } catch (error) {
      this.addError('warning', 'SKILL_PARSE_ERROR', `Failed to parse skill file: ${filePath}`, filePath);
      return null;
    }
  }

  /**
   * Parse hooks from .claude/settings.json or .claude/settings.local.json
   */
  private async parseHooks(): Promise<Hook[]> {
    const hooks: Hook[] = [];

    const settingsFiles = [
      join(this.rootPath, '.claude', 'settings.json'),
      join(this.rootPath, '.claude', 'settings.local.json'),
    ];

    for (const settingsFile of settingsFiles) {
      if (!(await this.fileExists(settingsFile))) {
        continue;
      }

      try {
        const content = await readFile(settingsFile, 'utf-8');
        const settings: SettingsJson = JSON.parse(content);

        if (settings.hooks) {
          // Check if hooks is in new format (object with event keys) or old format (array)
          if (Array.isArray(settings.hooks)) {
            // Old format: array of hook configs
            for (const hookConfig of settings.hooks) {
              const parsedHooks = this.parseHookConfigOld(hookConfig, settingsFile);
              hooks.push(...parsedHooks);
            }
          } else {
            // New format: object keyed by event type
            const parsedHooks = this.parseHookConfigNew(settings.hooks, settingsFile);
            hooks.push(...parsedHooks);
          }
        }
      } catch (error) {
        this.addError('warning', 'SETTINGS_PARSE_ERROR', `Failed to parse settings file: ${settingsFile}`, settingsFile);
      }
    }

    return hooks;
  }

  /**
   * Parse hook configuration in old format (array with matcher)
   */
  private parseHookConfigOld(config: HookConfig, sourcePath: string): Hook[] {
    const hooks: Hook[] = [];

    if (!config.hooks) {
      return hooks;
    }

    for (const hookDef of config.hooks) {
      const event = this.normalizeHookEvent(hookDef.type);
      if (event) {
        hooks.push({
          event,
          path: relative(this.rootPath, sourcePath),
          command: hookDef.command,
          workingDirectory: hookDef.workingDirectory,
          timeout: hookDef.timeout,
          enabled: true,
        });
      }
    }

    return hooks;
  }

  /**
   * Parse hook configuration in new format (object keyed by event type)
   */
  private parseHookConfigNew(config: Record<string, HookEventConfig[]>, sourcePath: string): Hook[] {
    const hooks: Hook[] = [];

    for (const [eventKey, eventConfigs] of Object.entries(config)) {
      const event = this.normalizeHookEvent(eventKey);
      if (!event) continue;

      for (const eventConfig of eventConfigs) {
        if (!eventConfig.hooks) continue;

        for (const hookDef of eventConfig.hooks) {
          hooks.push({
            event,
            path: relative(this.rootPath, sourcePath),
            command: hookDef.command,
            workingDirectory: hookDef.workingDirectory,
            timeout: hookDef.timeout,
            enabled: true,
          });
        }
      }
    }

    return hooks;
  }

  /**
   * Parse custom commands from .claude/commands/ directory
   */
  private async parseCommands(): Promise<Command[]> {
    const commands: Command[] = [];

    const commandsDir = join(this.rootPath, '.claude', 'commands');
    if (!(await this.directoryExists(commandsDir))) {
      return commands;
    }

    const commandFiles = await this.findFiles(commandsDir, ['.md', '.yaml', '.yml']);
    for (const file of commandFiles) {
      const command = await this.parseCommandFile(file);
      if (command) {
        commands.push(command);
      }
    }

    return commands;
  }

  /**
   * Parse a single command definition file
   */
  private async parseCommandFile(filePath: string): Promise<Command | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const name = basename(filePath, extname(filePath));
      const frontmatter = this.parseFrontmatter(content);

      const allowedTools = frontmatter.allowed_tools ?? frontmatter.allowedTools;
      const disallowedTools = frontmatter.disallowed_tools ?? frontmatter.disallowedTools;

      return {
        name: `/${name}`,
        description: typeof frontmatter.description === 'string' ? frontmatter.description : this.extractDescription(content),
        allowedTools: Array.isArray(allowedTools) ? allowedTools as string[] : undefined,
        disallowedTools: Array.isArray(disallowedTools) ? disallowedTools as string[] : undefined,
        prompt: this.extractPrompt(content),
      };
    } catch (error) {
      this.addError('warning', 'COMMAND_PARSE_ERROR', `Failed to parse command file: ${filePath}`, filePath);
      return null;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): Record<string, unknown> {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match?.[1]) {
      return {};
    }

    try {
      // Simple YAML parsing for common patterns
      const yaml = match[1];
      const result: Record<string, unknown> = {};

      const lines = yaml.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          let value: unknown = line.slice(colonIndex + 1).trim();

          // Handle arrays
          if (value === '') {
            continue;
          }
          if (typeof value === 'string' && value.startsWith('[')) {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep as string if not valid JSON
            }
          }
          // Handle booleans
          if (value === 'true') value = true;
          if (value === 'false') value = false;

          result[key] = value;
        }
      }

      return result;
    } catch {
      return {};
    }
  }

  /**
   * Extract description from markdown content
   */
  private extractDescription(content: string): string | undefined {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // Get first paragraph
    const paragraphs = withoutFrontmatter.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      // Skip headers and empty lines
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.slice(0, 200);
      }
    }

    return undefined;
  }

  /**
   * Extract prompt content from markdown
   */
  private extractPrompt(content: string): string | undefined {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    return withoutFrontmatter.trim() || undefined;
  }

  /**
   * Normalize hook event type string
   */
  private normalizeHookEvent(type: string): HookEvent | null {
    const eventMap: Record<string, HookEvent> = {
      pretooluse: 'PreToolUse',
      posttooluse: 'PostToolUse',
      notification: 'Notification',
      stop: 'Stop',
      subagentstop: 'SubagentStop',
      userpromptsubmit: 'UserPromptSubmit',
      // Additional event types for newer settings format
      sessionstart: 'Notification', // Map to closest equivalent
      sessionend: 'Stop',
    };

    const normalized = eventMap[type.toLowerCase()];
    if (normalized) {
      return normalized;
    }

    // For new format where the key IS the event name (like 'PreToolUse')
    // check if it's already a valid event
    const validEvents = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop', 'UserPromptSubmit'];
    if (validEvents.includes(type)) {
      return type as HookEvent;
    }

    return null;
  }

  /**
   * Check if a name looks like an agent identifier
   */
  private looksLikeAgentName(name: string): boolean {
    // Common agent naming patterns
    const agentPatterns = [
      /^[a-z]+-?[a-z]*$/i,           // lowercase-with-dashes
      /^[a-z]+[A-Z][a-z]+$/,         // camelCase
      /^[A-Z][a-z]+[A-Z][a-z]+$/,    // PascalCase
      /-agent$/i,                      // ends with -agent
      /^agent-/i,                      // starts with agent-
    ];

    return agentPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Infer agent type from name
   */
  private inferAgentType(name: string): Agent['type'] {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('coordinator') || nameLower.includes('orchestrator')) {
      return 'coordinator';
    }
    if (nameLower.includes('reviewer') || nameLower.includes('review')) {
      return 'reviewer';
    }
    if (nameLower.includes('specialist') || nameLower.includes('expert')) {
      return 'specialist';
    }

    return 'worker';
  }

  /**
   * Check if a file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Find files with specific extensions in a directory
   */
  private async findFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.addError('warning', 'DIR_READ_ERROR', `Failed to read directory: ${dir}`, dir);
    }

    return files;
  }

  /**
   * Add an error to the collection
   */
  private addError(
    severity: ScanError['severity'],
    code: string,
    message: string,
    file?: string
  ): void {
    this.errors.push({ severity, code, message, file });
  }
}

/**
 * Convenience function for parsing Claude Code configuration
 */
export async function parseClaudeCode(rootPath: string): Promise<ClaudeCodeParseResult> {
  const parser = new ClaudeCodeParser(rootPath);
  return parser.parse();
}
