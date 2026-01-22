# ADR-007: Configuration Portability (Export/Import)

## Status

**Accepted**

| Field | Value |
|-------|-------|
| Date | 2026-01-22 |
| Author | Architecture Team |
| Schema Version | 2026.01 |
| Related | ADR-003, ADR-004, ADR-005, ADR-006 |

---

## Context

### Problem Statement

Teams and individuals need to share Claude Code configurations across environments, machines, and team members. Current challenges:

1. **Secrets Exposure**: API keys and tokens may be embedded in settings
2. **Path Hardcoding**: Absolute paths break when moved between machines
3. **MCP Server Dependencies**: MCP servers may not be installed on target machines
4. **Plugin Availability**: Plugins may reference private or unavailable sources
5. **No Standard Format**: No established way to package configurations for sharing

### Use Cases

| Use Case | Description | Requirements |
|----------|-------------|--------------|
| Team Onboarding | New team member needs standard config | Exclude secrets, include setup instructions |
| Environment Migration | Move config to new machine | Normalize paths, document dependencies |
| Configuration Backup | Preserve working configuration | Include all settings, encrypt secrets option |
| Template Sharing | Share configuration templates | Generic paths, placeholder secrets |
| Troubleshooting | Share config for debugging | Redact sensitive data |

### Configuration Components

| Component | Portability | Secrets Risk | Path Dependencies |
|-----------|-------------|--------------|-------------------|
| Permissions | High | Low | Medium (directory paths) |
| Hooks | Medium | Medium (env vars in commands) | High (script paths) |
| Plugins | Medium | Low | Medium (local plugins) |
| MCP Servers | Low | High (API keys, tokens) | High (binary paths) |
| Settings | High | Low | Low |

---

## Decision

### Overview

Implement a **Configuration Export/Import System** that:

1. Exports configurations with secrets excluded by default
2. Normalizes paths for cross-machine portability
3. Bundles MCP server documentation (not binaries)
4. Generates setup instructions for missing dependencies
5. Supports multiple export formats (JSON, YAML, bundle)

### Architecture

```
src/core/portability/
  export/
    exporter.ts               # Main export orchestrator
    secrets-filter.ts         # Identifies and redacts secrets
    path-normalizer.ts        # Converts paths for portability
    mcp-bundler.ts            # Documents MCP server requirements
    format/
      json.ts                 # JSON export format
      yaml.ts                 # YAML export format
      bundle.ts               # ZIP bundle with setup scripts
  import/
    importer.ts               # Main import orchestrator
    secrets-prompter.ts       # Prompts for missing secrets
    path-resolver.ts          # Resolves paths for target machine
    dependency-checker.ts     # Validates dependencies exist
  types.ts                    # Shared type definitions
  index.ts                    # Public exports
```

### Export Interface

```typescript
interface ConfigExporter {
  /**
   * Export configuration with options
   */
  export(options: ExportOptions): Promise<ExportResult>;
}

interface ExportOptions {
  /** Source settings path */
  sourcePath: string;

  /** Export format */
  format: 'json' | 'yaml' | 'bundle';

  /** Output path (file or directory for bundle) */
  outputPath: string;

  /** Secret handling strategy */
  secrets: SecretsStrategy;

  /** Path handling strategy */
  paths: PathStrategy;

  /** Include MCP server documentation */
  includeMcpDocs: boolean;

  /** Include setup instructions */
  includeSetupInstructions: boolean;
}

interface SecretsStrategy {
  /** How to handle detected secrets */
  mode: 'exclude' | 'redact' | 'encrypt' | 'include';

  /** Encryption key (required if mode is 'encrypt') */
  encryptionKey?: string;

  /** Custom patterns to treat as secrets */
  additionalPatterns?: RegExp[];
}

interface PathStrategy {
  /** How to handle paths */
  mode: 'normalize' | 'preserve' | 'relative';

  /** Base path for relative conversion */
  basePath?: string;
}

interface ExportResult {
  /** Export successful */
  success: boolean;

  /** Output file/directory path */
  outputPath: string;

  /** Warnings during export */
  warnings: ExportWarning[];

  /** Summary of exported components */
  summary: ExportSummary;
}

interface ExportSummary {
  permissions: { allow: number; deny: number };
  hooks: { total: number; byEvent: Record<string, number> };
  plugins: { total: number; enabled: number };
  mcpServers: { total: number; documented: number };
  secretsRedacted: number;
  pathsNormalized: number;
}
```

### Import Interface

