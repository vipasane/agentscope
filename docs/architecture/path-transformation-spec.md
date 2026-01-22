# Path Transformation Specification for Cross-Platform Portability

**Version:** 1.0.0
**Date:** 2026-01-22
**Status:** Draft

## Overview

This specification defines the path transformation rules required for exporting and importing Claude Code settings configurations across different platforms and project locations. The goal is to ensure that exported configurations remain portable and can be imported into new projects on any supported platform (Windows, macOS, Linux, Docker).

---

## 1. Path Field Inventory

### 1.1 Settings JSON Path Fields

| Field Location | Field Name | Path Type | Example |
|----------------|------------|-----------|---------|
| `hooks.*.hooks[].command` | command | Shell command with paths | `npx ... --file "$TOOL_INPUT_file_path"` |
| `statusLine.command` | command | Shell command with paths | `node .claude/helpers/statusline.cjs` |
| `permissions.additionalDirectories[]` | additionalDirectories | Directory paths | `./src`, `/home/user/shared` |
| `claudeFlow.adr.directory` | directory | Directory path | `/docs/adr` |
| `claudeFlow.ddd.directory` | directory | Directory path | `/docs/ddd` |
| `claudeFlow.review.humanReviewPatterns[]` | patterns | Glob patterns with paths | `.github/workflows/**` |
| `extraKnownMarketplaces.*.source.path` | path | File/directory path | `./plugins/my-plugin` |
| `strictKnownMarketplaces[].path` | path | File/directory path | `~/.claude/plugins/trusted` |
| `sandbox.network.allowUnixSockets[]` | socket paths | Unix socket paths | `/var/run/docker.sock` |
| `sandbox.ignoreViolations.*[]` | violation paths | File paths | `/tmp/*`, `/var/cache/*` |
| `apiKeyHelper` | script path | Executable path | `./scripts/get-key.sh` |
| `awsCredentialExport` | script path | Executable path | `~/.aws/credentials-helper` |
| `awsAuthRefresh` | script path | Executable path | `/usr/local/bin/aws-refresh` |
| `plansDirectory` | directory | Directory path | `./plans` |

### 1.2 MCP Configuration Path Fields (.mcp.json)

| Field Location | Field Name | Path Type | Example |
|----------------|------------|-----------|---------|
| `mcpServers.*.command` | command | Executable path | `node`, `python`, `npx` |
| `mcpServers.*.args[]` | args | May contain file paths | `["./server.js"]`, `["-m", "db_server"]` |
| `mcpServers.*.env.*` | env values | May contain paths | `DB_PATH=/data/db.sqlite` |

### 1.3 Hook Internal Path References

| Context | Path Type | Example |
|---------|-----------|---------|
| `$TOOL_INPUT_file_path` | Runtime variable | Expanded at runtime |
| Hardcoded paths in commands | Absolute/Relative | `.claude/helpers/`, `/usr/bin/` |

### 1.4 Internal Model Path Fields

| Interface | Field | Path Type |
|-----------|-------|-----------|
| `Agent.path` | File path | `.claude/agents/coder.md` |
| `Skill.path` | File path | `.claude/skills/review/SKILL.md` |
| `Hook.path` | File path | `.claude/hooks/pre-edit.sh` |
| `Hook.workingDirectory` | Directory path | `/workspace` |
| `Plugin.source.location` | Source path | `./plugins/my-plugin` |
| `ScanOptions.rootPath` | Directory path | `/workspace/project` |
| `ScanOptions.outputDir` | Directory path | `./docs/agent-architecture` |
| `DiagramOptions.themePath` | File path | `./themes/custom.json` |

---

## 2. Path Types Classification

### 2.1 Absolute Paths

