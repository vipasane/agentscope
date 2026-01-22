# ADR-003: Settings Scanner Architecture

## Status

**Accepted**

| Field | Value |
|-------|-------|
| Date | 2026-01-22 |
| Author | Architecture Team |
| Schema Version | 2026.01 |
| Related | ADR-004, ADR-005, ADR-006 |

---

## Context

### Problem Statement

Claude Code stores its configuration in `.claude/settings.json`, a comprehensive file containing hooks, plugins, permissions, MCP servers, and behavioral settings. The current AgentScope parsing implementation:

1. **Fragmented Parsing**: Multiple ad-hoc parsers read different sections independently
2. **No Schema Validation**: Settings files are not validated against a known schema
3. **Version Drift**: No mechanism to track or handle schema version changes
4. **Incomplete Extraction**: Not all configuration sections are parsed (hooks, plugins partially missing)

### Current State

The existing `parseClaudeCode()` function in `src/core/parsers/claude-code.ts` extracts:

- MCP server configurations
- Basic permissions (allowedDirectories, restricted patterns)
- Partial settings metadata

Missing or incomplete:

- Hook configurations (PreToolUse, PostToolUse, etc.)
- Plugin marketplace entries
- Permission DSL patterns (Tool(argument) format)
- Schema version tracking

### Target Schema Structure

Based on Claude Code documentation and the 2026.01 schema:

```json
{
  "schemaVersion": "2026.01",
  "permissions": {
    "allow": ["Tool(pattern)", "Tool(*)"],
    "deny": ["Tool(pattern)"],
    "allowedDirectories": ["/path/to/dir"],
    "restrictedPatterns": ["*.env", "*.key"]
  },
  "hooks": {
    "PreToolUse": [{ "matcher": "...", "hooks": [...] }],
    "PostToolUse": [...],
    "Stop": [...],
    "Notification": [...]
  },
  "plugins": [
    { "name": "...", "source": "...", "enabled": true }
  ],
  "mcpServers": {
    "serverName": { "command": "...", "args": [...] }
  }
}
```

---

## Decision

### Overview

Implement a **unified Settings Scanner** that:

1. Provides a single entry point for all `.claude/settings.json` parsing
2. Validates against the 2026.01 schema with forward compatibility
3. Tracks schema versions for migration support
4. Delegates to specialized sub-parsers for complex sections

### Architecture

```
src/core/parsers/
  settings/
    scanner.ts              # Main entry point - SettingsScanner class
    schema-validator.ts     # JSON Schema validation
    section-parsers/
      hooks.ts              # Hook configuration parser (see ADR-006)
      plugins.ts            # Plugin parser (see ADR-005)
      permissions.ts        # Permission DSL parser (see ADR-004)
      mcp-servers.ts        # MCP server configuration parser
      index.ts              # Section parser exports
    types.ts                # TypeScript interfaces
    index.ts                # Public exports
```

### Scanner Interface

```typescript
interface SettingsScanner {
  /**
   * Scan and parse settings from a root directory
   * @param rootPath - Project root containing .claude/settings.json
   * @returns Fully parsed and validated settings
   */
  scan(rootPath: string): Promise<ParsedSettings>;

  /**
   * Get the detected schema version
   */
  getSchemaVersion(): string;

  /**
   * Check if settings need migration
   */
  needsMigration(): boolean;
}

interface ParsedSettings {
  schemaVersion: string;
  permissions: ParsedPermissions;
  hooks: ParsedHooks;
  plugins: ParsedPlugins;
  mcpServers: ParsedMcpServers;
  raw: unknown; // Original JSON for passthrough
}
```

### Scanning Pipeline

1. **Discovery**: Locate `.claude/settings.json` (with fallback paths)
2. **Loading**: Read and parse JSON with error handling
3. **Version Detection**: Extract and validate `schemaVersion`
4. **Schema Validation**: Validate against 2026.01 schema
5. **Section Parsing**: Delegate to specialized parsers
6. **Aggregation**: Combine results into unified `ParsedSettings`

### Schema Version Strategy

| Version | Status | Notes |
|---------|--------|-------|
| `2025.01` | Legacy | Migrate to 2026.01 |
| `2026.01` | Current | Full support |
| `2026.02+` | Future | Forward-compatible parsing |

For unknown future versions:
- Parse known sections with current logic
- Preserve unknown sections in `raw` for passthrough
- Log warning about version mismatch

---

## Consequences

### Positive

1. **Single Source of Truth**: All settings parsing flows through one scanner
2. **Schema Validation**: Invalid configurations caught early with clear errors
3. **Version Tracking**: Migration paths clearly defined for schema changes
4. **Extensibility**: New sections added by implementing SectionParser interface
5. **Type Safety**: Full TypeScript interfaces for all parsed data

### Negative

1. **Migration Complexity**: Existing code must migrate to new scanner API
2. **Schema Coupling**: Changes to Claude Code schema require scanner updates
3. **Validation Overhead**: Schema validation adds processing time (~5-10ms)

### Risks

1. **Schema Drift**: Claude Code may change schema without version bump
   - Mitigation: Defensive parsing with unknown property passthrough
2. **Breaking Changes**: Major schema changes could break existing configurations
   - Mitigation: Migration utilities and version detection

---

## Implementation Notes

### Discovery Paths (Priority Order)

```typescript
const SETTINGS_PATHS = [
  '.claude/settings.json',           // Standard location
  '.claude/settings.local.json',     // Local overrides (gitignored)
  'claude-settings.json',            // Alternative root location
];
```

### Error Handling

```typescript
class SettingsScannerError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'INVALID_JSON' | 'SCHEMA_INVALID' | 'VERSION_UNSUPPORTED',
    public readonly path?: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}
```

### Caching Strategy

The scanner implements LRU caching with file modification time tracking:

```typescript
interface CacheEntry {
  settings: ParsedSettings;
  mtime: number;
  parsedAt: Date;
}
```

Cache invalidation occurs when:
- File modification time changes
- Manual `invalidateCache()` called
- TTL exceeded (default: 60 seconds)

---

## References

- Schema: 2026.01
- Related: ADR-004 (Permission Parser), ADR-005 (Plugin Parser), ADR-006 (Hook Parser)
- Claude Code Documentation: Settings file specification
