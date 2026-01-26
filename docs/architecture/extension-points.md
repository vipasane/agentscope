# AgentScope v1.2 - Extension Points Specification

## Overview

AgentScope v1.2 provides multiple extension points for customization and integration. This document specifies all available extension points and how to use them.

---

## Extension Point Categories

| Category | Extension Points | Use Cases |
|----------|------------------|-----------|
| **Plugins** | Plugin system | Add custom functionality |
| **Validators** | Security validators | Custom threat detection |
| **Formatters** | Output formatters | Custom documentation formats |
| **Workers** | Background workers | Custom background tasks |
| **Hooks** | Lifecycle hooks | Custom workflow integration |
| **Scanners** | Platform scanners | Support new platforms |

---

## 1. Plugin System

### Plugin Interface

```typescript
/**
 * Base plugin interface
 */
interface AgentScopePlugin {
  // Metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;

  // Lifecycle hooks
  initialize?(config: AgentScopeConfig): Promise<void>;
  beforeScan?(context: ScanContext): Promise<void>;
  afterScan?(result: ScanResult): Promise<void>;
  shutdown?(): Promise<void>;

  // Custom components
  validators?: SecurityValidator[];
  formatters?: OutputFormatter[];
  workers?: BackgroundWorker[];
  scanners?: PlatformScanner[];
}
```

---

### Example: Custom Plugin

```typescript
/**
 * Example: OWASP security plugin
 */
export class OWASPSecurityPlugin implements AgentScopePlugin {
  name = '@agentscope/plugin-owasp-security';
  version = '1.0.0';
  description = 'OWASP Top 10 security validation';
  author = 'Security Team';

  validators = [
    new OWASPInjectionValidator(),
    new OWASPAuthValidator(),
    new OWASPXSSValidator(),
  ];

  async initialize(config: AgentScopeConfig): Promise<void> {
    console.log('[OWASP Plugin] Initialized with config:', config);
  }

  async beforeScan(context: ScanContext): Promise<void> {
    console.log('[OWASP Plugin] Starting security scan');
  }

  async afterScan(result: ScanResult): Promise<void> {
    const owaspIssues = result.securityReport.issues.filter(
      i => i.category.startsWith('owasp-')
    );

    console.log(`[OWASP Plugin] Found ${owaspIssues.length} OWASP issues`);
  }
}
```

---

### Plugin Registration

```typescript
/**
 * Plugin registry
 */
class PluginRegistry {
  private plugins = new Map<string, AgentScopePlugin>();

  /**
   * Register a plugin
   */
  register(plugin: AgentScopePlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Get all validators from plugins
   */
  getValidators(): SecurityValidator[] {
    const validators: SecurityValidator[] = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.validators) {
        validators.push(...plugin.validators);
      }
    }

    return validators;
  }

  /**
   * Execute lifecycle hook across all plugins
   */
  async executeHook(
    hook: 'initialize' | 'beforeScan' | 'afterScan' | 'shutdown',
    data?: unknown
  ): Promise<void> {
    for (const plugin of this.plugins.values()) {
      const hookFn = plugin[hook];

      if (hookFn) {
        await hookFn.call(plugin, data);
      }
    }
  }
}
```

---

### Usage

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { OWASPSecurityPlugin } from '@agentscope/plugin-owasp-security';

const api = new AgentScopeAPI();

// Register plugin
api.registerPlugin(new OWASPSecurityPlugin());

// Scan with plugin active
const result = await api.scan({
  directory: '.claude',
  security: { enabled: true },
});
```

---

## 2. Security Validators

### Validator Interface

```typescript
/**
 * Security validator interface
 */
abstract class SecurityValidator {
  // Metadata
  abstract name: string;
  abstract version?: string;

  /**
   * Validate configuration
   */
  abstract validate(
    config: AgentConfig,
    knownThreats: SecurityThreat[]
  ): Promise<SecurityIssue[]>;

  /**
   * Get validator metadata
   */
  getMetadata(): ValidatorMetadata {
    return {
      name: this.name,
      version: this.version,
    };
  }
}
```

---

### Example: Custom OWASP Validator

```typescript
/**
 * Example: OWASP A01:2021 - Broken Access Control
 */
class OWASPAccessControlValidator extends SecurityValidator {
  name = 'owasp-a01-access-control';
  version = '1.0.0';

