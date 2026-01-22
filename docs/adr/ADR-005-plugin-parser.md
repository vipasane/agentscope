# ADR-005: Plugin Marketplace Parser

## Status

**Accepted**

| Field | Value |
|-------|-------|
| Date | 2026-01-22 |
| Author | Architecture Team |
| Schema Version | 2026.01 |
| Related | ADR-003 |

---

## Context

### Problem Statement

Claude Code supports plugins from multiple marketplace sources (GitHub, npm, local files). The current AgentScope implementation does not parse or document plugin configurations, leaving users without visibility into their installed plugins.

### Plugin Configuration Format

Based on Claude Code's plugin system:

```json
{
  "plugins": [
    {
      "name": "code-review",
      "source": "github:owner/repo",
      "version": "1.2.0",
      "enabled": true,
      "config": { "strictMode": true }
    },
    {
      "name": "local-tool",
      "source": "file:./plugins/my-plugin",
      "enabled": true
    },
    {
      "name": "npm-plugin",
      "source": "npm:@scope/plugin-name",
      "version": "^2.0.0",
      "enabled": false
    }
  ]
}
```

### Marketplace Sources

| Source Type | Format | Example |
|-------------|--------|---------|
| GitHub | `github:owner/repo` | `github:anthropics/claude-plugins` |
| GitHub (specific path) | `github:owner/repo/path` | `github:org/monorepo/packages/plugin` |
| npm | `npm:package-name` | `npm:@claude/code-review` |
| npm (scoped) | `npm:@scope/package` | `npm:@company/internal-plugin` |
| Local file | `file:./relative/path` | `file:./plugins/custom` |
| Local file (absolute) | `file:/absolute/path` | `file:/opt/plugins/shared` |
| URL | `https://...` | `https://example.com/plugin.zip` |

### Current State

No plugin parsing exists. The `plugins` array in settings is ignored during AgentScope's configuration extraction.

---

## Decision

### Overview

Implement a **Plugin Marketplace Parser** that:

1. Parses plugin entries from multiple marketplace sources
2. Validates source URIs and extracts metadata
3. Resolves version constraints to actual versions (when possible)
4. Supports extensible marketplace source handlers
5. Provides plugin dependency analysis

### Architecture

```
src/core/parsers/settings/section-parsers/
  plugins.ts                  # Main plugin parser entry
  plugin-types.ts             # Type definitions
  sources/
    index.ts                  # Source handler registry
    github.ts                 # GitHub source parser
    npm.ts                    # npm source parser
    file.ts                   # Local file source parser
    url.ts                    # URL source parser
    base.ts                   # Abstract source handler
```

### Parser Interface

```typescript
interface PluginParser {
  /**
   * Parse a single plugin configuration
   */
  parse(plugin: RawPluginConfig): ParsedPlugin;

  /**
   * Parse all plugins from settings
   */
  parseAll(plugins: RawPluginConfig[]): ParsedPlugin[];

  /**
   * Resolve plugin metadata (async - may fetch from source)
   */
  resolve(plugin: ParsedPlugin): Promise<ResolvedPlugin>;
}

interface ParsedPlugin {
  /** Plugin name (identifier) */
  name: string;

  /** Parsed source information */
  source: PluginSource;

  /** Version constraint (if specified) */
  versionConstraint?: string;

  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin-specific configuration */
  config?: Record<string, unknown>;
}

interface PluginSource {
  /** Source type */
  type: 'github' | 'npm' | 'file' | 'url';

  /** Raw source string */
  raw: string;

  /** Type-specific parsed data */
  data: GitHubSource | NpmSource | FileSource | UrlSource;
}

interface GitHubSource {
  owner: string;
  repo: string;
  path?: string;
  ref?: string; // branch, tag, or commit
}

interface NpmSource {
  package: string;
  scope?: string;
  registry?: string; // default: npmjs.com
}

interface FileSource {
  path: string;
  isAbsolute: boolean;
  resolvedPath?: string; // After resolution against project root
}

interface UrlSource {
  url: string;
  protocol: 'https' | 'http';
}
```

### Source Handler Pattern