**Characteristics:**
- Start with `/` (Unix) or drive letter `C:\` (Windows)
- Environment-specific and non-portable
- Must be transformed to relative or variable-based paths on export

**Examples:**
```
/home/alice/project/.claude/settings.json
/Users/bob/workspace/.claude/hooks/pre.sh
C:\Users\charlie\project\.claude\agents\coder.md
```

**Transformation Rule:** Convert to workspace-relative paths where possible

### 2.2 Relative Paths

**Characteristics:**
- Start with `./` or `../` or bare path
- Relative to current working directory or project root
- Generally portable but separator must be normalized

**Examples:**
```
./src/components
.claude/helpers/statusline.cjs
../shared-config/settings.json
```

**Transformation Rule:** Normalize separators, preserve relativity

### 2.3 Home Directory Paths

**Characteristics:**
- Start with `~` or `$HOME` or `%USERPROFILE%`
- User-specific but somewhat portable with variable expansion
- Must handle cross-platform variable differences

**Examples:**
```
~/.claude/skills/my-skill/
$HOME/.claude/agents/
%USERPROFILE%\.claude\settings.json
```

**Transformation Rule:** Normalize to `~` for export, expand on import

### 2.4 Workspace-Relative Paths

**Characteristics:**
- Paths that reference files within the project directory
- Should remain relative to project root for portability
- May start with `./` or be bare paths

**Examples:**
```
.claude/settings.json
docs/adr/
src/components/
```

**Transformation Rule:** Preserve as-is (most portable)

### 2.5 Glob Patterns

**Characteristics:**
- Contain wildcard characters: `*`, `**`, `?`, `[...]`
- Used in permission rules and file matching
- Path separators within globs need careful handling

**Examples:**
```
.github/workflows/**
**/secrets/**
**/*.env*
src/**/*.ts
```

**Transformation Rule:** Normalize separators within base path, preserve glob syntax

### 2.6 Unix Socket Paths

**Characteristics:**
- Unix-specific socket file paths
- Not portable to Windows
- Must be flagged or conditionally removed

**Examples:**
```
/var/run/docker.sock
/tmp/mysql.sock
```

**Transformation Rule:** Flag as platform-specific, conditional inclusion

---

## 3. Transformation Rules by Path Type

### 3.1 Export Transformation Pipeline

```
Input Path
    |
    v
[1. Detect Path Type]
    |
    v
[2. Normalize Separators to POSIX]
    |
    v
[3. Convert Absolute to Relative (if within workspace)]
    |
    v
[4. Normalize Home Directory to ~]
    |
    v
[5. Flag Platform-Specific Paths]
    |
    v
