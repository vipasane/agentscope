/**
 * Claude Code Configuration Parser
 *
 * Parses Claude Code project configurations from:
 * - `.claude/` directory (agents, skills, commands, settings)
 * - `CLAUDE.md` file (inline agent definitions, tables, bullet lists)
 *
 * Features:
 * - Multi-source agent parsing (files, markdown, tables)
 * - YAML frontmatter extraction
 * - Skill and command discovery
 * - Hook configuration parsing (old and new formats)
 * - Category inference and delegation tracking
 * - Error collection without throwing
 *
 * @module parsers/claude-code
 * @see {@link https://github.com/anthropics/claude-code | Claude Code Documentation}
 *
 * @example
 * ```typescript
 * import { parseClaudeCode } from './parsers/claude-code.js';
 *
 * const result = await parseClaudeCode('/path/to/project');
 *
 * console.log(`Found ${result.agents.length} agents`);
 * console.log(`Found ${result.skills.length} skills`);
 * console.log(`Found ${result.hooks.length} hooks`);
 * console.log(`Found ${result.commands.length} commands`);
 *
 * // Group agents by type
 * const byType = result.agents.reduce((acc, a) => {
 *   (acc[a.type] = acc[a.type] || []).push(a);
 *   return acc;
 * }, {});
 * ```
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

/**
 * Result of Claude Code configuration parsing
 *
 * @interface ClaudeCodeParseResult
 * @property {Agent[]} agents - Parsed agent definitions from all sources
 * @property {Skill[]} skills - Parsed skill definitions from .claude/skills/
 * @property {Hook[]} hooks - Parsed hook configurations from settings
 * @property {Command[]} commands - Parsed custom commands from .claude/commands/
 * @property {ScanError[]} errors - Any warnings or errors encountered
 */
export interface ClaudeCodeParseResult {
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  commands: Command[];
  errors: ScanError[];
}

/**
 * Heading context for agent type inference in CLAUDE.md
 * @internal
 */
interface HeadingContext {
  /** Inferred agent type from heading text */
  type: Agent['type'];
  /** Heading level (2-4) */
  level: number;
  /** Starting line number */
  startLine: number;
  /** Ending line number (next heading of same/higher level) */
  endLine?: number;
}

/**
 * Agent parsed from markdown bullet list
 * @internal
 */
interface BulletAgent {
  /** Agent name extracted from bullet */
  name: string;
  /** Description text after colon/dash */
  description: string;
  /** Line number in source file */
  lineNumber: number;
  /** Indentation level (0 = root, 1 = nested, etc.) */
  indentLevel: number;
}

/**
 * .claude/settings.json file structure
 * @internal
 */
interface SettingsJson {
  /** Hook configurations (old or new format) */
  hooks?: HookConfig[] | Record<string, HookEventConfig[]>;
  /** Permission settings */
  permissions?: PermissionsConfig;
  /** MCP server configurations */
  mcpServers?: Record<string, unknown>;
}

/**
 * Old format hook configuration (array with matcher)
 * @internal
 */
interface HookConfig {
  /** File pattern to match */
  matcher: string;
  /** Hook definitions */
  hooks: HookDefinition[];
}

/**
 * New format hook configuration (event-keyed object)
 * @internal
 */
interface HookEventConfig {
  /** Optional file pattern to match */
  matcher?: string;
  /** Hook definitions for this event */
  hooks: HookDefinition[];
}

/**
 * Individual hook definition
 * @internal
 */
interface HookDefinition {
  /** Hook event type */
  type: string;
  /** Command to execute */
  command?: string;
  /** Working directory for command */
  workingDirectory?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Continue on error flag */
  continueOnError?: boolean;
}

/**
 * Permission configuration
 * @internal
 */
interface PermissionsConfig {
  /** Allowed patterns */
  allow?: string[];
  /** Denied patterns */
  deny?: string[];
}

/**
 * Command configuration
 * @internal
 */
interface CommandConfig {
  /** Command description */
  description?: string;
  /** Tools allowed for this command */
  allowed_tools?: string[];
  /** Tools disallowed for this command */
  disallowed_tools?: string[];
}

// ============================================================================
// Main Parser Class
// ============================================================================

/**
 * Claude Code Configuration Parser
 *
 * Parses Claude Code configurations from multiple sources:
 * 1. `.claude/agents/` - Individual agent definition files
 * 2. `CLAUDE.md` - Inline agent definitions (bullets, tables, headings)
 * 3. `.claude/skills/` - Skill definition files
 * 4. `.claude/settings.json` - Hook configurations
 * 5. `.claude/commands/` - Custom command definitions
 *
 * Features:
 * - Multiple agent parsing strategies (files, bullets, tables)
 * - YAML frontmatter extraction from markdown
 * - Agent type inference from headings and naming
 * - Delegation and tool relationship extraction
 * - Category extraction from frontmatter
 * - Hook configuration parsing (old and new formats)
 * - Error collection for debugging
 *
 * @class ClaudeCodeParser
 *
 * @example
 * ```typescript
 * import { ClaudeCodeParser } from './parsers/claude-code.js';
 *
 * const parser = new ClaudeCodeParser('/workspace');
 * const result = await parser.parse();
 *
 * // Find coordinators
 * const coordinators = result.agents.filter(a => a.type === 'coordinator');
 *
 * // Find agents that delegate to others
 * const delegators = result.agents.filter(a => a.delegatesTo?.length > 0);
 *
 * // Check for parsing errors
 * if (result.errors.length > 0) {
 *   console.warn('Parsing warnings:', result.errors);
 * }
 * ```
 */