  async validate(
    config: AgentConfig,
    knownThreats: SecurityThreat[]
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check for overly permissive access controls
    if (config.permissions?.defaultMode === 'allow') {
      issues.push({
        severity: 'high',
        category: 'owasp-a01-access-control',
        message: 'OWASP A01:2021 - Overly permissive default permissions',
        location: 'permissions.defaultMode',
        remediation: 'Use "deny" or "ask" as default permission mode',
        cve: 'OWASP-A01-2021',
      });
    }

    // Check for wildcard permissions
    const wildcardRules = config.permissions?.rules?.filter(
      r => r.pattern.includes('*') && r.type === 'allow'
    ) || [];

    if (wildcardRules.length > 5) {
      issues.push({
        severity: 'medium',
        category: 'owasp-a01-access-control',
        message: `OWASP A01:2021 - Too many wildcard permissions (${wildcardRules.length})`,
        location: 'permissions.rules',
        remediation: 'Use specific tool permissions instead of wildcards',
      });
    }

    return issues;
  }
}
```

---

### Validator Registration

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { OWASPAccessControlValidator } from './validators';

const api = new AgentScopeAPI();

// Register custom validator
api.registerValidator(new OWASPAccessControlValidator());

// Scan with custom validator
const result = await api.scan({
  directory: '.claude',
  security: {
    enabled: true,
    validators: ['owasp-a01-access-control'],
  },
});
```

---

## 3. Output Formatters

### Formatter Interface

```typescript
/**
 * Output formatter interface
 */
abstract class OutputFormatter {
  // Metadata
  abstract name: string;
  abstract format: 'markdown' | 'html' | 'json' | 'custom';
  abstract extension: string; // File extension (.md, .html, .json)

  /**
   * Format output
   */
  abstract formatOutput(
    config: AgentConfig,
    diagrams: Diagram[],
    securityReport: SecurityReport
  ): Promise<string>;

  /**
   * Get formatter metadata
   */
  getMetadata(): FormatterMetadata {
    return {
      name: this.name,
      format: this.format,
      extension: this.extension,
    };
  }
}
```

---

### Example: HTML Formatter

```typescript
/**
 * Example: HTML formatter with Bootstrap
 */
class HTMLBootstrapFormatter extends OutputFormatter {
  name = 'html-bootstrap';
  format = 'html' as const;
  extension = '.html';

  async formatOutput(
    config: AgentConfig,
    diagrams: Diagram[],
    securityReport: SecurityReport
  ): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentScope Report - ${config.name}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="container my-5">
    <h1>AgentScope Report</h1>
    <h2>${config.name}</h2>

    <!-- Security Summary -->
    <div class="card my-4">
      <div class="card-header">
        <h3>Security Score: ${securityReport.score}/100</h3>
      </div>
      <div class="card-body">
        <p>Critical Issues: ${securityReport.issues.filter(i => i.severity === 'critical').length}</p>
        <p>High Issues: ${securityReport.issues.filter(i => i.severity === 'high').length}</p>
      </div>
    </div>

    <!-- Diagrams -->
    ${diagrams.map(d => `
      <div class="card my-4">
        <div class="card-header">
          <h3>${d.title}</h3>
        </div>
        <div class="card-body">
          <pre class="mermaid">${d.content}</pre>
        </div>
      </div>
    `).join('\n')}
  </div>

  <script>
    mermaid.initialize({ startOnLoad: true });
  </script>
</body>
</html>
`;
  }
}
```

---

### Formatter Registration

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { HTMLBootstrapFormatter } from './formatters';

const api = new AgentScopeAPI();

// Register custom formatter
api.registerFormatter(new HTMLBootstrapFormatter());

// Scan with custom formatter
const result = await api.scan({
  directory: '.claude',
  output: {
    format: 'html-bootstrap',
  },
});
```

---

## 4. Background Workers

### Worker Interface

```typescript
/**
 * Background worker interface
 */
abstract class BackgroundWorker {
  // Metadata
  abstract name: string;
  abstract priority: 'low' | 'normal' | 'high' | 'critical';

  /**
   * Execute worker task
   */
  abstract execute(context: WorkerContext): Promise<WorkerResult>;

  /**
   * Check if worker should run
   */
  abstract shouldRun(trigger: WorkerTrigger): boolean;
}
```

---

### Example: Test Gap Analyzer Worker

```typescript
/**
 * Example: Test gap analyzer
 */
class TestGapAnalyzerWorker extends BackgroundWorker {
  name = 'test-gap-analyzer';
  priority = 'normal' as const;

  shouldRun(trigger: WorkerTrigger): boolean {
    return trigger === 'scan-complete' || trigger === 'test-gap';
  }

  async execute(context: WorkerContext): Promise<WorkerResult> {
    const { config, testResults } = context;

    // Analyze test coverage
    const untested = config.agents.filter(agent => {
      return !testResults.some(test => test.target === agent.name);
    });

    // Store gaps in memory
    for (const agent of untested) {
      await context.memoryManager.storePattern({
        hook: 'test-gap',
        context: { agent: agent.name },
        result: { gap: 'no-tests' },
      });
    }

    return {
      success: true,
      findings: untested.map(a => a.name),
      recommendations: [
        `Add tests for ${untested.length} untested agents`,
      ],
    };
  }
}
```