Exported Path + Metadata
```

### 3.2 Detailed Rules

#### Rule E1: Absolute Path Conversion

```typescript
function exportAbsolutePath(
  absolutePath: string,
  workspaceRoot: string
): TransformedPath {
  const normalized = path.posix.normalize(
    absolutePath.replace(/\\/g, '/')
  );

  // Check if within workspace
  if (normalized.startsWith(workspaceRoot)) {
    const relative = path.posix.relative(workspaceRoot, normalized);
    return {
      path: './' + relative,
      original: absolutePath,
      type: 'workspace-relative',
      transformed: true
    };
  }

  // Check if within home directory
  const homeDir = getHomeDirectory();
  if (normalized.startsWith(homeDir)) {
    const relative = path.posix.relative(homeDir, normalized);
    return {
      path: '~/' + relative,
      original: absolutePath,
      type: 'home-relative',
      transformed: true
    };
  }

  // Cannot transform - flag as non-portable
  return {
    path: normalized,
    original: absolutePath,
    type: 'absolute',
    transformed: false,
    warning: 'Non-portable absolute path'
  };
}
```

#### Rule E2: Home Directory Normalization

```typescript
const HOME_PATTERNS = [
  { pattern: /^\$HOME\//,     replacement: '~/' },
  { pattern: /^%USERPROFILE%\\/i, replacement: '~/' },
  { pattern: /^%APPDATA%\\/i,     replacement: '~/AppData/Roaming/' },
  { pattern: /^~\//,          replacement: '~/' }, // already normalized
];

function normalizeHomeDirectory(inputPath: string): string {
  for (const { pattern, replacement } of HOME_PATTERNS) {
    if (pattern.test(inputPath)) {
      return inputPath.replace(pattern, replacement);
    }
  }
  return inputPath;
}
```

#### Rule E3: Path Separator Normalization

```typescript
function normalizePathSeparators(inputPath: string): string {
  // Convert Windows backslashes to forward slashes
  // But preserve escaped characters in shell commands

  // Don't transform if it's a shell command with escapes
  if (inputPath.includes('\\$') || inputPath.includes('\\"')) {
    return inputPath;
  }

  // Convert backslashes to forward slashes
  return inputPath.replace(/\\/g, '/');
}
```

#### Rule E4: Glob Pattern Preservation

```typescript
function transformGlobPattern(pattern: string): TransformedPath {
  // Extract base path from glob
  const firstWildcard = pattern.search(/[*?\[]/);

  if (firstWildcard === -1) {
    // No wildcards - treat as regular path
    return transformPath(pattern);
  }

  const basePath = pattern.substring(0, firstWildcard);
  const globPart = pattern.substring(firstWildcard);

  // Transform base path only
  const transformedBase = normalizePathSeparators(basePath);

  return {
    path: transformedBase + globPart,
    original: pattern,
    type: 'glob',
    transformed: basePath !== transformedBase
  };
}
```

### 3.3 Import Transformation Pipeline

```
Exported Path + Metadata
    |
    v
[1. Detect Target Platform]
    |
    v
[2. Expand Home Directory Variable]
    |
    v
[3. Convert Separators for Platform]
    |
    v
[4. Resolve Relative to New Workspace Root]
    |
    v
[5. Validate Path Exists (optional)]
    |
    v
Imported Path
```

#### Rule I1: Platform Detection and Separator Conversion

```typescript
type Platform = 'win32' | 'darwin' | 'linux' | 'docker';

function convertForPlatform(
  posixPath: string,
  platform: Platform
): string {
  if (platform === 'win32') {
    // Convert to Windows path
    // But preserve glob patterns
    if (posixPath.includes('**') || posixPath.includes('*')) {
      // Keep forward slashes in globs for cross-platform glob libraries
      return posixPath;
    }
    return posixPath.replace(/\//g, '\\');
  }

  // Unix-like systems use forward slashes
  return posixPath;
}
```

#### Rule I2: Home Directory Expansion

```typescript
function expandHomeDirectory(
  inputPath: string,
  platform: Platform
): string {
  if (!inputPath.startsWith('~/')) {
    return inputPath;
  }

  const relativePath = inputPath.substring(2);

  switch (platform) {
    case 'win32':
      return `%USERPROFILE%\\${relativePath.replace(/\//g, '\\')}`;
    case 'darwin':
    case 'linux':
    case 'docker':
      return `${process.env.HOME || '~'}/${relativePath}`;
    default:
      return inputPath;
  }
}
```

#### Rule I3: Workspace Root Resolution

```typescript
function resolveToWorkspace(
  relativePath: string,
  newWorkspaceRoot: string,
  platform: Platform
): string {
  if (relativePath.startsWith('./') || !path.isAbsolute(relativePath)) {
    const sep = platform === 'win32' ? '\\' : '/';
    const cleanRelative = relativePath.replace(/^\.\//, '');
    return newWorkspaceRoot + sep + cleanRelative;
  }
  return relativePath;
}
```

---

## 4. Platform-Specific Concerns

### 4.1 Windows Considerations

| Concern | Description | Handling |
|---------|-------------|----------|
| Path separators | Uses `\` instead of `/` | Convert on import, normalize on export |
| Drive letters | `C:\`, `D:\` etc. | Strip and make relative, or flag as non-portable |
| Case insensitivity | `File.txt` = `file.txt` | Preserve original case, normalize for comparison |
| Reserved names | `CON`, `PRN`, `AUX`, `NUL` | Avoid or escape |
| Path length | Max 260 chars (legacy) | Warn if approaching limit |
| Unix sockets | Not supported | Remove or flag as unsupported |

### 4.2 macOS/Linux Considerations

| Concern | Description | Handling |
|---------|-------------|----------|
| Path separators | Uses `/` | Already POSIX-compatible |
| Case sensitivity | Usually case-sensitive | Preserve exact case |
| Hidden files | Start with `.` | Preserve dot prefix |
| Symlinks | Common for linking | Resolve or preserve based on context |
| Permissions | Execute bits required | Note in export metadata |

### 4.3 Docker Considerations

| Concern | Description | Handling |
|---------|-------------|----------|
| Mount points | `/workspace` typically | Map to workspace-relative |
| Container paths | May differ from host | Document expected structure |
| Volume mounts | External paths | Flag as environment-specific |
| User namespaces | UID/GID differences | Note permission requirements |

### 4.4 Platform Detection

```typescript
interface PlatformInfo {
  platform: Platform;
  homeDir: string;
  pathSeparator: string;
  isDocker: boolean;
  caseInsensitive: boolean;
}

function detectPlatform(): PlatformInfo {
  const platform = process.platform;
  const isDocker = fs.existsSync('/.dockerenv') ||
                   process.env.DOCKER_CONTAINER === 'true';

  return {
    platform: isDocker ? 'docker' : platform as Platform,
    homeDir: os.homedir(),
    pathSeparator: path.sep,
    isDocker,
    caseInsensitive: platform === 'win32'
  };
}
```

---

## 5. Path Rewriting Algorithm

### 5.1 Complete Export Algorithm

```typescript
interface PathTransformOptions {
  workspaceRoot: string;
  preserveAbsolute?: boolean;
  includePlatformMetadata?: boolean;
}

interface TransformedSettings {
  settings: ClaudeCodeSettings;
  pathMetadata: PathMetadata[];
  warnings: string[];
  sourcePlatform: PlatformInfo;
}

function exportSettings(
  settings: ClaudeCodeSettings,
  options: PathTransformOptions
): TransformedSettings {
  const metadata: PathMetadata[] = [];
  const warnings: string[] = [];
  const platform = detectPlatform();

  // Deep clone settings
  const exported = JSON.parse(JSON.stringify(settings));

  // Transform all path fields
  const pathFields = [
    // Hook commands
    { path: 'hooks.*.hooks[].command', type: 'shell-command' },
    { path: 'statusLine.command', type: 'shell-command' },

    // Directory paths
    { path: 'permissions.additionalDirectories[]', type: 'directory' },
    { path: 'claudeFlow.adr.directory', type: 'directory' },
    { path: 'claudeFlow.ddd.directory', type: 'directory' },
    { path: 'plansDirectory', type: 'directory' },

    // Script paths
    { path: 'apiKeyHelper', type: 'executable' },
    { path: 'awsCredentialExport', type: 'executable' },
    { path: 'awsAuthRefresh', type: 'executable' },

    // Glob patterns
    { path: 'claudeFlow.review.humanReviewPatterns[]', type: 'glob' },

    // Plugin sources
    { path: 'extraKnownMarketplaces.*.source.path', type: 'file' },
    { path: 'strictKnownMarketplaces[].path', type: 'file' },

    // Platform-specific
    { path: 'sandbox.network.allowUnixSockets[]', type: 'socket' },
    { path: 'sandbox.ignoreViolations.*[]', type: 'file' },
  ];

  for (const fieldDef of pathFields) {
    const result = transformField(
      exported,
      fieldDef.path,
      fieldDef.type,
      options
    );

    metadata.push(...result.metadata);
    warnings.push(...result.warnings);
  }

  return {
    settings: exported,
    pathMetadata: metadata,
    warnings,
    sourcePlatform: platform
  };
}
```

### 5.2 Complete Import Algorithm

```typescript
interface ImportOptions {
  targetWorkspaceRoot: string;
  targetPlatform?: Platform;
  validatePaths?: boolean;
  createMissing?: boolean;
}

function importSettings(
  exported: TransformedSettings,
  options: ImportOptions
): ClaudeCodeSettings {
  const targetPlatform = options.targetPlatform || detectPlatform().platform;
  const settings = JSON.parse(JSON.stringify(exported.settings));

  // Process each path field using metadata
  for (const meta of exported.pathMetadata) {
    let importedPath = meta.path;

    // Step 1: Expand home directory
    if (importedPath.startsWith('~/')) {
      importedPath = expandHomeDirectory(importedPath, targetPlatform);
    }

    // Step 2: Resolve workspace-relative paths
    if (importedPath.startsWith('./')) {
      importedPath = resolveToWorkspace(
        importedPath,
        options.targetWorkspaceRoot,
        targetPlatform
      );
    }

    // Step 3: Convert separators for target platform
    if (meta.type !== 'glob' && meta.type !== 'shell-command') {
      importedPath = convertForPlatform(importedPath, targetPlatform);
    }

    // Step 4: Validate path exists (optional)
    if (options.validatePaths && meta.type !== 'socket') {
      if (!fs.existsSync(importedPath)) {
        if (options.createMissing && meta.type === 'directory') {
          fs.mkdirSync(importedPath, { recursive: true });
        } else {
          console.warn(`Path does not exist: ${importedPath}`);
        }
      }
    }

    // Update the settings object
    setNestedValue(settings, meta.fieldPath, importedPath);
  }

  return settings;
}
```

---

## 6. Shell Command Portability

### 6.1 Shell Syntax Differences

| Feature | Bash (Unix) | PowerShell (Windows) | cmd.exe (Windows) |
|---------|-------------|---------------------|-------------------|
| Variable expansion | `$VAR`, `${VAR}` | `$env:VAR` | `%VAR%` |
| Command substitution | `$(cmd)` | `$(cmd)` | N/A |
| Path separator | `/` | `/` or `\` | `\` |
| Null redirect | `2>/dev/null` | `2>$null` | `2>NUL` |
| Boolean operators | `&&`, `||` | `-and`, `-or` | `&&`, `||` |
| Test command | `[`, `[[`, `test` | N/A | `IF` |
| Exit status | `$?` | `$LASTEXITCODE` | `%ERRORLEVEL%` |

### 6.2 Command Portability Analysis

```typescript
interface CommandAnalysis {
  portable: boolean;
  bashSpecific: string[];
  windowsAlternative?: string;
  recommendations: string[];
}

function analyzeCommand(command: string): CommandAnalysis {
  const bashSpecific: string[] = [];
  let portable = true;

  // Check for Bash-specific features
  const bashPatterns = [
    { pattern: /\[\s+-[nz]/, feature: 'test operators' },
    { pattern: /2>\/dev\/null/, feature: '/dev/null redirect' },
    { pattern: /\$\{[^}]+\}/, feature: 'parameter expansion' },
    { pattern: /\$\([^)]+\)/, feature: 'command substitution' },
    { pattern: /\|\|/, feature: 'OR operator' },
    { pattern: /&&/, feature: 'AND operator' },
    { pattern: /\bif\s+\[/, feature: 'if-test construct' },
  ];

  for (const { pattern, feature } of bashPatterns) {
    if (pattern.test(command)) {
      bashSpecific.push(feature);
      portable = false;
    }
  }

  return {
    portable,
    bashSpecific,
    recommendations: portable ? [] : [
      'Consider using npx-based commands for cross-platform compatibility',
      'Use Node.js scripts instead of shell scripts',
      'Provide platform-specific alternatives in configuration'
    ]
  };
}
```

### 6.3 Shell Command Transformation Strategy

**Option A: Preserve with Platform Annotation**

```json
{
  "hooks": {
    "PreToolUse": [{
      "command": "[ -n \"$VAR\" ] && echo test",
      "_platform": "unix",
      "_windowsAlternative": "IF DEFINED VAR echo test"
    }]
  }
}
```

**Option B: Use Cross-Platform Abstractions**

```json
{
  "hooks": {
    "PreToolUse": [{
      "type": "command",
      "command": "npx @claude-flow/cli@latest hooks pre-edit --file \"$TOOL_INPUT_file_path\"",
      "_note": "npx handles cross-platform execution"
    }]
  }
}
```

**Option C: Platform-Specific Command Blocks**

```json
{
  "hooks": {
    "PreToolUse": [{
      "type": "command",
      "commands": {
        "unix": "[ -n \"$VAR\" ] && ./script.sh",
        "windows": "IF DEFINED VAR powershell -File script.ps1"
      }
    }]
  }
}
```

### 6.4 Recommended Approach

1. **Use npx for CLI tools** - Cross-platform by design
2. **Use Node.js scripts** - Write `.js` or `.mjs` files instead of shell scripts
3. **Avoid shell-specific syntax** - Use simple commands that work everywhere
4. **Document platform requirements** - Add metadata for non-portable commands

---

## 7. Export/Import Metadata Schema

### 7.1 Path Metadata Structure

```typescript
interface PathMetadata {
  /** JSON path to the field (e.g., "hooks.PreToolUse[0].command") */
  fieldPath: string;

  /** The transformed path value */
  path: string;

  /** Original path before transformation */
  original?: string;

  /** Type classification */
  type: 'directory' | 'file' | 'executable' | 'glob' | 'shell-command' | 'socket';

  /** Whether transformation was applied */
  transformed: boolean;

  /** Portability classification */
  portability: 'universal' | 'unix-only' | 'windows-only' | 'project-specific';

  /** Any warnings about this path */
  warnings?: string[];
}
```

### 7.2 Export Manifest

```typescript
interface ExportManifest {
  /** Manifest version */
  version: '1.0.0';

  /** When export was created */
  exportedAt: string;

  /** Source platform information */
  sourcePlatform: PlatformInfo;

  /** Original workspace root */
  sourceWorkspaceRoot: string;

  /** Path transformation summary */
  pathTransformations: {
    total: number;
    transformed: number;
    warnings: number;
  };

  /** Detailed path metadata */
  pathMetadata: PathMetadata[];

  /** Global warnings */
  warnings: string[];

  /** Compatibility notes */
  compatibility: {
    requiresUnix: boolean;
    requiresWindows: boolean;
    requiresDocker: boolean;
    notes: string[];
  };
}
```

---

## 8. Implementation Recommendations

### 8.1 Export Workflow

1. **Scan all path fields** using the inventory in Section 1
2. **Classify each path** using rules in Section 2
3. **Apply transformation rules** from Section 3
4. **Generate path metadata** as per Section 7
5. **Analyze shell commands** using Section 6 analysis
6. **Generate export manifest** with warnings
7. **Output transformed settings** + manifest

### 8.2 Import Workflow

1. **Parse export manifest** to understand source context
2. **Detect target platform** characteristics
3. **Validate compatibility** based on manifest
4. **Apply reverse transformations** for each path field
5. **Convert shell commands** if alternatives exist
6. **Validate paths** optionally
7. **Generate import report** with any issues

### 8.3 Testing Strategy

| Test Case | Description |
|-----------|-------------|
| Round-trip same platform | Export then import on same OS |
| Round-trip cross-platform | Export Unix, import Windows (and vice versa) |
| Absolute path handling | Paths outside workspace |
| Home directory expansion | `~/` paths across platforms |
| Glob pattern preservation | Ensure wildcards survive |
| Shell command analysis | Detect non-portable commands |
| Docker environment | Container-specific paths |

---

## 9. Summary Tables

### 9.1 Path Type Transformation Summary

| Path Type | Export Action | Import Action |
|-----------|---------------|---------------|
| Absolute (in workspace) | Convert to `./relative` | Resolve to new workspace |
| Absolute (outside workspace) | Flag warning, keep as-is | Keep as-is, validate |
| Home directory | Normalize to `~/` | Expand for target platform |
| Workspace-relative | Keep as-is | Keep as-is |
| Glob patterns | Normalize base path only | Keep as-is |
| Unix sockets | Flag as Unix-only | Remove on Windows import |

### 9.2 Platform Compatibility Matrix

| Feature | Windows | macOS | Linux | Docker |
|---------|---------|-------|-------|--------|
| Forward slash paths | Partial | Yes | Yes | Yes |
| Backslash paths | Yes | No | No | No |
| `~/` expansion | Yes* | Yes | Yes | Yes |
| Unix sockets | No | Yes | Yes | Yes |
| Case sensitivity | No | Partial | Yes | Yes |
| Bash commands | WSL/Git Bash | Yes | Yes | Yes |

*Windows requires special handling for `~` expansion

---

## Appendix A: JSON Path Notation

For specifying nested fields:

- `hooks.PreToolUse[0].command` - Array index access
- `hooks.*.hooks[].command` - Wildcard for all keys, all array items
- `permissions.additionalDirectories[]` - All array items
- `extraKnownMarketplaces.*.source.path` - Nested object access

## Appendix B: Regular Expressions for Path Detection

```typescript
const PATH_PATTERNS = {
  // Absolute Unix path
  unixAbsolute: /^\/[^\/].*$/,

  // Absolute Windows path
  windowsAbsolute: /^[A-Za-z]:\\.*$/,

  // Home directory references
  homeDirectory: /^(~\/|\$HOME\/|%USERPROFILE%\\|%APPDATA%\\)/i,

  // Relative path
  relative: /^\.\.?\/|^[^\/\\:*?"<>|]+$/,

  // Glob pattern
  glob: /[*?\[\]]/,

  // Environment variable
  envVar: /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|%[A-Za-z_][A-Za-z0-9_]*%/,
};
```

## Appendix C: Example Transformations

### Example 1: Hook Command Export

**Input (Unix):**
```json
{
  "command": "[ -n \"$TOOL_INPUT_file_path\" ] && /home/alice/project/.claude/scripts/validate.sh 2>/dev/null || true"
}
```

**Output (Exported):**
```json
{
  "command": "[ -n \"$TOOL_INPUT_file_path\" ] && ./.claude/scripts/validate.sh 2>/dev/null || true",
  "_pathMetadata": {
    "transformed": true,
    "original": "/home/alice/project/.claude/scripts/validate.sh",
    "type": "shell-command",
    "portability": "unix-only",
    "warnings": ["Contains Bash-specific syntax: test operators, /dev/null redirect"]
  }
}
```

### Example 2: Directory Path Export

**Input:**
```json
{
  "additionalDirectories": [
    "/home/alice/shared-configs",
    "./local-overrides",
    "~/global-settings"
  ]
}
```

**Output (Exported):**
```json
{
  "additionalDirectories": [
    "~/shared-configs",
    "./local-overrides",
    "~/.global-settings"
  ],
  "_pathMetadata": [
    { "original": "/home/alice/shared-configs", "transformed": true, "portability": "universal" },
    { "transformed": false, "portability": "universal" },
    { "transformed": false, "portability": "universal" }
  ]
}
```

---

**Document End**
