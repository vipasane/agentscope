# AgentScope: TDD and Quality Control Framework

> **Purpose**: Comprehensive testing and quality assurance strategy for agentic coding with automated quality gates
> **Document Version**: 1.0 | January 2026 | Research Phase

---

## Executive Summary

AgentScope will be built using **agentic coding** (Claude Code swarms), where AI agents produce code at speeds humans cannot manually review. This document establishes:

1. **Test-Driven Development (TDD)** workflow that agents must follow
2. **Verifiable outcomes** for every feature
3. **Automated quality gates** that catch issues before merge
4. **Human review triggers** that flag when manual oversight is needed

**The Core Problem**: Agents can build overnight. Humans cannot review overnight. We need automated systems that verify quality and flag exceptions.

**The Solution**: Every feature must have tests written BEFORE implementation. CI/CD gates enforce this. Human review is triggered only for specific conditions.

---

## Table of Contents

1. [TDD Workflow for Agentic Coding](#1-tdd-workflow-for-agentic-coding)
2. [Verifiable Outcomes Matrix](#2-verifiable-outcomes-matrix)
3. [Automated Quality Gates](#3-automated-quality-gates)
4. [Human Review Triggers](#4-human-review-triggers)
5. [Test Structure Templates](#5-test-structure-templates)
6. [Quality Metrics Dashboard](#6-quality-metrics-dashboard)
7. [Pre-commit Hooks](#7-pre-commit-hooks)
8. [GitHub Actions Workflow](#8-github-actions-workflow)
9. [Test Fixture Strategy](#9-test-fixture-strategy)
10. [Agent Testing Protocol](#10-agent-testing-protocol)

---

## 1. TDD Workflow for Agentic Coding

### 1.1 The TDD Contract

**Rule**: No implementation code may be written without a failing test first.

For agentic coding, this is enforced through:

```
Agent Request: "Implement feature X"
                    |
                    v
        +-------------------+
        | 1. Write test(s)  |  <-- Agent MUST start here
        |    that define    |
        |    expected       |
        |    behavior       |
        +-------------------+
                    |
                    v
        +-------------------+
        | 2. Verify tests   |  <-- Tests MUST fail
        |    fail (RED)     |
        +-------------------+
                    |
                    v
        +-------------------+
        | 3. Implement      |  <-- Minimal code to pass
        |    feature        |
        +-------------------+
                    |
                    v
        +-------------------+
        | 4. Verify tests   |  <-- Tests MUST pass (GREEN)
        |    pass           |
        +-------------------+
                    |
                    v
        +-------------------+
        | 5. Refactor       |  <-- Clean up, maintain GREEN
        +-------------------+
                    |
                    v
        +-------------------+
        | 6. Commit         |  <-- Only after all tests pass
        +-------------------+
```

### 1.2 Agent Instructions for TDD

When an agent receives a task, it MUST follow this protocol:

```markdown
## Agent TDD Protocol

Before implementing any feature:

1. **Understand the requirement**
   - Read the specification/issue
   - Identify inputs, outputs, edge cases
   - Document expected behavior

2. **Write tests FIRST**
   - Create test file following naming convention
   - Write tests that define success criteria
   - Include edge cases and error conditions
   - Run tests - they MUST fail (RED phase)

3. **Implement minimal solution**
   - Write only enough code to pass tests
   - Do not add unrequested functionality
   - Keep implementation simple

4. **Verify GREEN**
   - All new tests must pass
   - All existing tests must still pass
   - Coverage must not decrease

5. **Refactor if needed**
   - Improve code quality
   - Ensure tests still pass
   - Do not change behavior

6. **Commit with test evidence**
   - Commit message must reference tests
   - Include test run results in PR description
```

### 1.3 Test File Naming Conventions

| File Type | Location | Naming Pattern | Example |
|-----------|----------|----------------|---------|
| Unit tests | `src/**/__tests__/` | `[module].test.ts` | `src/parsers/__tests__/claude-code.test.ts` |
| Integration tests | `tests/integration/` | `[feature].integration.test.ts` | `tests/integration/scan.integration.test.ts` |
| E2E tests | `tests/e2e/` | `[flow].e2e.test.ts` | `tests/e2e/cli-scan.e2e.test.ts` |
| Snapshot tests | `tests/snapshots/` | `[output].snap.ts` | `tests/snapshots/diagrams.snap.ts` |

### 1.4 Test Organization Structure

```
agentscope/
├── src/
│   ├── parsers/
│   │   ├── __tests__/
│   │   │   ├── claude-code.test.ts      # Unit tests for Claude Code parser
│   │   │   ├── mcp.test.ts              # Unit tests for MCP parser
│   │   │   └── fixtures/                # Parser-specific test data
│   │   ├── claude-code.ts
│   │   └── mcp.ts
│   ├── generators/
│   │   ├── __tests__/
│   │   │   ├── mermaid.test.ts
│   │   │   └── markdown.test.ts
│   │   ├── mermaid.ts
│   │   └── markdown.ts
│   └── model/
│       ├── __tests__/
│       │   └── unified-config.test.ts
│       └── unified-config.ts
├── tests/
│   ├── integration/
│   │   ├── scan.integration.test.ts
│   │   ├── diagram.integration.test.ts
│   │   └── export.integration.test.ts
│   ├── e2e/
│   │   ├── cli-scan.e2e.test.ts
│   │   └── cli-diagram.e2e.test.ts
│   ├── snapshots/
│   │   ├── component-map.snap.md
│   │   ├── workflow-sequence.snap.md
│   │   └── readme-output.snap.md
│   └── fixtures/
│       ├── minimal/                     # Minimal valid config
│       ├── complete/                    # Full feature usage
│       ├── claude-code/                 # Claude Code specific
│       ├── mcp/                         # MCP specific
│       ├── multi-framework/             # Multiple frameworks
│       └── edge-cases/                  # Error conditions
└── vitest.config.ts
```

---

## 2. Verifiable Outcomes Matrix

Every feature must have measurable, testable outcomes.

### 2.1 Core Features

| Feature | Test Type | Verifiable Outcome | Automation Level | Priority |
|---------|-----------|-------------------|------------------|----------|
| **Claude Code Scanner** | Integration | Parses `.claude/` directory correctly | CI - Full | P0 |
| - Agent detection | Unit | Finds all `.md` files in `agents/` | CI - Full | P0 |
| - Skill detection | Unit | Parses YAML frontmatter in skills | CI - Full | P0 |
| - Hook detection | Unit | Identifies hook configurations | CI - Full | P0 |
| - Settings parsing | Unit | Reads `settings.json` correctly | CI - Full | P0 |
| - CLAUDE.md parsing | Unit | Extracts project instructions | CI - Full | P0 |
| **MCP Scanner** | Integration | Parses `.mcp.json` correctly | CI - Full | P0 |
| - Server inventory | Unit | Lists all MCP servers | CI - Full | P0 |
| - Tool detection | Unit | Identifies tools per server | CI - Full | P0 |
| **Component Map Diagram** | Snapshot | Valid Mermaid flowchart output | CI - Snapshot | P0 |
| - Node generation | Unit | Creates node for each component | CI - Full | P0 |
| - Edge generation | Unit | Creates edges for relationships | CI - Full | P0 |
| - Subgraph grouping | Unit | Groups by type (agents/skills/hooks) | CI - Full | P0 |
| **Workflow Sequence Diagram** | Snapshot | Valid Mermaid sequence output | CI - Snapshot | P0 |
| - Actor detection | Unit | Identifies User, Agent, Tool actors | CI - Full | P0 |
| - Message flow | Unit | Correct message ordering | CI - Full | P0 |
| **README.md Generator** | Snapshot | Valid markdown with embedded diagrams | CI - Snapshot | P1 |
| - TOC generation | Unit | Creates table of contents | CI - Full | P1 |
| - Summary section | Unit | Includes component counts | CI - Full | P1 |
| **AGENTS.md Generator** | Snapshot | Valid markdown with agent details | CI - Snapshot | P1 |
| - Agent tables | Unit | Creates formatted tables | CI - Full | P1 |
| - Skill references | Unit | Links skills to agents | CI - Full | P1 |
| **CLI: scan command** | E2E | Produces output directory | CI - E2E | P0 |
| - Output structure | E2E | Creates expected files | CI - E2E | P0 |
| - Exit codes | E2E | 0 on success, non-zero on error | CI - E2E | P0 |
| **CLI: diagram command** | E2E | Outputs specific diagram type | CI - E2E | P0 |
| - Type validation | Unit | Rejects invalid diagram types | CI - Full | P0 |

### 2.2 Validation Requirements

| Feature | Validation Rule | Test Approach |
|---------|-----------------|---------------|
| Mermaid output | Must render without errors | Mermaid.js validation in test |
| Markdown output | Must be valid GFM | Remark/unified validation |
| JSON output | Must match schema | Zod schema validation |
| File paths | Must be cross-platform | Test on Linux, macOS, Windows |
| Error messages | Must be actionable | Snapshot + manual review |

### 2.3 Performance Requirements

| Operation | Target | Test Approach |
|-----------|--------|---------------|
| Scan <50 components | <3 seconds | Performance test with timeout |
| Scan 50-200 components | <10 seconds | Performance test with timeout |
| Diagram generation | <500ms per diagram | Performance test with timeout |
| CLI startup | <500ms | E2E test with timing |

---

## 3. Automated Quality Gates

### 3.1 Quality Gate Matrix

| Gate | Tool | Threshold | Blocking | CI Stage |
|------|------|-----------|----------|----------|
| **TypeScript Compilation** | `tsc --noEmit` | 0 errors | Yes | Build |
| **ESLint** | `eslint` | 0 errors, 0 warnings | Yes | Lint |
| **Prettier** | `prettier --check` | All files formatted | Yes | Lint |
| **Unit Tests** | Vitest | 100% pass | Yes | Test |
| **Integration Tests** | Vitest | 100% pass | Yes | Test |
| **E2E Tests** | Vitest | 100% pass | Yes | Test |
| **Test Coverage - Statements** | Vitest/c8 | >80% | Yes | Test |
| **Test Coverage - Branches** | Vitest/c8 | >75% | Yes | Test |
| **Test Coverage - Functions** | Vitest/c8 | >80% | Yes | Test |
| **Snapshot Tests** | Vitest | Match or review | Soft | Test |
| **Security Audit** | `npm audit` | 0 high/critical | Yes | Security |
| **Dependency Check** | `depcheck` | No unused deps | Soft | Deps |
| **Bundle Size** | `size-limit` | <200KB gzipped | Soft | Build |

### 3.2 ESLint Configuration

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    rules: {
      // Strict rules for agent-generated code
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Code quality
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Complexity limits (flag for human review if exceeded)
      'complexity': ['warn', { max: 10 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', { max: 4 }],
    },
  }
);
```

### 3.3 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 3.4 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global setup
    globals: true,

    // Test file patterns
    include: [
      'src/**/__tests__/**/*.test.ts',
      'tests/**/*.test.ts'
    ],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds - fail CI if not met
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },

      // Files to include in coverage
      include: ['src/**/*.ts'],

      // Files to exclude from coverage
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/index.ts', // Re-export files
        'src/types/**',    // Type definitions
      ],
    },

    // Snapshot configuration
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },

    // Timeout for tests (agents should write fast tests)
    testTimeout: 10000,
    hookTimeout: 10000,

    // Watch mode (for development)
    watch: false,

    // Reporter
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json',
    },

    // Pool options
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
```

---

## 4. Human Review Triggers

### 4.1 Automatic Flagging Rules

The following conditions automatically flag a PR for human review:

| Trigger | Reason | Action |
|---------|--------|--------|
| **New file creation** | Verify file placement and necessity | Review file location |
| **Changes to public API** | Breaking change risk | Review API design |
| **Changes to config schemas** | User-facing impact | Review schema changes |
| **Test coverage drops >5%** | Quality regression | Review test adequacy |
| **Large PR (>500 lines changed)** | Difficult to review | Consider splitting |
| **Security-sensitive files** | High risk | Security review |
| **Complexity warnings** | Maintainability concern | Architecture review |
| **Snapshot test changes** | Output behavior changed | Verify intentional |
| **Dependency additions** | Supply chain risk | Review necessity |
| **Changes to CI/CD** | Infrastructure risk | DevOps review |

### 4.2 File Pattern Triggers

```yaml
# .github/CODEOWNERS or review triggers config
# Files that always require human review

# Security sensitive
/.env*                       @security-team
/**/credentials*             @security-team
/**/secrets*                 @security-team

# Public API
/src/index.ts                @api-reviewers
/src/types/public*.ts        @api-reviewers
/src/cli/commands/*.ts       @api-reviewers

# Configuration
/tsconfig.json               @maintainers
/package.json                @maintainers
/.github/**                  @maintainers
/vitest.config.ts            @maintainers
/eslint.config.js            @maintainers

# Schema definitions (user-facing)
/src/schemas/*.ts            @api-reviewers

# Test fixtures (data quality)
/tests/fixtures/**           @qa-team
```

### 4.3 GitHub Actions Review Triggers

```yaml
# .github/workflows/review-triggers.yml
name: Review Triggers

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check-review-triggers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for new files
        id: new-files
        run: |
          NEW_FILES=$(git diff --name-status origin/${{ github.base_ref }}...HEAD | grep "^A" | wc -l)
          echo "count=$NEW_FILES" >> $GITHUB_OUTPUT
          if [ "$NEW_FILES" -gt 0 ]; then
            echo "::warning::$NEW_FILES new files added - requires review of file placement"
          fi

      - name: Check PR size
        id: pr-size
        run: |
          LINES=$(git diff --stat origin/${{ github.base_ref }}...HEAD | tail -1 | awk '{print $4}')
          echo "lines=$LINES" >> $GITHUB_OUTPUT
          if [ "$LINES" -gt 500 ]; then
            echo "::warning::Large PR with $LINES lines changed - consider splitting"
          fi

      - name: Check for security-sensitive changes
        id: security
        run: |
          SECURITY_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E "(secret|credential|\.env|auth)" || true)
          if [ -n "$SECURITY_FILES" ]; then
            echo "::error::Security-sensitive files modified: $SECURITY_FILES"
            echo "flagged=true" >> $GITHUB_OUTPUT
          fi

      - name: Check for API changes
        id: api
        run: |
          API_CHANGES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E "(src/index\.ts|src/types/public)" || true)
          if [ -n "$API_CHANGES" ]; then
            echo "::warning::Public API changes detected - requires API review"
            echo "flagged=true" >> $GITHUB_OUTPUT
          fi

      - name: Check coverage delta
        id: coverage
        run: |
          # This would compare with base branch coverage
          # Simplified example
          echo "Checking coverage delta..."

      - name: Request review if needed
        if: steps.security.outputs.flagged == 'true' || steps.api.outputs.flagged == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.pulls.requestReviewers({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              reviewers: ['security-reviewer', 'api-reviewer']
            })
```

### 4.4 PR Template with Review Checklist

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## Description
<!-- Describe your changes -->

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] Coverage maintained or improved

## Quality Checklist
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] No `console.log` statements (use proper logging)
- [ ] No hardcoded values that should be configurable
- [ ] Error handling is comprehensive
- [ ] Types are properly defined (no `any`)

## Human Review Triggers
<!-- Check all that apply - these require human review -->
- [ ] New files created
- [ ] Public API changes
- [ ] Schema/configuration changes
- [ ] Security-sensitive changes
- [ ] >500 lines changed
- [ ] Snapshot tests changed
- [ ] Dependencies added/modified
- [ ] CI/CD changes

## Test Evidence
<!-- Paste test output or screenshot -->
```
npm run test
# Output here
```

## Documentation
- [ ] README updated (if needed)
- [ ] JSDoc comments added for public APIs
- [ ] CHANGELOG entry added (if user-facing change)
```

---

## 5. Test Structure Templates

### 5.1 Unit Test Template

```typescript
// src/parsers/__tests__/claude-code.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudeCodeParser } from '../claude-code';
import { createTestFixture, cleanupFixture } from '../../test-utils';
import type { ClaudeCodeConfig } from '../../types';

describe('ClaudeCodeParser', () => {
  let parser: ClaudeCodeParser;
  let fixturePath: string;

  beforeEach(async () => {
    parser = new ClaudeCodeParser();
    fixturePath = await createTestFixture('minimal-claude-code');
  });

  afterEach(async () => {
    await cleanupFixture(fixturePath);
    vi.restoreAllMocks();
  });

  describe('detect', () => {
    it('should return true when .claude directory exists', async () => {
      const result = await parser.detect(fixturePath);
      expect(result).toBe(true);
    });

    it('should return false when .claude directory does not exist', async () => {
      const emptyPath = await createTestFixture('empty');
      const result = await parser.detect(emptyPath);
      expect(result).toBe(false);
    });

    it('should return true when only CLAUDE.md exists', async () => {
      const claudeMdOnlyPath = await createTestFixture('claude-md-only');
      const result = await parser.detect(claudeMdOnlyPath);
      expect(result).toBe(true);
    });
  });

  describe('parse', () => {
    describe('agents', () => {
      it('should parse all agent files in agents/ directory', async () => {
        const config = await parser.parse(fixturePath);

        expect(config.agents).toHaveLength(2);
        expect(config.agents[0]).toMatchObject({
          name: expect.any(String),
          type: 'subagent',
          framework: 'claude-code',
        });
      });

      it('should extract agent metadata from frontmatter', async () => {
        const config = await parser.parse(fixturePath);
        const agent = config.agents.find(a => a.name === 'pm-agent');

        expect(agent).toBeDefined();
        expect(agent?.description).toBe('Product management specialist');
        expect(agent?.allowedTools).toContain('Read');
      });

      it('should handle agents without frontmatter', async () => {
        const noFrontmatterPath = await createTestFixture('agent-no-frontmatter');
        const config = await parser.parse(noFrontmatterPath);

        expect(config.agents).toHaveLength(1);
        expect(config.agents[0]?.name).toBe('simple-agent');
        expect(config.agents[0]?.description).toBe('');
      });
    });

    describe('skills', () => {
      it('should parse all skill files in skills/ directory', async () => {
        const config = await parser.parse(fixturePath);

        expect(config.skills).toHaveLength(3);
        expect(config.skills[0]).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
        });
      });

      it('should extract skill triggers from frontmatter', async () => {
        const config = await parser.parse(fixturePath);
        const skill = config.skills.find(s => s.name === 'code-review');

        expect(skill?.triggers).toContain('/review');
      });
    });

    describe('hooks', () => {
      it('should parse hooks from settings.json', async () => {
        const config = await parser.parse(fixturePath);

        expect(config.hooks).toBeDefined();
        expect(config.hooks).toHaveLength(1);
        expect(config.hooks[0]?.event).toBe('PreToolUse');
      });
    });

    describe('error handling', () => {
      it('should throw ParseError for invalid YAML frontmatter', async () => {
        const invalidYamlPath = await createTestFixture('invalid-yaml');

        await expect(parser.parse(invalidYamlPath)).rejects.toThrow('ParseError');
      });

      it('should warn but continue for missing referenced skills', async () => {
        const missingRefPath = await createTestFixture('missing-skill-ref');
        const config = await parser.parse(missingRefPath);

        expect(config.warnings).toHaveLength(1);
        expect(config.warnings[0]).toContain('referenced skill not found');
      });
    });
  });
});
```

### 5.2 Integration Test Template

```typescript
// tests/integration/scan.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scan } from '../../src';
import { createTempProject, cleanupTempProject } from '../helpers';
import path from 'path';
import fs from 'fs-extra';

describe('scan command integration', () => {
  let projectPath: string;
  let outputPath: string;

  beforeAll(async () => {
    projectPath = await createTempProject('complete-claude-code');
    outputPath = path.join(projectPath, 'docs', 'agent-architecture');
  });

  afterAll(async () => {
    await cleanupTempProject(projectPath);
  });

  describe('full scan workflow', () => {
    it('should create output directory structure', async () => {
      await scan({
        projectPath,
        outputPath,
      });

      expect(await fs.pathExists(outputPath)).toBe(true);
      expect(await fs.pathExists(path.join(outputPath, 'README.md'))).toBe(true);
      expect(await fs.pathExists(path.join(outputPath, 'AGENTS.md'))).toBe(true);
    });

    it('should generate valid Mermaid diagrams', async () => {
      const result = await scan({
        projectPath,
        outputPath,
      });

      const readme = await fs.readFile(path.join(outputPath, 'README.md'), 'utf-8');

      // Check for Mermaid code blocks
      expect(readme).toContain('```mermaid');
      expect(readme).toContain('flowchart');

      // Validate Mermaid syntax (basic check)
      const mermaidBlocks = readme.match(/```mermaid\n([\s\S]*?)```/g);
      expect(mermaidBlocks).not.toBeNull();
      expect(mermaidBlocks!.length).toBeGreaterThan(0);
    });

    it('should include all detected components', async () => {
      const result = await scan({
        projectPath,
        outputPath,
      });

      expect(result.summary.agents).toBe(2);
      expect(result.summary.skills).toBe(3);
      expect(result.summary.hooks).toBe(1);
      expect(result.summary.mcpServers).toBe(2);
    });

    it('should complete within performance budget', async () => {
      const start = performance.now();

      await scan({
        projectPath,
        outputPath,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3000); // 3 second budget
    });
  });

  describe('error scenarios', () => {
    it('should handle missing .claude directory gracefully', async () => {
      const emptyProject = await createTempProject('empty');

      const result = await scan({
        projectPath: emptyProject,
        outputPath: path.join(emptyProject, 'output'),
      });

      expect(result.warnings).toContain('No agent configurations found');
      expect(result.summary.agents).toBe(0);

      await cleanupTempProject(emptyProject);
    });

    it('should report invalid configurations', async () => {
      const invalidProject = await createTempProject('invalid-config');

      const result = await scan({
        projectPath: invalidProject,
        outputPath: path.join(invalidProject, 'output'),
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid');

      await cleanupTempProject(invalidProject);
    });
  });
});
```

### 5.3 E2E Test Template

```typescript
// tests/e2e/cli-scan.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { createTempProject, cleanupTempProject } from '../helpers';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');

describe('CLI: agentscope scan', () => {
  let projectPath: string;

  const execOptions: ExecSyncOptionsWithStringEncoding = {
    encoding: 'utf-8',
    timeout: 30000,
  };

  beforeAll(async () => {
    projectPath = await createTempProject('complete-claude-code');
    // Ensure CLI is built
    execSync('npm run build', { cwd: path.resolve(__dirname, '../..') });
  });

  afterAll(async () => {
    await cleanupTempProject(projectPath);
  });

  describe('basic usage', () => {
    it('should run scan command successfully', () => {
      const result = execSync(
        `node ${CLI_PATH} scan`,
        { ...execOptions, cwd: projectPath }
      );

      expect(result).toContain('Scan completed');
    });

    it('should exit with code 0 on success', () => {
      let exitCode = 0;
      try {
        execSync(`node ${CLI_PATH} scan`, { ...execOptions, cwd: projectPath });
      } catch (error: any) {
        exitCode = error.status;
      }

      expect(exitCode).toBe(0);
    });

    it('should create output directory with expected files', () => {
      execSync(`node ${CLI_PATH} scan`, { ...execOptions, cwd: projectPath });

      const outputDir = path.join(projectPath, 'docs', 'agent-architecture');

      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'AGENTS.md'))).toBe(true);
    });
  });

  describe('CLI options', () => {
    it('should respect --output option', () => {
      const customOutput = path.join(projectPath, 'custom-output');

      execSync(
        `node ${CLI_PATH} scan --output ${customOutput}`,
        { ...execOptions, cwd: projectPath }
      );

      expect(fs.existsSync(customOutput)).toBe(true);
      expect(fs.existsSync(path.join(customOutput, 'README.md'))).toBe(true);
    });

    it('should support --format json option', () => {
      const result = execSync(
        `node ${CLI_PATH} scan --format json`,
        { ...execOptions, cwd: projectPath }
      );

      const json = JSON.parse(result);
      expect(json).toHaveProperty('agents');
      expect(json).toHaveProperty('skills');
    });

    it('should show help with --help', () => {
      const result = execSync(
        `node ${CLI_PATH} scan --help`,
        execOptions
      );

      expect(result).toContain('Usage:');
      expect(result).toContain('--output');
      expect(result).toContain('--format');
    });
  });

  describe('error handling', () => {
    it('should exit with non-zero code for invalid directory', () => {
      let exitCode = 0;
      try {
        execSync(
          `node ${CLI_PATH} scan --path /nonexistent/path`,
          execOptions
        );
      } catch (error: any) {
        exitCode = error.status;
      }

      expect(exitCode).not.toBe(0);
    });

    it('should display user-friendly error message', () => {
      let errorOutput = '';
      try {
        execSync(
          `node ${CLI_PATH} scan --path /nonexistent/path`,
          { ...execOptions, stdio: 'pipe' }
        );
      } catch (error: any) {
        errorOutput = error.stderr || error.stdout;
      }

      expect(errorOutput).toContain('Error');
      expect(errorOutput).not.toContain('stack');
    });
  });
});
```

### 5.4 Snapshot Test Template

```typescript
// tests/snapshots/diagrams.snap.ts
import { describe, it, expect } from 'vitest';
import { generateComponentMap, generateWorkflowSequence } from '../../src/generators/mermaid';
import { createMockConfig } from '../helpers';

describe('Diagram Snapshots', () => {
  describe('Component Map', () => {
    it('should match snapshot for minimal config', () => {
      const config = createMockConfig('minimal');
      const diagram = generateComponentMap(config);

      expect(diagram).toMatchSnapshot();
    });

    it('should match snapshot for complete config', () => {
      const config = createMockConfig('complete');
      const diagram = generateComponentMap(config);

      expect(diagram).toMatchSnapshot();
    });

    it('should match snapshot for multi-agent config', () => {
      const config = createMockConfig('multi-agent');
      const diagram = generateComponentMap(config);

      expect(diagram).toMatchSnapshot();
    });
  });

  describe('Workflow Sequence', () => {
    it('should match snapshot for simple workflow', () => {
      const config = createMockConfig('simple-workflow');
      const diagram = generateWorkflowSequence(config);

      expect(diagram).toMatchSnapshot();
    });

    it('should match snapshot for complex workflow with hooks', () => {
      const config = createMockConfig('workflow-with-hooks');
      const diagram = generateWorkflowSequence(config);

      expect(diagram).toMatchSnapshot();
    });
  });
});
```

---

## 6. Quality Metrics Dashboard

### 6.1 Metrics to Track

| Metric | Target | Warning Threshold | Source |
|--------|--------|-------------------|--------|
| **Test Coverage** | >80% | <75% | Vitest/c8 |
| **Build Success Rate** | >99% | <95% | GitHub Actions |
| **Test Pass Rate** | 100% | <100% | GitHub Actions |
| **Time to Fix Failing Test** | <4 hours | >8 hours | GitHub Issues |
| **PR Review Turnaround** | <24 hours | >48 hours | GitHub PRs |
| **Snapshot Update Frequency** | Track | High frequency = concern | Git history |
| **Security Vulnerabilities** | 0 high/critical | Any high | npm audit |
| **Technical Debt** | Decreasing | Increasing | SonarQube/CodeClimate |

### 6.2 Dashboard Configuration

```yaml
# sonarcloud.properties or similar
sonar.projectKey=agentscope
sonar.organization=your-org

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# Quality Gates
sonar.qualitygate.wait=true

# Thresholds
sonar.coverage.exclusions=**/*.test.ts,**/test/**,**/fixtures/**
```

### 6.3 GitHub Actions Badge Configuration

```markdown
<!-- README.md badges -->
[![Build Status](https://github.com/org/agentscope/actions/workflows/ci.yml/badge.svg)](https://github.com/org/agentscope/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/org/agentscope/branch/main/graph/badge.svg)](https://codecov.io/gh/org/agentscope)
[![npm version](https://badge.fury.io/js/agentscope.svg)](https://badge.fury.io/js/agentscope)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### 6.4 Weekly Quality Report Template

```markdown
## Weekly Quality Report - [Date]

### Coverage Trends
| Week | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| W-2  | 78%        | 72%      | 75%       | 77%   |
| W-1  | 80%        | 74%      | 78%       | 79%   |
| Now  | 82%        | 76%      | 80%       | 81%   |

### Build Health
- Total builds: 47
- Successful: 45 (95.7%)
- Failed: 2 (4.3%)
  - Cause 1: Flaky test in integration suite
  - Cause 2: npm registry timeout

### Human Review Summary
- PRs requiring review: 8
- Average review time: 18 hours
- Triggers:
  - New files: 3
  - API changes: 2
  - Security files: 1
  - Large PRs: 2

### Action Items
1. [ ] Fix flaky integration test
2. [ ] Increase branch coverage (target: 80%)
3. [ ] Reduce average PR review time
```

---

## 7. Pre-commit Hooks

### 7.1 Husky Configuration

```bash
# Install husky
npm install -D husky lint-staged

# Initialize husky
npx husky init
```

### 7.2 Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Run lint-staged (linting + formatting on staged files)
npx lint-staged

# Type check changed files
echo "Type checking..."
npx tsc --noEmit

# Run tests for changed files
echo "Running affected tests..."
npx vitest related --run
```

### 7.3 Lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.ts": [
      "vitest related --run"
    ]
  }
}
```

### 7.4 Pre-push Hook

```bash
#!/bin/sh
# .husky/pre-push

# Full test suite before push
echo "Running full test suite..."
npm run test

# Check coverage thresholds
echo "Checking coverage thresholds..."
npm run test:coverage

# Security audit
echo "Running security audit..."
npm audit --audit-level=high
```

### 7.5 Commit Message Hook

```bash
#!/bin/sh
# .husky/commit-msg

# Validate commit message format
npx --no -- commitlint --edit $1
```

### 7.6 Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code restructure
        'perf',     // Performance
        'test',     // Tests
        'chore',    // Maintenance
        'ci',       // CI/CD
        'revert',   // Revert
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

---

## 8. GitHub Actions Workflow

### 8.1 Complete CI/CD Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ============================================
  # STAGE 1: Quick Checks (< 1 min)
  # ============================================
  quick-checks:
    name: Quick Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript compile check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint

      - name: Prettier check
        run: npm run format:check

  # ============================================
  # STAGE 2: Unit Tests (< 2 min)
  # ============================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: quick-checks
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: unit
          fail_ci_if_error: true

  # ============================================
  # STAGE 3: Integration Tests (< 5 min)
  # ============================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: integration

  # ============================================
  # STAGE 4: E2E Tests (< 5 min)
  # ============================================
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-failure-logs
          path: test-results/

  # ============================================
  # STAGE 5: Security Scan
  # ============================================
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: quick-checks
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified

  # ============================================
  # STAGE 6: Coverage Report
  # ============================================
  coverage-report:
    name: Coverage Report
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run all tests with coverage
        run: npm run test:coverage

      - name: Check coverage thresholds
        run: |
          npx c8 check-coverage \
            --statements 80 \
            --branches 75 \
            --functions 80 \
            --lines 80

      - name: Coverage Report
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

  # ============================================
  # STAGE 7: Build Artifacts
  # ============================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests, security]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: npx size-limit

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # ============================================
  # STAGE 8: Cross-Platform Tests
  # ============================================
  cross-platform:
    name: Cross-Platform (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    needs: build
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm run test:unit

  # ============================================
  # FINAL: Quality Gate
  # ============================================
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: [coverage-report, build, cross-platform, security]
    steps:
      - name: Quality Gate Passed
        run: echo "All quality gates passed!"
```

### 8.2 Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --dir src",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "vitest run --dir tests/e2e",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml",
    "typecheck": "tsc --noEmit",
    "prepare": "husky install",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

---

## 9. Test Fixture Strategy

### 9.1 Fixture Categories

```
tests/fixtures/
├── minimal/                    # Simplest valid configuration
│   ├── .claude/
│   │   └── settings.json
│   └── CLAUDE.md
│
├── complete/                   # All features used
│   ├── .claude/
│   │   ├── settings.json
│   │   ├── agents/
│   │   │   ├── pm-agent.md
│   │   │   └── dev-agent.md
│   │   ├── skills/
│   │   │   ├── code-review/
│   │   │   │   └── SKILL.md
│   │   │   └── testing/
│   │   │       └── SKILL.md
│   │   └── commands/
│   │       └── analyze.md
│   ├── .mcp.json
│   └── CLAUDE.md
│
├── claude-code/                # Claude Code specific scenarios
│   ├── agents-only/
│   ├── skills-only/
│   ├── hooks-configured/
│   └── complex-hierarchy/
│
├── mcp/                        # MCP specific scenarios
│   ├── single-server/
│   ├── multiple-servers/
│   └── server-with-tools/
│
├── edge-cases/                 # Error conditions
│   ├── invalid-yaml/
│   ├── missing-required/
│   ├── circular-reference/
│   ├── empty-files/
│   └── very-large/
│
└── snapshots/                  # Expected output snapshots
    ├── component-map-minimal.md
    ├── component-map-complete.md
    └── readme-complete.md
```

### 9.2 Fixture Helper Functions

```typescript
// tests/helpers/fixtures.ts
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

/**
 * Creates a temporary copy of a fixture for testing
 */
export async function createTestFixture(fixtureName: string): Promise<string> {
  const fixturePath = path.join(FIXTURES_DIR, fixtureName);

  if (!await fs.pathExists(fixturePath)) {
    throw new Error(`Fixture not found: ${fixtureName}`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentscope-test-'));
  await fs.copy(fixturePath, tempDir);

  return tempDir;
}

/**
 * Cleans up a temporary fixture directory
 */
export async function cleanupFixture(fixturePath: string): Promise<void> {
  if (fixturePath.includes('agentscope-test-')) {
    await fs.remove(fixturePath);
  }
}

/**
 * Creates a temporary empty project
 */
export async function createTempProject(template?: string): Promise<string> {
  if (template) {
    return createTestFixture(template);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentscope-test-'));
  return tempDir;
}

/**
 * Creates mock config objects for testing
 */
export function createMockConfig(type: 'minimal' | 'complete' | 'multi-agent' | 'simple-workflow' | 'workflow-with-hooks'): UnifiedConfig {
  const configs = {
    minimal: {
      meta: { name: 'test-project', version: '1.0.0', scanDate: new Date().toISOString() },
      agents: [{ name: 'default-agent', type: 'primary', framework: 'claude-code', skills: [], hooks: [] }],
      skills: [],
      hooks: [],
      mcpServers: [],
      workflows: [],
    },
    complete: {
      // Full configuration...
    },
    // Other types...
  };

  return configs[type] as UnifiedConfig;
}
```

---

## 10. Agent Testing Protocol

### 10.1 Instructions for AI Agents

When an AI agent is assigned a coding task, it MUST follow this protocol:

```markdown
## Agent Testing Protocol

### Before Writing Any Implementation Code

1. **Read the specification completely**
   - Understand inputs, outputs, and edge cases
   - Identify error conditions
   - Note performance requirements

2. **Check for existing tests**
   - Search for related test files
   - Understand current coverage
   - Identify gaps

3. **Write tests FIRST**
   - Create test file if it doesn't exist
   - Write tests that define expected behavior
   - Include at minimum:
     - Happy path test
     - Error condition test
     - Edge case test

4. **Verify tests fail (RED)**
   - Run `npm run test:unit -- [test-file]`
   - Confirm tests fail for the right reasons
   - Screenshot/log the failure

### During Implementation

5. **Write minimal code**
   - Implement just enough to pass tests
   - Do not add features not covered by tests
   - Do not "over-engineer"

6. **Run tests frequently**
   - After each significant change, run tests
   - Keep track of which tests pass

### After Implementation

7. **Verify tests pass (GREEN)**
   - Run full test suite: `npm run test`
   - Ensure coverage is maintained: `npm run test:coverage`
   - No existing tests should break

8. **Refactor if needed**
   - Improve code quality
   - Tests must still pass
   - Do not change behavior

9. **Document test results**
   - Include test run output in PR
   - Note any skipped or pending tests
   - Explain test coverage decisions

### Commit Requirements

10. **Commit message must reference tests**
    - Example: "feat(parser): add claude-code agent detection - tests included"
    - Never commit without tests

11. **PR description must include**
    - Test coverage summary
    - New tests added
    - Test run results
```

### 10.2 Quality Verification Checklist

Before submitting code, agents must verify:

```markdown
## Agent Quality Checklist

### Tests
- [ ] Tests written BEFORE implementation
- [ ] All new tests pass
- [ ] All existing tests pass
- [ ] Coverage >= 80%
- [ ] No skipped tests without reason

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] No `any` types
- [ ] No `console.log` statements
- [ ] Error handling is comprehensive

### Documentation
- [ ] JSDoc for public APIs
- [ ] README updated if needed
- [ ] Test descriptions are clear

### Performance
- [ ] No unnecessary loops
- [ ] No memory leaks
- [ ] Meets performance budget

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No path traversal vulnerabilities
```

### 10.3 Test Coverage Requirements by File Type

| File Type | Minimum Coverage | Test Approach |
|-----------|------------------|---------------|
| Parsers (`src/parsers/`) | 90% | Unit + Integration |
| Generators (`src/generators/`) | 85% | Unit + Snapshot |
| Model (`src/model/`) | 95% | Unit |
| CLI Commands (`src/cli/`) | 80% | Unit + E2E |
| Utilities (`src/utils/`) | 90% | Unit |

---

## Summary

This TDD and Quality Control Framework provides:

1. **Structured TDD workflow** that agents must follow
2. **Verifiable outcomes** for every feature
3. **Automated quality gates** with specific thresholds
4. **Human review triggers** for exceptional cases
5. **Complete test templates** for all test types
6. **Pre-commit hooks** for immediate feedback
7. **CI/CD workflow** for automated verification

**Key Principles**:
- Tests BEFORE code (enforced)
- Automated gates catch 95% of issues
- Human review only for flagged conditions
- Every feature has measurable success criteria
- Coverage thresholds are non-negotiable

This framework ensures that even with rapid agentic development, code quality remains high and human reviewers focus on what matters most.

---

*Document Version: 1.0 | January 2026 | TDD & Quality Framework*