---

### Worker Registration

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { TestGapAnalyzerWorker } from './workers';

const api = new AgentScopeAPI();

// Register custom worker
api.registerWorker(new TestGapAnalyzerWorker());

// Worker will run automatically on scan-complete
const result = await api.scan({
  directory: '.claude',
  intelligence: {
    enabled: true,
    enableWorkers: true,
  },
});
```

---

## 5. Lifecycle Hooks

### Hook Interface

```typescript
/**
 * Lifecycle hook interface
 */
interface LifecycleHook {
  name: string;
  type: HookType;
  execute(context: HookContext): Promise<HookResult>;
}

type HookType =
  | 'pre-scan'
  | 'post-scan'
  | 'pre-validate'
  | 'post-validate'
  | 'pre-generate'
  | 'post-generate'
  | 'pre-format'
  | 'post-format';
```

---

### Example: Custom Pre-Scan Hook

```typescript
/**
 * Example: Environment validator hook
 */
class EnvironmentValidatorHook implements LifecycleHook {
  name = 'environment-validator';
  type = 'pre-scan' as const;

  async execute(context: HookContext): Promise<HookResult> {
    // Check required environment variables
    const required = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing environment variables: ${missing.join(', ')}`,
      };
    }

    return {
      success: true,
      output: { validated: required },
    };
  }
}
```

---

### Hook Registration

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { EnvironmentValidatorHook } from './hooks';

const api = new AgentScopeAPI();

// Register custom hook
api.registerHook(new EnvironmentValidatorHook());

// Hook will run automatically before scan
const result = await api.scan({
  directory: '.claude',
});
```

---

## 6. Platform Scanners

### Scanner Interface

```typescript
/**
 * Platform scanner interface
 */
abstract class PlatformScanner {
  // Metadata
  abstract name: string;
  abstract platform: string; // 'claude-code', 'cursor', 'gemini', etc.

  /**
   * Detect if platform is present
   */
  abstract detect(directory: string): Promise<boolean>;

  /**
   * Scan platform-specific configs
   */
  abstract scan(directory: string): Promise<AgentConfig>;

  /**
   * Convert to unified model
   */
  abstract convertToUnified(nativeConfig: unknown): AgentConfig;
}
```

---

### Example: Windsurf Scanner

```typescript
/**
 * Example: Windsurf platform scanner
 */
class WindsurfScanner extends PlatformScanner {
  name = 'windsurf-scanner';
  platform = 'windsurf';

  async detect(directory: string): Promise<boolean> {
    // Check for .windsurf/ directory
    return fs.existsSync(path.join(directory, '.windsurf'));
  }

  async scan(directory: string): Promise<AgentConfig> {
    const configPath = path.join(directory, '.windsurf', 'config.json');
    const configRaw = await fs.promises.readFile(configPath, 'utf8');
    const nativeConfig = JSON.parse(configRaw);

    return this.convertToUnified(nativeConfig);
  }

  convertToUnified(nativeConfig: WindsurfConfig): AgentConfig {
    return {
      name: nativeConfig.projectName,
      agents: nativeConfig.assistants.map(a => ({
        name: a.name,
        type: 'custom',
        capabilities: a.skills,
        tools: a.tools,
      })),
      mcpServers: nativeConfig.services || [],
      // ... map other fields
    };
  }
}
```

---

### Scanner Registration

```typescript
// In user code
import { AgentScopeAPI } from '@vipasane/agentscope';
import { WindsurfScanner } from './scanners';

const api = new AgentScopeAPI();

// Register custom scanner
api.registerScanner(new WindsurfScanner());

// Scanner will auto-detect and use if present
const result = await api.scan({
  directory: '.',
  // AgentScope auto-detects Windsurf configs
});
```

---

## Extension Point Configuration

### agentscope.config.json

```json
{
  "plugins": [
    {
      "name": "@agentscope/plugin-owasp-security",
      "enabled": true,
      "options": {
        "strictMode": true
      }
    }
  ],
  "validators": {
    "custom": [
      "owasp-a01-access-control",
      "owasp-a03-injection"
    ]
  },
  "formatters": {
    "output": "html-bootstrap"
  },
  "workers": {
    "enabled": [
      "test-gap-analyzer",
      "performance-profiler"
    ]
  },
  "hooks": {
    "pre-scan": [
      "environment-validator"
    ]
  },
  "scanners": {
    "platforms": [
      "claude-code",
      "cursor",
      "gemini",
      "windsurf"
    ]
  }
}
```

---

## Publishing Extensions

### NPM Package Structure

```
@agentscope/plugin-example/
├── package.json
├── README.md
├── src/
│   ├── index.ts          # Plugin export
│   ├── validators/       # Custom validators
│   ├── formatters/       # Custom formatters
│   ├── workers/          # Custom workers
│   └── hooks/            # Custom hooks
├── tests/
│   └── plugin.test.ts
└── tsconfig.json
```

---

### package.json Example

```json
{
  "name": "@agentscope/plugin-example",
  "version": "1.0.0",
  "description": "Example AgentScope plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["agentscope", "plugin", "security"],
  "peerDependencies": {
    "@vipasane/agentscope": "^1.2.0"
  },
  "devDependencies": {
    "@vipasane/agentscope": "^1.2.0",
    "typescript": "^5.9.0"
  }
}
```

---

### index.ts Export

```typescript
import { AgentScopePlugin } from '@vipasane/agentscope';
import { ExampleValidator } from './validators';
import { ExampleFormatter } from './formatters';

export class ExamplePlugin implements AgentScopePlugin {
  name = '@agentscope/plugin-example';
  version = '1.0.0';

  validators = [new ExampleValidator()];
  formatters = [new ExampleFormatter()];

  async initialize(config: AgentScopeConfig): Promise<void> {
    console.log('[Example Plugin] Initialized');
  }
}

// Default export
export default ExamplePlugin;
```

---

## Extension Discovery

### Automatic Plugin Discovery

AgentScope will automatically discover plugins installed in `node_modules`:

```typescript
/**
 * Plugin discovery
 */
class PluginDiscovery {
  /**
   * Discover plugins in node_modules
   */
  async discoverPlugins(): Promise<AgentScopePlugin[]> {
    const plugins: AgentScopePlugin[] = [];

    // Search for packages matching @agentscope/plugin-*
    const packageJson = await this.loadPackageJson();
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name] of Object.entries(dependencies)) {
      if (name.startsWith('@agentscope/plugin-')) {
        const plugin = await this.loadPlugin(name);
        plugins.push(plugin);
      }
    }

    return plugins;
  }