```typescript
abstract class SourceHandler {
  abstract readonly type: string;
  abstract readonly pattern: RegExp;

  abstract parse(sourceString: string): PluginSource['data'];

  abstract validate(source: PluginSource['data']): ValidationResult;

  abstract resolve(
    source: PluginSource['data'],
    versionConstraint?: string
  ): Promise<ResolvedSourceData>;

  matches(sourceString: string): boolean {
    return this.pattern.test(sourceString);
  }
}

// Registry for source handlers
class SourceRegistry {
  private handlers: SourceHandler[] = [];

  register(handler: SourceHandler): void {
    this.handlers.push(handler);
  }

  getHandler(sourceString: string): SourceHandler | null {
    return this.handlers.find(h => h.matches(sourceString)) ?? null;
  }
}
```

### Resolved Plugin Metadata

```typescript
interface ResolvedPlugin extends ParsedPlugin {
  /** Resolved version (actual, not constraint) */
  resolvedVersion?: string;

  /** Plugin manifest data */
  manifest?: PluginManifest;

  /** Resolution status */
  resolution: ResolutionStatus;
}

interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  capabilities?: string[];
  dependencies?: Record<string, string>;
}

interface ResolutionStatus {
  resolved: boolean;
  method: 'cached' | 'fetched' | 'local' | 'failed';
  error?: string;
  resolvedAt?: Date;
}
```

---

## Consequences

### Positive

1. **Source Visibility**: Users see where each plugin comes from
2. **Version Tracking**: Version constraints and resolved versions documented
3. **Extensibility**: New marketplace sources added via handler pattern
4. **Dependency Analysis**: Plugin dependencies can be tracked and visualized
5. **Security Audit**: External plugin sources clearly identified

### Negative

1. **Network Dependencies**: Resolving remote plugins requires network access
2. **Resolution Latency**: Fetching metadata adds time to scanning
3. **Cache Invalidation**: Resolved metadata may become stale

### Risks

1. **Private Sources**: GitHub private repos require authentication
   - Mitigation: Graceful degradation, show source without metadata
2. **Source Format Changes**: Marketplace source URIs may evolve
   - Mitigation: Extensible handler pattern allows updates
3. **Offline Scenarios**: No network means no resolution
   - Mitigation: Cache resolved metadata, work offline with cached data

---

## Implementation Notes

### Source Parsing Examples

```typescript
// GitHub source parsing
function parseGitHubSource(source: string): GitHubSource {
  // github:owner/repo
  // github:owner/repo/path/to/plugin
  // github:owner/repo@ref
  const match = source.match(/^github:([^\/]+)\/([^\/\@]+)(\/[^\@]+)?(\@.+)?$/);
  if (!match) throw new SourceParseError(source, 'github');

  return {
    owner: match[1],
    repo: match[2],
    path: match[3]?.slice(1), // Remove leading /
    ref: match[4]?.slice(1)   // Remove leading @
  };
}

// npm source parsing
function parseNpmSource(source: string): NpmSource {
  // npm:package-name
  // npm:@scope/package-name
  const match = source.match(/^npm:(@[^\/]+\/)?(.+)$/);
  if (!match) throw new SourceParseError(source, 'npm');

  return {
    scope: match[1]?.slice(1, -1), // Remove @ and /
    package: match[2]
  };
}
```

### Caching Strategy

```typescript
interface PluginCache {
  /** Cache resolved plugin metadata */
  set(source: string, metadata: ResolvedPlugin, ttl?: number): void;

  /** Get cached metadata if valid */
  get(source: string): ResolvedPlugin | null;

  /** Invalidate specific entry */
  invalidate(source: string): void;

  /** Clear all cached entries */
  clear(): void;
}

// Default TTL by source type
const DEFAULT_TTL = {
  github: 3600,  // 1 hour
  npm: 86400,    // 24 hours
  file: 0,       // Always check local files
  url: 3600      // 1 hour
};
```

### Offline Mode

```typescript
interface PluginParserOptions {
  /** Skip network requests, use cached data only */
  offline?: boolean;

  /** Directory for cached plugin metadata */
  cacheDir?: string;

  /** Custom source handlers */
  additionalSources?: SourceHandler[];
}
```

---

## References

- Schema: 2026.01
- Related: ADR-003 (Settings Scanner)
- Claude Code Documentation: Plugin system specification
- npm registry API: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
- GitHub API: https://docs.github.com/en/rest
