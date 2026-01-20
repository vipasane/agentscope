# Component Solutions Analysis for AgentScope

> **Research Document** | January 2026 | Component-Based Architecture Analysis

## Executive Summary

This document analyzes existing npm packages and libraries that can be assembled to build AgentScope without creating a monolithic tool from scratch. By leveraging battle-tested components, we can reduce development time by 60-70%, improve reliability, and focus custom code on the unique value proposition: understanding multi-framework agent configurations.

**Key Finding**: All six core needs of AgentScope can be addressed with mature, well-maintained npm packages. Only the "glue code" and agent-specific parsing logic requires custom development.

---

## Table of Contents

1. [Config Parsing Solutions](#1-config-parsing-solutions)
2. [Diagram Generation Solutions](#2-diagram-generation-solutions)
3. [Documentation Generation Solutions](#3-documentation-generation-solutions)
4. [File Operations Solutions](#4-file-operations-solutions)
5. [CLI Framework Solutions](#5-cli-framework-solutions)
6. [Schema/Validation Solutions](#6-schemavalidation-solutions)
7. [Assembly Proposal](#7-assembly-proposal)
8. [Recommended Stack](#8-recommended-stack)

---

## 1. Config Parsing Solutions

AgentScope needs to parse YAML, JSON, Markdown with frontmatter, and potentially TOML from various configuration files.

### 1.1 YAML Parsing

#### js-yaml (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [js-yaml](https://www.npmjs.com/package/js-yaml) |
| **Weekly Downloads** | ~119.7 million |
| **GitHub Stars** | 6,498 |
| **Latest Version** | 4.1.1 |
| **Maintenance** | Active (updated 2 months ago) |
| **License** | MIT |

**How it fits AgentScope**: Primary YAML parser for BMad agent configs, Claude Code settings, and workflow definitions.

**Code Example**:
```typescript
import yaml from 'js-yaml';
import { readFileSync } from 'fs';

// Parse agent configuration
const agentConfig = yaml.load(
  readFileSync('.claude/agents/pm-agent.yaml', 'utf8')
) as AgentDefinition;

// Parse with custom types for agent-specific schemas
const AGENT_SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('!agent', {
    kind: 'mapping',
    construct: (data) => ({ type: 'agent', ...data })
  })
]);

const extendedConfig = yaml.load(content, { schema: AGENT_SCHEMA });
```

#### yaml (Alternative)

| Attribute | Value |
|-----------|-------|
| **npm package** | [yaml](https://www.npmjs.com/package/yaml) |
| **Weekly Downloads** | ~68.1 million |
| **GitHub Stars** | 1,200+ |
| **Latest Version** | 2.x |
| **Maintenance** | Very Active |

**When to use**: If you need YAML 1.2 compliance, better TypeScript types, or document preservation (comments, formatting).

```typescript
import { parse, parseDocument, stringify } from 'yaml';

// Preserve comments when reading/writing
const doc = parseDocument(yamlContent);
doc.set('newKey', 'newValue');
const output = doc.toString(); // Comments preserved
```

---

### 1.2 Frontmatter Parsing (Markdown + YAML)

#### gray-matter (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [gray-matter](https://www.npmjs.com/package/gray-matter) |
| **Weekly Downloads** | ~3 million |
| **GitHub Stars** | 3,800+ |
| **Latest Version** | 4.0.3 |
| **Maintenance** | Stable (battle-tested) |
| **License** | MIT |

**How it fits AgentScope**: Parse CLAUDE.md, SKILL.md files, and any markdown with frontmatter metadata.

**Code Example**:
```typescript
import matter from 'gray-matter';

// Parse skill definition
const skillFile = matter(readFileSync('.claude/skills/code-review/SKILL.md', 'utf8'));

const skillMeta = skillFile.data as SkillMetadata;
// { name: 'code-review', description: '...', allowed-tools: ['Read', 'Write'] }

const skillContent = skillFile.content;
// The markdown body after frontmatter

// Custom delimiters for non-standard formats
const customParsed = matter(content, {
  delimiters: ['~~~', '~~~'], // Custom delimiter support
  engines: {
    toml: (str) => toml.parse(str), // TOML frontmatter
  }
});
```

**Notable Users**: Gatsby, Netlify, Astro, VitePress, TinaCMS, Shopify Polaris

---

### 1.3 TOML Parsing

#### smol-toml (Recommended for Modern Projects)

| Attribute | Value |
|-----------|-------|
| **npm package** | [smol-toml](https://www.npmjs.com/package/smol-toml) |
| **Weekly Downloads** | ~24 million |
| **Latest Version** | 1.6.0 |
| **Maintenance** | Active (updated 24 days ago) |
| **TOML Spec** | 1.0.0 (latest) |

**Code Example**:
```typescript
import { parse, stringify } from 'smol-toml';

const config = parse(readFileSync('pyproject.toml', 'utf8'));
```

#### js-toml (Alternative)

| Attribute | Value |
|-----------|-------|
| **npm package** | [js-toml](https://www.npmjs.com/package/js-toml) |
| **Weekly Downloads** | Lower but growing |
| **Maintenance** | Active |
| **TOML Spec** | 1.0.0 |

**Notable**: Trusted by Microsoft (pyright), AWS, MongoDB

---

### 1.4 JSON Parsing

Built into Node.js, but for streaming large files or JSON5 support:

#### json5

| Attribute | Value |
|-----------|-------|
| **npm package** | [json5](https://www.npmjs.com/package/json5) |
| **Weekly Downloads** | ~60 million |
| **Use Case** | Parse JSON with comments (common in configs) |

```typescript
import JSON5 from 'json5';

// Parse .mcp.json that might have comments
const mcpConfig = JSON5.parse(readFileSync('.mcp.json', 'utf8'));
```

---

## 2. Diagram Generation Solutions

### 2.1 Mermaid.js (Core Library)

| Attribute | Value |
|-----------|-------|
| **npm package** | [mermaid](https://www.npmjs.com/package/mermaid) |
| **Weekly Downloads** | ~2 million |
| **GitHub Stars** | 75,000+ |
| **Latest Version** | 11.12.2 |
| **Maintenance** | Very Active |
| **License** | MIT |

**How it fits AgentScope**: Generate all diagram types (flowchart, sequence, state, etc.) from parsed agent configurations.

**Code Example**:
```typescript
// For Node.js rendering, use mermaid-isomorphic
import { Mermaid } from 'mermaid-isomorphic';

const mermaid = new Mermaid();

// Generate flowchart from agent data
function generateAgentHierarchy(agents: Agent[]): string {
  const lines = ['flowchart TB'];

  agents.forEach(agent => {
    lines.push(`    ${agent.id}[${agent.name}]`);
    agent.skills?.forEach(skill => {
      lines.push(`    ${agent.id} --> ${skill.id}`);
    });
  });

  return lines.join('\n');
}

const diagram = generateAgentHierarchy(parsedAgents);
// flowchart TB
//     pm-agent[PM Agent]
//     pm-agent --> prd-skill
//     dev-agent[Dev Agent]
//     dev-agent --> code-skill
```

### 2.2 Mermaid CLI

| Attribute | Value |
|-----------|-------|
| **npm package** | [@mermaid-js/mermaid-cli](https://www.npmjs.com/package/@mermaid-js/mermaid-cli) |
| **GitHub** | [mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli) |
| **Use Case** | Command-line rendering to SVG/PNG/PDF |

```bash
# Render diagram to PNG
npx mmdc -i diagram.mmd -o diagram.png -t dark
```

### 2.3 mermaid-isomorphic (Node.js Rendering)

| Attribute | Value |
|-----------|-------|
| **npm package** | [mermaid-isomorphic](https://www.npmjs.com/package/mermaid-isomorphic) |
| **Use Case** | Server-side rendering without browser |
| **Dependency** | Requires Playwright |

```typescript
import { compile, run } from 'mermaid-isomorphic';

const { svg } = await run(compile(mermaidCode));
await writeFile('output.svg', svg);
```

### 2.4 Existing Mermaid MCP Servers

Several MCP servers already exist for Mermaid diagram generation:

| Server | GitHub | Features |
|--------|--------|----------|
| **mermaid-mcp-server** | [peng-shawn/mermaid-mcp-server](https://github.com/peng-shawn/mermaid-mcp-server) | PNG/SVG output, multiple themes |
| **mcp-mermaid** | [hustcc/mcp-mermaid](https://github.com/hustcc/mcp-mermaid) | Base64, SVG, file output, validation |
| **claude-mermaid** | [veelenga/claude-mermaid](https://github.com/veelenga/claude-mermaid) | Live reload, Claude Code skill |
| **mcp_mermaid_image_gen** | [codingthefuturewithai/mcp_mermaid_image_gen](https://github.com/codingthefuturewithai/mcp_mermaid_image_gen) | PNG, PDF, SVG with themes |

**Integration Option**: AgentScope could leverage an existing MCP server rather than implementing rendering from scratch.

---

## 3. Documentation Generation Solutions

### 3.1 Markdown Writing

#### markdown-it (Recommended for Parsing/Rendering)

| Attribute | Value |
|-----------|-------|
| **npm package** | [markdown-it](https://www.npmjs.com/package/markdown-it) |
| **Weekly Downloads** | ~6.7 million |
| **GitHub Stars** | 18,000+ |
| **Latest Version** | 14.1.0 |
| **Maintenance** | Active |

**How it fits AgentScope**: Parse existing markdown docs, validate syntax, transform content.

```typescript
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// Render markdown to HTML for preview
const html = md.render(markdownContent);

// Use plugins for extended syntax
import markdownItMermaid from 'markdown-it-mermaid';
md.use(markdownItMermaid);
```

### 3.2 Unified/Remark Ecosystem (Recommended for Transformation)

| Attribute | Value |
|-----------|-------|
| **npm package** | [unified](https://www.npmjs.com/package/unified) / [remark](https://www.npmjs.com/package/remark) |
| **Weekly Downloads** | unified: ~20M, remark: ~8M |
| **GitHub Stars** | 4,500+ (unified) |
| **Maintenance** | Very Active |

**How it fits AgentScope**: Programmatically build, transform, and output markdown documentation.

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';

// Parse and transform markdown
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm) // GitHub Flavored Markdown
  .use(remarkStringify);

// Build markdown AST programmatically
import { u } from 'unist-builder';

function generateAgentDoc(agent: Agent) {
  return u('root', [
    u('heading', { depth: 1 }, [u('text', agent.name)]),
    u('paragraph', [u('text', agent.description)]),
    u('heading', { depth: 2 }, [u('text', 'Skills')]),
    u('list', { ordered: false },
      agent.skills.map(skill =>
        u('listItem', [u('text', skill.name)])
      )
    ),
    // Embed mermaid diagram
    u('code', { lang: 'mermaid' }, generateSkillDiagram(agent))
  ]);
}

const doc = generateAgentDoc(myAgent);
const markdown = processor.stringify(doc);
```

**Key Plugins**:
- `remark-gfm` - GitHub Flavored Markdown (tables, strikethrough)
- `remark-frontmatter` - YAML frontmatter support
- `remark-toc` - Auto-generate table of contents
- `remark-mermaid` - Mermaid diagram support

### 3.3 Template Engines

#### Handlebars (Recommended for Complex Templates)

| Attribute | Value |
|-----------|-------|
| **npm package** | [handlebars](https://www.npmjs.com/package/handlebars) |
| **Weekly Downloads** | ~12 million |
| **GitHub Stars** | 18,000+ |
| **Latest Version** | 4.7.8 |

**How it fits AgentScope**: Generate documentation from templates with agent data.

```typescript
import Handlebars from 'handlebars';

// Template for agent documentation
const agentTemplate = Handlebars.compile(`
# {{name}}

> {{description}}

## Overview

| Property | Value |
|----------|-------|
| Type | {{type}} |
| Framework | {{framework}} |
| Skills | {{skills.length}} |

## Skills

{{#each skills}}
### {{this.name}}

{{this.description}}

**Allowed Tools**: {{join this.allowedTools ", "}}

{{/each}}

## Architecture Diagram

\`\`\`mermaid
{{{mermaidDiagram}}}
\`\`\`
`);

// Register custom helpers
Handlebars.registerHelper('join', (arr, sep) => arr.join(sep));

// Generate documentation
const doc = agentTemplate({
  name: 'PM Agent',
  description: 'Product management specialist',
  type: 'subagent',
  framework: 'claude-code',
  skills: [...],
  mermaidDiagram: generateDiagram(agent)
});
```

#### EJS (Alternative - Simpler Syntax)

| Attribute | Value |
|-----------|-------|
| **npm package** | [ejs](https://www.npmjs.com/package/ejs) |
| **Weekly Downloads** | ~15 million |
| **Use Case** | When you want JavaScript logic in templates |

```typescript
import ejs from 'ejs';

const template = `
# <%= name %>

<% skills.forEach(skill => { %>
## <%= skill.name %>
<%= skill.description %>
<% }); %>
`;

const doc = ejs.render(template, agentData);
```

**Recommendation**: Use **Handlebars** for complex documentation templates (logic-less, partials support) and **unified/remark** for programmatic markdown generation.

---

## 4. File Operations Solutions

### 4.1 File Pattern Matching

#### globby (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [globby](https://www.npmjs.com/package/globby) |
| **Weekly Downloads** | ~90 million |
| **GitHub Stars** | 2,500+ |
| **Latest Version** | 15.0.0 |
| **Maintenance** | Active |

**How it fits AgentScope**: Discover all agent configuration files across multiple directories.

```typescript
import { globby } from 'globby';

// Find all agent-related files
const agentFiles = await globby([
  // Claude Code
  '.claude/agents/**/*.{yaml,yml,md}',
  '.claude/skills/**/*.md',
  '.claude/commands/**/*.md',
  'CLAUDE.md',

  // BMad
  '_bmad/**/*.yaml',
  '.bmad-core/**/*.yaml',

  // MCP
  '.mcp.json',
  '**/mcp.json',

  // Gemini
  'GEMINI.md',
  '.gemini/**/*',

  // Negative patterns
  '!node_modules/**',
  '!**/dist/**'
], {
  gitignore: true,       // Respect .gitignore
  dot: true,             // Include dotfiles
  absolute: true,        // Return absolute paths
  onlyFiles: true
});

// Group by framework
const filesByFramework = groupFiles(agentFiles);
```

#### fast-glob (Alternative - Maximum Performance)

| Attribute | Value |
|-----------|-------|
| **npm package** | [fast-glob](https://www.npmjs.com/package/fast-glob) |
| **Weekly Downloads** | ~80 million |
| **Performance** | 10-20% faster than glob |

```typescript
import fg from 'fast-glob';

const files = await fg(['**/*.yaml'], {
  cwd: projectRoot,
  ignore: ['node_modules/**']
});
```

**Recommendation**: Use **globby** for its user-friendly API and .gitignore support. Use **fast-glob** only if you need maximum performance for very large directories.

### 4.2 File System Operations

#### fs-extra (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [fs-extra](https://www.npmjs.com/package/fs-extra) |
| **Weekly Downloads** | ~50+ million |
| **GitHub Stars** | 9,500+ |
| **Latest Version** | 11.x |
| **Maintenance** | Active |

**How it fits AgentScope**: Read configs, write documentation, manage output directories.

```typescript
import fs from 'fs-extra';

// Ensure output directory exists
await fs.ensureDir('docs/agent-architecture');

// Copy template files
await fs.copy('templates/', 'docs/agent-architecture/', {
  filter: (src) => !src.includes('.DS_Store')
});

// Write generated documentation
await fs.outputFile(
  'docs/agent-architecture/AGENTS.md',
  generatedMarkdown
);

// Read JSON with automatic parsing
const mcpConfig = await fs.readJson('.mcp.json');

// Write JSON with formatting
await fs.writeJson('output/config.json', data, { spaces: 2 });
```

### 4.3 File Watching

#### chokidar (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [chokidar](https://www.npmjs.com/package/chokidar) |
| **Weekly Downloads** | ~50+ million |
| **GitHub Stars** | 11,000+ |
| **Latest Version** | 5.0.0 |
| **Maintenance** | Active |

**How it fits AgentScope**: Watch mode for automatic documentation regeneration.

```typescript
import chokidar from 'chokidar';

// Watch agent configuration files
const watcher = chokidar.watch([
  '.claude/**/*',
  '_bmad/**/*',
  '.mcp.json',
  'CLAUDE.md'
], {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

watcher
  .on('change', async (path) => {
    console.log(`Config changed: ${path}`);
    await regenerateDocumentation();
  })
  .on('add', async (path) => {
    console.log(`New config: ${path}`);
    await regenerateDocumentation();
  })
  .on('unlink', async (path) => {
    console.log(`Config removed: ${path}`);
    await regenerateDocumentation();
  });
```

---

## 5. CLI Framework Solutions

### 5.1 Commander.js (Recommended)

| Attribute | Value |
|-----------|-------|
| **npm package** | [commander](https://www.npmjs.com/package/commander) |
| **Weekly Downloads** | ~238 million |
| **GitHub Stars** | 27,770 |
| **Latest Version** | 12.x |
| **Maintenance** | Very Active |
| **TypeScript** | Built-in types |

**How it fits AgentScope**: Build the main CLI with subcommands (scan, diagram, compare, export).

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('agentscope')
  .description('Agent Architecture Documentation & Visualization Tool')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan and document agent configurations')
  .option('-o, --output <dir>', 'Output directory', './docs/agent-architecture')
  .option('-f, --format <format>', 'Output format (md|html|json)', 'md')
  .option('--watch', 'Watch for changes and regenerate')
  .option('--include <frameworks...>', 'Frameworks to include')
  .action(async (options) => {
    const scanner = new AgentScanner(options);
    await scanner.scan();
    await scanner.generateDocs();
  });

program
  .command('diagram')
  .description('Generate specific diagram types')
  .argument('<type>', 'Diagram type (workflow|hierarchy|dataflow|permissions)')
  .option('-o, --output <file>', 'Output file')
  .option('-t, --theme <theme>', 'Mermaid theme', 'default')
  .action(async (type, options) => {
    await generateDiagram(type, options);
  });

program
  .command('compare')
  .description('Compare against company workflow')
  .requiredOption('-w, --workflow <file>', 'Company workflow YAML file')
  .option('--strict', 'Fail on any mismatch')
  .action(async (options) => {
    const results = await compareWorkflow(options.workflow);
    displayComparisonResults(results);
  });

program
  .command('export')
  .description('Export configuration to different framework')
  .requiredOption('--from <framework>', 'Source framework')
  .requiredOption('--to <framework>', 'Target framework')
  .option('-o, --output <dir>', 'Output directory')
  .action(async (options) => {
    await exportConfig(options.from, options.to, options.output);
  });

program.parse();
```

### 5.2 CAC (Alternative - Lightweight)

| Attribute | Value |
|-----------|-------|
| **npm package** | [cac](https://www.npmjs.com/package/cac) |
| **Weekly Downloads** | ~15 million |
| **Size** | ~4KB (no dependencies) |
| **Maintenance** | Active |

**When to use**: If you want a minimal CLI framework with TypeScript-first design.

```typescript
import { cac } from 'cac';

const cli = cac('agentscope');

cli
  .command('scan [path]', 'Scan agent configurations')
  .option('--output <dir>', 'Output directory')
  .action((path, options) => {
    // ...
  });

cli.help();
cli.version('1.0.0');
cli.parse();
```

### 5.3 Oclif (Alternative - Enterprise Scale)

| Attribute | Value |
|-----------|-------|
| **npm package** | [oclif](https://www.npmjs.com/package/oclif) |
| **Weekly Downloads** | ~173,000 |
| **Maintenance** | Active (Heroku/Salesforce) |
| **Use Case** | Large CLIs with plugins |

**When to use**: If AgentScope grows into a platform with community plugins.

### Comparison Summary

| Framework | Best For | Learning Curve | Size |
|-----------|----------|----------------|------|
| **Commander.js** | General purpose, balanced | Low | Medium |
| **CAC** | Minimal, TypeScript-first | Very Low | Tiny |
| **Yargs** | Complex argument parsing | Medium | Large |
| **Oclif** | Enterprise, plugins | High | Large |

**Recommendation**: Start with **Commander.js** for the best balance of features and simplicity.

---

## 6. Schema/Validation Solutions

### 6.1 Zod (Recommended for TypeScript Projects)

| Attribute | Value |
|-----------|-------|
| **npm package** | [zod](https://www.npmjs.com/package/zod) |
| **Weekly Downloads** | ~25+ million |
| **GitHub Stars** | 35,000+ |
| **Latest Version** | 3.x |
| **Maintenance** | Very Active |
| **TypeScript** | First-class support |

**How it fits AgentScope**: Validate parsed configurations, infer TypeScript types.

```typescript
import { z } from 'zod';

// Define schema for agent configuration
const AgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['primary', 'subagent', 'specialist']),
  framework: z.enum(['claude-code', 'bmad', 'gemini', 'custom']),
  skills: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    allowedTools: z.array(z.string()).default([]),
    triggers: z.array(z.string()).default([])
  })).default([]),
  hooks: z.array(z.object({
    event: z.enum(['PreToolUse', 'PostToolUse', 'SessionStart', 'SessionEnd']),
    handler: z.string()
  })).optional(),
  permissions: z.object({
    read: z.boolean().default(true),
    write: z.boolean().default(false),
    bash: z.boolean().default(false),
    mcp: z.array(z.string()).default([])
  }).optional()
});

// Infer TypeScript type from schema
type Agent = z.infer<typeof AgentSchema>;

// Validate parsed YAML
function parseAgentConfig(yamlContent: string): Agent {
  const parsed = yaml.load(yamlContent);
  const result = AgentSchema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError(result.error.format());
  }

  return result.data;
}

// Validate entire project config
const ProjectConfigSchema = z.object({
  meta: z.object({
    name: z.string(),
    version: z.string(),
    scanDate: z.string().datetime()
  }),
  agents: z.array(AgentSchema),
  mcpServers: z.array(MCPServerSchema),
  workflows: z.array(WorkflowSchema)
});
```

### 6.2 TypeBox (Alternative - JSON Schema Compatible)

| Attribute | Value |
|-----------|-------|
| **npm package** | [@sinclair/typebox](https://www.npmjs.com/package/@sinclair/typebox) |
| **Weekly Downloads** | ~10+ million |
| **Performance** | 10x faster than Zod with AJV |
| **Use Case** | When you need JSON Schema output |

```typescript
import { Type, Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const AgentSchema = Type.Object({
  name: Type.String(),
  type: Type.Union([
    Type.Literal('primary'),
    Type.Literal('subagent')
  ]),
  skills: Type.Array(Type.Object({
    name: Type.String()
  }))
});

type Agent = Static<typeof AgentSchema>;

// Compile for fast validation
const validator = TypeCompiler.Compile(AgentSchema);

function validate(data: unknown): Agent {
  if (validator.Check(data)) {
    return data;
  }
  throw new Error(JSON.stringify([...validator.Errors(data)]));
}

// Export as JSON Schema for documentation
const jsonSchema = JSON.stringify(AgentSchema, null, 2);
```

### 6.3 AJV (Alternative - Maximum Performance)

| Attribute | Value |
|-----------|-------|
| **npm package** | [ajv](https://www.npmjs.com/package/ajv) |
| **Weekly Downloads** | ~100+ million |
| **Performance** | Fastest JSON Schema validator |
| **Use Case** | JSON Schema standard compliance |

```typescript
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    skills: {
      type: 'array',
      items: { type: 'object' }
    }
  },
  required: ['name']
};

const validate = ajv.compile(schema);

if (!validate(data)) {
  console.error(validate.errors);
}
```

### Comparison Summary

| Library | TypeScript Types | Performance | JSON Schema | Best For |
|---------|------------------|-------------|-------------|----------|
| **Zod** | Excellent | Good | Via plugin | TypeScript projects |
| **TypeBox** | Excellent | Excellent | Native | Need JSON Schema |
| **AJV** | Requires work | Best | Native | High-performance |

**Recommendation**: Use **Zod** for AgentScope - best TypeScript integration and developer experience.

---

## 7. Assembly Proposal

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentScope CLI                           │
│                      (commander.js)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Scanner   │  │  Visualizer │  │  Documenter │            │
│  │             │  │             │  │             │            │
│  │  globby     │  │  mermaid    │  │  remark     │            │
│  │  gray-matter│  │  (generate) │  │  handlebars │            │
│  │  js-yaml    │  │             │  │  fs-extra   │            │
│  │  zod        │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                 Unified Config Model (TypeScript)               │
│                      (zod schemas)                              │
└─────────────────────────────────────────────────────────────────┘
```

### What Needs Custom Code vs Library

| Component | Library Coverage | Custom Code Needed |
|-----------|------------------|-------------------|
| **CLI Framework** | 100% (commander) | Command handlers |
| **YAML Parsing** | 100% (js-yaml) | Schema definitions |
| **Frontmatter** | 100% (gray-matter) | None |
| **File Discovery** | 100% (globby) | Path patterns |
| **File I/O** | 100% (fs-extra) | None |
| **Validation** | 90% (zod) | Custom schemas |
| **Mermaid Gen** | 50% (mermaid) | Diagram builders |
| **Doc Generation** | 70% (remark/handlebars) | Templates, logic |
| **Framework Parsers** | 0% | **Full custom** |
| **Workflow Compare** | 0% | **Full custom** |
| **Config Transform** | 0% | **Full custom** |

### Custom Code Requirements

1. **Framework-Specific Parsers** (~40% of custom code)
   - Claude Code structure parser
   - BMad YAML interpreter
   - MCP config parser
   - Gemini config parser

2. **Diagram Builders** (~20% of custom code)
   - Agent hierarchy builder
   - Workflow sequence builder
   - Data flow builder
   - Permission matrix builder

3. **Business Logic** (~40% of custom code)
   - Workflow comparator
   - Optimization analyzer
   - Framework transformer
   - Unified config normalizer

---

## 8. Recommended Stack

### Minimal Dependency List

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "globby": "^14.0.0",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0",
    "zod": "^3.22.0",
    "fs-extra": "^11.2.0",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-stringify": "^11.0.0",
    "remark-gfm": "^4.0.0",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.0",
    "@types/js-yaml": "^4.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "optionalDependencies": {
    "mermaid-isomorphic": "^3.0.0",
    "chokidar": "^5.0.0"
  }
}
```

### Total: 11 Runtime Dependencies

| Category | Packages | Purpose |
|----------|----------|---------|
| CLI | commander | Command-line interface |
| Parsing | js-yaml, gray-matter | Config file parsing |
| Files | globby, fs-extra | File discovery and I/O |
| Validation | zod | Schema validation |
| Documentation | unified, remark-*, handlebars | Doc generation |
| Optional | mermaid-isomorphic, chokidar | Rendering, watching |

### Estimated Bundle Size

| Package | Size (gzipped) |
|---------|----------------|
| commander | ~19 KB |
| globby | ~15 KB |
| gray-matter | ~8 KB |
| js-yaml | ~18 KB |
| zod | ~13 KB |
| fs-extra | ~11 KB |
| unified ecosystem | ~45 KB |
| handlebars | ~22 KB |
| **Total** | **~151 KB** |

This is a very reasonable size for a CLI tool.

### Development Timeline Impact

| Approach | Estimated Time |
|----------|----------------|
| Build everything from scratch | 16-20 weeks |
| Use recommended libraries | **6-8 weeks** |
| Time saved | **10-12 weeks (60-65%)** |

---

## Conclusion

By leveraging these well-maintained npm packages, AgentScope can be built as a **lean, focused tool** that:

1. **Delegates commodity operations** to battle-tested libraries
2. **Focuses custom code** on the unique value: understanding agent configurations
3. **Maintains a small dependency footprint** (~11 packages)
4. **Benefits from community maintenance** of underlying tools
5. **Ships faster** with proven components

The recommended stack provides excellent TypeScript support, active maintenance, and proven reliability in production environments.

---

## Sources

### Config Parsing
- [js-yaml - npm](https://www.npmjs.com/package/js-yaml)
- [gray-matter - npm](https://www.npmjs.com/package/gray-matter)
- [gray-matter - GitHub](https://github.com/jonschlinkert/gray-matter)
- [smol-toml - npm](https://www.npmjs.com/package/smol-toml)
- [js-toml - GitHub](https://github.com/sunnyadn/js-toml)

### Diagram Generation
- [Mermaid - GitHub](https://github.com/mermaid-js/mermaid)
- [Mermaid - npm](https://www.npmjs.com/package/mermaid)
- [Mermaid CLI - GitHub](https://github.com/mermaid-js/mermaid-cli)
- [mermaid-mcp-server - GitHub](https://github.com/peng-shawn/mermaid-mcp-server)
- [mcp-mermaid - GitHub](https://github.com/hustcc/mcp-mermaid)

### Documentation Generation
- [markdown-it - npm](https://www.npmjs.com/package/markdown-it)
- [unified - GitHub](https://github.com/unifiedjs/unified)
- [remark - GitHub](https://github.com/remarkjs/remark)
- [Handlebars.js vs EJS - StackShare](https://stackshare.io/stackups/ejs-vs-handlebars)
- [Template Engines Comparison - npm-compare](https://npm-compare.com/ejs,handlebars,mustache,pug)

### File Operations
- [globby - npm](https://www.npmjs.com/package/globby)
- [globby - GitHub](https://github.com/sindresorhus/globby)
- [fast-glob - GitHub](https://github.com/mrmlnc/fast-glob)
- [fs-extra - npm](https://www.npmjs.com/package/fs-extra)
- [chokidar - GitHub](https://github.com/paulmillr/chokidar)

### CLI Frameworks
- [Commander.js vs Yargs vs Oclif - npm-compare](https://npm-compare.com/commander,oclif,vorpal,yargs)
- [commander - npm](https://www.npmjs.com/package/commander)
- [cac - GitHub](https://github.com/cacjs/cac)
- [oclif - npm](https://www.npmjs.com/package/oclif)

### Validation
- [Zod vs AJV - Bitovi](https://www.bitovi.com/blog/comparing-schema-validation-libraries-ajv-joi-yup-and-zod)
- [TypeBox - GitHub](https://github.com/sinclairzx81/typebox)
- [@sinclair/typebox - npm](https://www.npmjs.com/package/@sinclair/typebox)
- [AJV vs Zod Comparison - Moiva](https://moiva.io/?npm=ajv+zod)

---

*Document Version: 1.0 | January 2026 | Research Phase*