  private async loadPlugin(name: string): Promise<AgentScopePlugin> {
    const PluginClass = await import(name);
    return new PluginClass.default();
  }
}
```

---

## Best Practices

### 1. Naming Conventions

- **Plugins**: `@agentscope/plugin-<name>` or `@<org>/agentscope-plugin-<name>`
- **Validators**: `<category>-<specific>-validator` (e.g., `owasp-a01-access-control`)
- **Formatters**: `<format>-<variant>` (e.g., `html-bootstrap`)
- **Workers**: `<task>-<action>` (e.g., `test-gap-analyzer`)
- **Hooks**: `<event>-<action>` (e.g., `pre-scan-validator`)

---

### 2. Error Handling

All extension points should handle errors gracefully:

```typescript
async execute(context: WorkerContext): Promise<WorkerResult> {
  try {
    // Worker logic
    return {
      success: true,
      findings: [...],
    };
  } catch (error) {
    console.error(`[Worker] Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

---

### 3. Testing

All extensions should include comprehensive tests:

```typescript
describe('ExamplePlugin', () => {
  it('should initialize successfully', async () => {
    const plugin = new ExamplePlugin();
    await plugin.initialize(mockConfig);
    expect(plugin.name).toBe('@agentscope/plugin-example');
  });

  it('should validate with custom validator', async () => {
    const plugin = new ExamplePlugin();
    const validator = plugin.validators[0];
    const issues = await validator.validate(mockConfig, []);
    expect(issues).toHaveLength(0);
  });
});
```

---

### 4. Documentation

All extensions should include:

- **README.md**: Usage instructions and examples
- **API documentation**: JSDoc comments on all public methods
- **Examples**: Sample code showing common use cases
- **Changelog**: Version history and breaking changes

---

## Conclusion

AgentScope v1.2 provides 6 major extension points:

1. **Plugins** - Full-featured extensions
2. **Validators** - Custom security validation
3. **Formatters** - Custom output formats
4. **Workers** - Background task automation
5. **Hooks** - Lifecycle integration
6. **Scanners** - Multi-platform support

All extension points follow consistent interfaces and patterns, making AgentScope highly extensible.

---

*AgentScope Extension Team*
*2026-01-25*