```typescript
interface ConfigImporter {
  /**
   * Preview import without applying changes
   */
  preview(options: ImportOptions): Promise<ImportPreview>;

  /**
   * Import configuration
   */
  import(options: ImportOptions): Promise<ImportResult>;
}

interface ImportOptions {
  /** Source path (file or bundle directory) */
  sourcePath: string;

  /** Target settings path */
  targetPath: string;

  /** How to handle existing configuration */
  mergeStrategy: 'replace' | 'merge' | 'skip-existing';

  /** How to handle missing secrets */
  secretsMode: 'prompt' | 'env' | 'skip';

  /** Path resolution strategy */
  pathResolution: 'auto' | 'prompt' | 'preserve';
}

interface ImportPreview {
  /** Changes that would be made */
  changes: ConfigChange[];

  /** Missing dependencies */
  missingDependencies: Dependency[];

  /** Secrets that need to be provided */
  requiredSecrets: SecretPlaceholder[];

  /** Paths that need resolution */
  unresolvedPaths: PathResolution[];

  /** Validation issues */
  issues: ValidationIssue[];
}

interface ImportResult {
  success: boolean;
  appliedChanges: ConfigChange[];
  skippedChanges: ConfigChange[];
  setupInstructions: string[];
  warnings: string[];
}
```

### Secrets Detection

```typescript
interface SecretsFilter {
  /**
   * Detect secrets in configuration
   */
  detect(config: unknown): DetectedSecret[];

  /**
   * Redact secrets from configuration
   */
  redact(config: unknown): { redacted: unknown; secrets: DetectedSecret[] };
}

interface DetectedSecret {
  /** Path to secret in config (dot notation) */
  path: string;

  /** Type of secret detected */
  type: SecretType;

  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';

  /** Redaction placeholder */
  placeholder: string;
}

type SecretType =
  | 'api_key'
  | 'oauth_token'
  | 'password'
  | 'private_key'
  | 'connection_string'
  | 'env_variable'
  | 'unknown';

// Detection patterns
const SECRET_PATTERNS: Array<{
  pattern: RegExp;
  type: SecretType;
  confidence: 'high' | 'medium' | 'low';
}> = [
  { pattern: /sk-[a-zA-Z0-9]{32,}/, type: 'api_key', confidence: 'high' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, type: 'oauth_token', confidence: 'high' },
  { pattern: /^xox[baprs]-/, type: 'oauth_token', confidence: 'high' },
  { pattern: /-----BEGIN.*PRIVATE KEY-----/, type: 'private_key', confidence: 'high' },
  { pattern: /^(password|passwd|pwd|secret|token|apikey|api_key)$/i, type: 'unknown', confidence: 'medium' },
  { pattern: /\$\{[A-Z_]+_(KEY|TOKEN|SECRET|PASSWORD)\}/, type: 'env_variable', confidence: 'medium' },
];

// Field names that typically contain secrets
const SECRET_FIELD_NAMES = [
  'apiKey', 'api_key', 'apikey',
  'token', 'accessToken', 'access_token',
  'secret', 'secretKey', 'secret_key',
  'password', 'passwd', 'pwd',
  'privateKey', 'private_key',
  'credentials', 'auth', 'authorization'
];
```

### Path Normalization

```typescript
interface PathNormalizer {
  /**
   * Normalize paths for export
   */
  normalize(config: unknown, basePath: string): NormalizedConfig;

  /**
   * Resolve paths for import
   */
  resolve(config: unknown, targetBasePath: string): ResolvedConfig;
}

interface NormalizedConfig {
  config: unknown;
  normalizations: PathNormalization[];
}

interface PathNormalization {
  /** Original path */
  original: string;

  /** Normalized path (with placeholders) */
  normalized: string;

  /** Placeholder used */
  placeholder: PathPlaceholder;
}

type PathPlaceholder =
  | '${PROJECT_ROOT}'     // Project root directory
  | '${HOME}'             // User home directory
  | '${CONFIG_DIR}'       // .claude directory
  | '${WORKSPACE}'        // VS Code workspace
  | '${CWD}';             // Current working directory

// Normalization rules (order matters - more specific first)
const NORMALIZATION_RULES = [
  { pattern: /^\.claude\//, placeholder: '${CONFIG_DIR}/' },
  { pattern: /^\.\//, placeholder: '${PROJECT_ROOT}/' },
  { detect: (p: string, base: string) => p.startsWith(base), placeholder: '${PROJECT_ROOT}' },
  { detect: (p: string) => p.startsWith(os.homedir()), placeholder: '${HOME}' },
];
```

### Bundle Format

