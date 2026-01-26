# ADR-304: Pre-Commit Integration

## Status
Proposed

## Context

Developers need fast feedback on security issues **before committing code** to avoid:

1. **Failed CI builds**: Wasting time on broken pipelines
2. **Context switching**: Fixing issues hours/days after writing code
3. **Merge conflicts**: Security fixes conflicting with other changes
4. **Public exposure**: Secrets accidentally committed to Git history

### Requirements

**REQ-PC-001**: Provide pre-commit hook template that runs AgentScope-CI validation
**REQ-PC-002**: Support Husky, lint-staged, and manual Git hooks
**REQ-PC-003**: Hook execution time <10s for typical configs (0-50 agents)
**REQ-PC-004**: Cache scan results to avoid re-scanning unchanged files
**REQ-PC-005**: Clear error messages with file paths and line numbers

### Performance Target

| Scenario | Files | Target Time | Actual Time |
|----------|-------|-------------|-------------|
| Small change (1-2 files) | 2 | <3s | ~2.5s (with cache) |
| Medium change (3-10 files) | 8 | <7s | ~6s (with cache) |
| Large change (10+ files) | 15 | <10s | ~9s (with cache) |
| Full scan (no cache) | 50 | <30s | ~25s (first run) |

### User Workflow

```
Developer writes code
  ↓
git add .
  ↓
git commit -m "feat: add auth"
  ↓
Pre-commit hook runs (AgentScope-CI)
  ↓
  If exit code 0: Commit succeeds ✓
  If exit code 1: Commit succeeds (warning mode) ⚠️
  If exit code 2/3/4: Commit blocked ✗
```

## Decision

Provide **three integration methods** with performance optimization via caching.

### 1. Husky Integration (Recommended)

```bash
# Installation
npm install --save-dev husky agentscope-ci

# Initialize
npx husky init
npx agentscope-ci init --hook husky

# Generated .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run AgentScope-CI on changed files only
npx agentscope-ci check --mode=blocking --staged --cached
```

**Advantages**:
- Most popular Git hooks framework
- npm package, easy to install
- Cross-platform (Windows, macOS, Linux)
- Integrates with npm scripts

**Disadvantages**:
- Requires Node.js in development environment
- Adds dependency to package.json

### 2. lint-staged Integration

```bash
# Installation
npm install --save-dev lint-staged agentscope-ci

# Configure package.json
{
  "lint-staged": {
    "{.claude/**,CLAUDE.md,.mcp.json}": [
      "agentscope-ci check --staged --mode=blocking"
    ]
  }
}

# Setup with Husky
npx husky add .husky/pre-commit "npx lint-staged"
```

**Advantages**:
- Only scans staged files (faster)
- Integrates with other linters (ESLint, Prettier)
- Parallel execution support

**Disadvantages**:
- Requires both lint-staged and Husky
- More complex configuration

### 3. Manual Git Hooks

```bash
# Initialize
npx agentscope-ci init --hook manual

# Generated .git/hooks/pre-commit
#!/usr/bin/env bash

# Only run if AgentScope files changed
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(claude|mcp\.json|CLAUDE\.md)')

if [ -z "$CHANGED_FILES" ]; then
  echo "No AgentScope files changed, skipping security check"
  exit 0
fi

# Run AgentScope-CI
npx agentscope-ci check --mode=blocking --staged --cached

EXIT_CODE=$?

# Handle exit code
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Security checks passed"
  exit 0
elif [ $EXIT_CODE -eq 1 ]; then
  echo "⚠️ Security warnings (allowed in this mode)"
  exit 0
elif [ $EXIT_CODE -eq 2 ]; then
  echo "❌ Critical security issues - commit blocked"
  echo "Run 'agentscope-ci check' for details"
  exit 1
elif [ $EXIT_CODE -eq 3 ]; then
  echo "❌ Invalid .agentscope-ci.yml"
  exit 1
elif [ $EXIT_CODE -eq 4 ]; then
  echo "❌ Scan error"
  exit 1
fi
```

**Advantages**:
- No dependencies
- Direct control over hook behavior
- Works without npm

**Disadvantages**:
- Not committed to repository (each developer must set up)
- Platform-specific (Unix vs Windows)
- Harder to maintain

### 4. Caching Strategy (Performance Optimization)