export class ClaudeCodeParser {
  private errors: ScanError[] = [];

  /**
   * Create a new Claude Code parser
   *
   * @param {string} rootPath - Absolute path to project root directory
   */
  constructor(private rootPath: string) {}

  /**
   * Parse all Claude Code configurations from the project
   *
   * Searches for and parses:
   * - Agent definitions from `.claude/agents/` and `CLAUDE.md`
   * - Skills from `.claude/skills/`
   * - Hooks from `.claude/settings.json`
   * - Commands from `.claude/commands/`
   *
   * All parsing is done in parallel for performance.
   *
   * @returns {Promise<ClaudeCodeParseResult>} All parsed configurations and errors
   * @throws Never throws - all errors are captured in result.errors
   *
   * @example
   * ```typescript
   * const parser = new ClaudeCodeParser('/workspace');
   * const result = await parser.parse();
   *
   * console.log('Summary:');
   * console.log(`- ${result.agents.length} agents`);
   * console.log(`- ${result.skills.length} skills`);
   * console.log(`- ${result.hooks.length} hooks`);
   * console.log(`- ${result.commands.length} commands`);
   * console.log(`- ${result.errors.length} errors`);
   * ```
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
   * Parse agent definitions from all sources
   *
   * Sources:
   * 1. `.claude/agents/` directory - Individual agent files (.md, .yaml, .yml)
   * 2. `CLAUDE.md` - Inline agent definitions (bullets, tables, headings)
   *
   * @returns {Promise<Agent[]>} All parsed agents
   * @private
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
   *
   * Supports:
   * - YAML frontmatter for metadata
   * - Agent name from filename or frontmatter
   * - Agent type from frontmatter or name inference
   * - Category from frontmatter
   * - Tools and delegatesTo from frontmatter
   *
   * @param {string} filePath - Absolute path to agent file
   * @returns {Promise<Agent | null>} Parsed agent or null if invalid
   * @private
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
   * Type guard to check if a value is a valid agent type
   *
   * @param {unknown} value - Value to check
   * @returns {boolean} True if valid agent type
   * @private
   */
  private isValidAgentType(value: unknown): value is Agent['type'] {
    return typeof value === 'string' && value.length > 0;
  }

  /**
   * Parse agents defined inline in CLAUDE.md
   *
   * Parsing strategy:
   * 1. Parse heading contexts to understand agent type sections
   * 2. Extract global delegation relationships
   * 3. Extract global tool associations
   * 4. Parse bullet list agents with context awareness
   * 5. Parse agent tables as fallback
   *
   * @param {string} filePath - Absolute path to CLAUDE.md file
   * @returns {Promise<Agent[]>} All agents found in CLAUDE.md
   * @private
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
 * Parse Claude Code configurations from a project directory
 *
 * Convenience function that creates a parser and returns all configurations.
 * Searches for:
 * - Agent definitions in `.claude/agents/` and `CLAUDE.md`
 * - Skills in `.claude/skills/`
 * - Hooks in `.claude/settings.json`
 * - Commands in `.claude/commands/`
 *
 * @param {string} rootPath - Absolute path to project root directory
 * @returns {Promise<ClaudeCodeParseResult>} All parsed configurations and errors
 * @throws Never throws - all errors are captured in result.errors
 *
 * @example
 * ```typescript
 * // Parse all Claude Code configurations
 * const result = await parseClaudeCode('/workspace');
 *
 * // Find specific agent types
 * const coordinators = result.agents.filter(a => a.type === 'coordinator');
 * const workers = result.agents.filter(a => a.type === 'worker');
 *
 * // Check delegation hierarchy
 * const hasDelegate = (agent: Agent, target: string): boolean => {
 *   return agent.delegatesTo?.includes(target) ?? false;
 * };
 *
 * // Find enabled skills
 * const enabledSkills = result.skills.filter(s => s.enabled !== false);
 *
 * // Group hooks by event
 * const hooksByEvent = result.hooks.reduce((acc, h) => {
 *   (acc[h.event] = acc[h.event] || []).push(h);
 *   return acc;
 * }, {} as Record<string, Hook[]>);
 * ```
 *
 * @see {@link ClaudeCodeParser} for more control over parsing
 */
export async function parseClaudeCode(rootPath: string): Promise<ClaudeCodeParseResult> {
  const parser = new ClaudeCodeParser(rootPath);
  return parser.parse();
}
