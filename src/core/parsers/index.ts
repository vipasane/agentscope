/**
 * Parser exports
 * Unified interface for all configuration parsers
 */

export { ClaudeCodeParser, parseClaudeCode } from './claude-code.js';
export type { ClaudeCodeParseResult } from './claude-code.js';

export { McpParser, parseMcp } from './mcp.js';
export type { McpParseResult } from './mcp.js';