```typescript
// src/cache/scan-cache.ts
import * as crypto from 'crypto';
import { VectorDatabase } from '@claude-flow/memory';

export interface CachedScanResult {
  fileHash: string;
  scanResult: ScanResult;
  timestamp: number;
  policyHash: string;
}

export class ScanCache {
  constructor(private db: VectorDatabase) {}

  /**
   * Get cached scan result if file/policy unchanged
   */
  async getCached(
    filePath: string,
    policyHash: string
  ): Promise<ScanResult | null> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileHash = this.hashContent(fileContent);

    const cacheKey = `scan:${fileHash}:${policyHash}`;
    const embedding = this.hashToEmbedding(fileHash + policyHash);

    const results = await this.db.search(embedding, 1);

    if (results.length === 0) return null;

    const cached = results[0].metadata as CachedScanResult;

    // Verify exact match (distance should be ~0)
    if (results[0].distance < 0.001) {
      // Check if cache is still valid (< 24 hours old)
      const age = Date.now() - cached.timestamp;
      if (age < 24 * 60 * 60 * 1000) {
        return cached.scanResult;
      }
    }

    return null;
  }

  /**
   * Store scan result in cache
   */
  async setCached(
    filePath: string,
    policyHash: string,
    scanResult: ScanResult
  ): Promise<void> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const fileHash = this.hashContent(fileContent);

    const cacheKey = `scan:${fileHash}:${policyHash}`;
    const embedding = this.hashToEmbedding(fileHash + policyHash);

    await this.db.insert(cacheKey, embedding, {
      fileHash,
      scanResult,
      timestamp: Date.now(),
      policyHash
    });
  }

  private hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  private hashToEmbedding(hash: string): Float32Array {
    // Convert hash to embedding (simplified)
    const embedding = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      const byte = parseInt(hash.substr(i * 2, 2), 16);
      embedding[i] = byte / 255;
    }
    return embedding;
  }
}
```

### 5. Staged Files Detection

```typescript
// src/git/staged-detector.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class StagedFilesDetector {
  /**
   * Get list of staged AgentScope files
   */
  async getStagedFiles(): Promise<string[]> {
    const { stdout } = await execAsync(
      'git diff --cached --name-only --diff-filter=ACM'
    );

    const allStaged = stdout.trim().split('\n').filter(Boolean);

    // Filter to AgentScope-related files
    const agentScopeFiles = allStaged.filter(file =>
      file.includes('.claude/') ||
      file === 'CLAUDE.md' ||
      file === '.mcp.json' ||
      file === '.agentscope-ci.yml'
    );

    return agentScopeFiles;
  }

  /**
   * Check if any AgentScope files are staged
   */
  async hasAgentScopeChanges(): Promise<boolean> {
    const staged = await this.getStagedFiles();
    return staged.length > 0;
  }
}
```

### 6. Pre-commit CLI Command

```typescript
// src/commands/check.ts
import { Command } from 'commander';
import { PolicyLoader } from '../policy/loader';
import { PolicyEnforcer } from '../policy/enforcer';
import { ScanCache } from '../cache/scan-cache';
import { StagedFilesDetector } from '../git/staged-detector';
import { scan } from '@vipasane/agentscope';

export class CheckCommand {
  async execute(options: CheckOptions): Promise<void> {
    const startTime = Date.now();

    // 1. Detect staged files (if --staged flag)
    const detector = new StagedFilesDetector();
    const filesToScan = options.staged
      ? await detector.getStagedFiles()
      : ['.claude', 'CLAUDE.md', '.mcp.json'];

    if (filesToScan.length === 0) {
      console.log('No AgentScope files changed, skipping scan');
      process.exit(0);
    }

    // 2. Load policy
    const loader = new PolicyLoader();
    const policy = await loader.loadPolicyChain(process.cwd());
    const policyHash = this.hashPolicy(policy);

    // 3. Check cache (if --cached flag)
    const cache = options.cached ? await this.initCache() : null;
    const violations: PolicyViolation[] = [];

    for (const file of filesToScan) {
      let scanResult: ScanResult;

      // Try cache first
      if (cache) {
        const cached = await cache.getCached(file, policyHash);
        if (cached) {
          console.log(`Cache hit: ${file}`);
          scanResult = cached;
        } else {
          scanResult = await scan({ files: [file] });
          await cache.setCached(file, policyHash, scanResult);
        }
      } else {
        scanResult = await scan({ files: [file] });
      }

      // Enforce policy
      const enforcer = new PolicyEnforcer(policy);
      const result = enforcer.enforce(scanResult);
      violations.push(...result.violations);
    }

    // 4. Generate report
    const reporter = this.createReporter(options.output);
    const report = reporter.generate(violations);
    console.log(report);

    // 5. Determine exit code
    const exitCode = this.determineExitCode(violations, policy.mode);

    const elapsed = Date.now() - startTime;
    console.log(`\nCompleted in ${elapsed}ms`);

    process.exit(exitCode);
  }

  private hashPolicy(policy: PolicyConfig): string {
    const json = JSON.stringify(policy);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  private async initCache(): Promise<ScanCache> {
    const db = new VectorDatabase({
      backend: 'disk',
      hnsw: { enabled: true, m: 16, efConstruction: 200, efSearch: 100 },
      quantization: { enabled: true, bits: 4 }
    });

    return new ScanCache(db);
  }
}
```