```
config-export/
  settings.json           # Exported settings (secrets redacted)
  secrets.template.json   # Template for secrets (placeholders only)
  mcp-servers/
    README.md             # MCP server documentation
    server-name/
      README.md           # Individual server setup
      requirements.txt    # Dependencies (if applicable)
  setup.sh                # Unix setup script
  setup.ps1               # Windows setup script
  SETUP.md                # Human-readable setup instructions
  manifest.json           # Bundle metadata
```

### Bundle Manifest

```typescript
interface BundleManifest {
  /** Bundle format version */
  version: '1.0';

  /** Export timestamp */
  exportedAt: string;

  /** Source machine info (optional) */
  sourceInfo?: {
    platform: string;
    nodeVersion: string;
    claudeCodeVersion?: string;
  };

  /** Schema version of exported settings */
  schemaVersion: string;

  /** Components included */
  components: {
    settings: boolean;
    hooks: boolean;
    plugins: boolean;
    mcpServers: boolean;
  };

  /** Secrets status */
  secrets: {
    mode: 'excluded' | 'redacted' | 'encrypted';
    count: number;
    placeholders: string[];
  };

  /** Dependencies */
  dependencies: {
    mcpServers: McpServerDependency[];
    plugins: PluginDependency[];
    tools: ToolDependency[];
  };
}

interface McpServerDependency {
  name: string;
  command: string;
  installInstructions: string;
  homepage?: string;
}
```

---

## Consequences

### Positive

1. **Safe Sharing**: Secrets automatically excluded prevents accidental exposure
2. **Cross-Platform**: Path normalization enables sharing between different OS
3. **Self-Documenting**: Bundle includes setup instructions
4. **Dependency Awareness**: Missing dependencies clearly identified
5. **Flexible Formats**: JSON for tools, YAML for humans, bundle for distribution

### Negative

1. **Information Loss**: Excluded secrets must be re-entered manually
2. **Bundle Size**: Full bundles with docs may be larger than needed
3. **Setup Complexity**: Recipients must follow setup instructions
4. **Version Sensitivity**: Bundles tied to specific schema versions

### Risks

1. **Secret Leakage**: Imperfect detection may miss some secrets
   - Mitigation: Conservative detection, warn on suspicious values
2. **Path Resolution Failures**: Paths may not resolve correctly on all systems
   - Mitigation: Interactive resolution mode, clear error messages
3. **MCP Server Incompatibility**: Server versions may differ between machines
   - Mitigation: Document version requirements, provide installation scripts

---

## Implementation Notes

### Setup Script Generation

```bash
#!/bin/bash
# setup.sh - Generated by AgentScope config export

echo "Setting up Claude Code configuration..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }

# Install MCP servers
echo "Installing MCP servers..."
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @anthropic-ai/mcp-server-memory

# Create config directory
mkdir -p ~/.claude

# Copy settings (prompt for secrets)
echo "Configuring settings..."
if [ ! -f secrets.json ]; then
  echo "Please create secrets.json from secrets.template.json"
  exit 1
fi

# Merge settings with secrets
node -e "
const settings = require('./settings.json');
const secrets = require('./secrets.json');
// Deep merge logic here
console.log(JSON.stringify({...settings, ...secrets}, null, 2));
" > ~/.claude/settings.json

echo "Setup complete!"
```

### Interactive Secret Prompting

```typescript
async function promptForSecrets(
  placeholders: SecretPlaceholder[],
  options: { useEnv: boolean }
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  for (const placeholder of placeholders) {
    // Try environment variable first
    if (options.useEnv) {
      const envName = placeholder.suggestedEnvVar;
      if (envName && process.env[envName]) {
        secrets[placeholder.path] = process.env[envName];
        continue;
      }
    }

    // Prompt user
    const value = await prompt({
      type: 'password',
      name: 'value',
      message: `Enter value for ${placeholder.description} (${placeholder.path}):`,
      validate: placeholder.validator
    });

    secrets[placeholder.path] = value;
  }

  return secrets;
}
```

### Merge Strategies

```typescript
type MergeStrategy = 'replace' | 'merge' | 'skip-existing';

function mergeConfigs(
  existing: unknown,
  imported: unknown,
  strategy: MergeStrategy
): unknown {
  switch (strategy) {
    case 'replace':
      return imported;

    case 'skip-existing':
      return existing ?? imported;

    case 'merge':
      return deepMerge(existing, imported, {
        arrayMerge: 'concat',      // Combine arrays
        objectMerge: 'shallow'     // Imported wins for objects
      });
  }
}
```

---

## References

- Schema: 2026.01
- Related: ADR-003 (Settings Scanner), ADR-004 (Permission Parser), ADR-005 (Plugin Parser), ADR-006 (Hook Parser)
- Claude Code Documentation: Configuration file specification
- SOPS: Secrets management (https://github.com/mozilla/sops)