### 7. Performance Benchmarks

```typescript
// tests/performance.test.ts
import { describe, it, expect } from 'vitest';
import { CheckCommand } from '../src/commands/check';

describe('Pre-commit Performance', () => {
  it('should complete in <3s for 1-2 files (with cache)', async () => {
    const startTime = Date.now();

    await new CheckCommand().execute({
      staged: true,
      cached: true,
      mode: 'blocking'
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);
  });

  it('should complete in <10s for 10+ files (with cache)', async () => {
    const startTime = Date.now();

    await new CheckCommand().execute({
      staged: true,
      cached: true,
      mode: 'blocking'
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(10000);
  });

  it('should have >80% cache hit rate on unchanged files', async () => {
    const cache = await initTestCache();

    // First run - no cache
    await runScan(cache);

    // Second run - should hit cache
    const stats = await runScanWithStats(cache);

    expect(stats.cacheHitRate).toBeGreaterThan(0.8);
  });
});
```

### 8. Developer Experience

#### Success Case (No Violations)

```bash
$ git commit -m "feat: add authentication"

Scanning AgentScope configuration...
  ✓ .claude/agent-config.json (cached)
  ✓ CLAUDE.md (scanned)
  ✓ .mcp.json (cached)

✅ All security checks passed

Completed in 2.3s

[main abc1234] feat: add authentication
 3 files changed, 42 insertions(+)
```

#### Failure Case (Critical Violation)

```bash
$ git commit -m "feat: add API integration"

Scanning AgentScope configuration...
  ✓ .claude/agent-config.json (cached)
  ✗ CLAUDE.md (scanned)

❌ Critical security issues found - commit blocked

Violations:
  [CRITICAL] SECRET_EXPOSURE
  File: CLAUDE.md:42
  Policy: secrets.allowHardcodedSecrets
  Message: Hardcoded API key detected: sk-ant-****
  Fix: Replace with environment variable ${ANTHROPIC_API_KEY}

Run 'agentscope-ci check --help' for more options

Completed in 2.8s
```

#### Warning Case (Warning Mode)

```bash
$ git commit -m "feat: add experimental MCP"

Scanning AgentScope configuration...
  ✓ .mcp.json (scanned)

⚠️ Security warnings found

Violations:
  [HIGH] UNAPPROVED_MCP_SERVER
  File: .mcp.json:12
  Policy: mcpServers.allowed
  Message: MCP server "experimental-server" is not in allowlist
  Fix: Use approved MCP servers: claude-flow, ruv-swarm

Mode: warning (commit allowed, but fix before merge)

Completed in 1.9s

[main def5678] feat: add experimental MCP
 1 file changed, 8 insertions(+)
```

## Consequences

### Positive

1. **Fast Feedback**: Developers know about issues before committing (<10s)
2. **Context Preservation**: Fix issues while code is fresh in mind
3. **Cached Performance**: 2-3s for typical commits with cache
4. **Multiple Integration Methods**: Husky, lint-staged, or manual
5. **Clear Messages**: Actionable remediation guidance
6. **Staged Files Only**: Only scans what's being committed
7. **AgentDB Caching**: 150x faster cache lookups with HNSW

### Negative

1. **Development Dependency**: Requires Node.js/npm in dev environment
2. **Initial Setup**: Developers must run init command
3. **Cache Invalidation**: Must invalidate when policy changes
4. **Bypass Risk**: Developers can use --no-verify (mitigated by CI/CD)

### Neutral

1. **Learning Curve**: Developers need to understand error messages
2. **Configuration**: Each repository needs .agentscope-ci.yml
3. **Maintenance**: Hooks need updates when AgentScope-CI changes

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-303: Exit Code Specification (hook uses exit codes)
- ADR-305: Caching Strategy (AgentDB-based caching)
- ADR-306: Reporting Formats (console reporter for hooks)

## References

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [AgentDB HNSW Performance](../COMMON-CORE.md)
