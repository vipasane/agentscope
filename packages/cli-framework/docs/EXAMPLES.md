# Examples - @claude-flow/cli-framework

Comprehensive real-world examples for building CLI applications.

## Table of Contents

- [Basic CLI](#basic-cli)
- [Multi-Command CLI](#multi-command-cli)
- [Interactive CLI](#interactive-cli)
- [Data Processing CLI](#data-processing-cli)
- [Configuration Management](#configuration-management)
- [Package Manager](#package-manager)
- [Deployment Tool](#deployment-tool)
- [Testing Framework](#testing-framework)

---

## Basic CLI

Simple single-command CLI tool.

```typescript
#!/usr/bin/env node
import { CommandRegistry, c, setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();

cli.register({
  name: 'hello',
  description: 'Greet someone',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: true,
    },
  ],
  options: [
    {
      name: 'loud',
      short: 'l',
      long: 'loud',
      type: 'boolean',
      description: 'Greet loudly (uppercase)',
    },
    {
      name: 'times',
      short: 't',
      long: 'times',
      type: 'number',
      description: 'Number of times to greet',
      default: 1,
      validate: (value) => {
        const n = value as number;
        return n > 0 || 'Must be positive';
      },
    },
  ],
  examples: [
    'hello Alice',
    'hello Bob --loud',
    'hello Charlie --times 3',
  ],
  action: async (args) => {
    const name = args._[0] as string;
    const times = args.times as number;
    const loud = args.loud as boolean;

    const greeting = `Hello, ${name}!`;
    const message = loud ? greeting.toUpperCase() : greeting;

    for (let i = 0; i < times; i++) {
      console.log(c.green(message));
    }
  },
});

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mycli hello Alice
Hello, Alice!

$ mycli hello Bob --loud
HELLO, BOB!

$ mycli hello Charlie --times 3
Hello, Charlie!
Hello, Charlie!
Hello, Charlie!
```

---

## Multi-Command CLI

CLI with multiple subcommands (like git, docker).

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  OutputFormatter,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const formatter = new OutputFormatter();

// User management commands
cli.register({
  name: 'user',
  description: 'User management',
  subcommands: [
    {
      name: 'list',
      description: 'List all users',
      options: [
        {
          name: 'format',
          short: 'f',
          long: 'format',
          type: 'string',
          choices: ['table', 'json', 'yaml'],
          default: 'table',
          description: 'Output format',
        },
      ],
      action: async (args) => {
        const users = [
          { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
          { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
        ];

        switch (args.format) {
          case 'json':
            console.log(formatter.json(users));
            break;
          case 'yaml':
            console.log(formatter.yaml(users));
            break;
          default:
            console.log(
              formatter.table(users, [
                { header: 'ID', field: 'id', width: 5, align: 'right' },
                { header: 'Name', field: 'name', width: 15 },
                { header: 'Email', field: 'email', width: 25 },
                { header: 'Role', field: 'role', width: 10 },
              ])
            );
        }
      },
    },
    {
      name: 'create',
      description: 'Create a new user',
      arguments: [
        { name: 'name', description: 'User name', required: true },
        { name: 'email', description: 'User email', required: true },
      ],
      options: [
        {
          name: 'role',
          short: 'r',
          long: 'role',
          type: 'string',
          choices: ['admin', 'user', 'guest'],
          default: 'user',
          description: 'User role',
        },
      ],
      action: async (args) => {
        const name = args._[0] as string;
        const email = args._[1] as string;
        const role = args.role as string;

        console.log(c.success('✓ User created successfully'));
        console.log(
          formatter.box(
            `Name: ${name}\nEmail: ${email}\nRole: ${role}`,
            'User Details'
          )
        );
      },
    },
    {
      name: 'delete',
      description: 'Delete a user',
      arguments: [
        { name: 'id', description: 'User ID', required: true },
      ],
      options: [
        {
          name: 'force',
          short: 'f',
          long: 'force',
          type: 'boolean',
          description: 'Skip confirmation',
        },
      ],
      action: async (args) => {
        const id = args._[0];
        const force = args.force as boolean;

        if (!force) {
          const { InteractivePrompt } = await import('@claude-flow/cli-framework');
          const prompt = new InteractivePrompt();

          const confirmed = await prompt.confirm({
            message: `Delete user ${id}?`,
            default: false,
          });

          if (!confirmed) {
            console.log(c.warning('Cancelled'));
            return;
          }
        }

        console.log(c.success(`✓ User ${id} deleted`));
      },
    },
  ],
});

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mycli user list
ID   Name      Email                  Role
1    Alice     alice@example.com      admin
2    Bob       bob@example.com        user
3    Charlie   charlie@example.com    user

$ mycli user create Alice alice@example.com --role admin
✓ User created successfully
┌─ User Details ──────────────┐
│ Name: Alice                 │
│ Email: alice@example.com    │
│ Role: admin                 │
└─────────────────────────────┘

$ mycli user delete 1
? Delete user 1? (y/N)
```

---

## Interactive CLI

CLI with interactive prompts and progress indicators.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  InteractivePrompt,
  Spinner,
  ProgressBar,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const prompt = new InteractivePrompt();

cli.register({
  name: 'init',
  description: 'Initialize a new project',
  action: async () => {
    console.log(c.bold('\n🚀 Project Initialization\n'));

    // Collect project details
    const projectName = await prompt.ask({
      message: 'Project name:',
      validate: (value) => value.length > 0 || 'Project name is required',
    });

    const description = await prompt.ask({
      message: 'Description:',
      default: 'My awesome project',
    });

    const language = await prompt.select({
      message: 'Programming language:',
      choices: [
        { label: 'TypeScript', value: 'typescript' },
        { label: 'JavaScript', value: 'javascript' },
        { label: 'Python', value: 'python' },
      ],
    });

    const features = await prompt.multiSelect({
      message: 'Select features:',
      choices: [
        { label: 'Testing', value: 'testing' },
        { label: 'Linting', value: 'linting' },
        { label: 'Docker', value: 'docker' },
        { label: 'CI/CD', value: 'cicd' },
      ],
    });

    const useGit = await prompt.confirm({
      message: 'Initialize git repository?',
      default: true,
    });

    // Show spinner during setup
    const spinner = new Spinner({ text: 'Creating project...' });
    spinner.start();

    await sleep(1000);
    spinner.update('Installing dependencies...');
    await sleep(1500);

    if (useGit) {
      spinner.update('Initializing git...');
      await sleep(500);
    }

    spinner.success('Project created successfully!');

    // Show summary
    console.log(c.bold('\n📦 Project Summary\n'));
    console.log(`Name: ${c.cyan(projectName)}`);
    console.log(`Description: ${description}`);
    console.log(`Language: ${c.cyan(language)}`);
    console.log(`Features: ${features.join(', ')}`);
    console.log(`Git: ${useGit ? c.green('✓') : c.gray('✗')}`);

    console.log(c.bold('\n✨ Next steps:'));
    console.log(c.dim(`  cd ${projectName}`));
    console.log(c.dim('  npm install'));
    console.log(c.dim('  npm start'));
  },
});

cli.register({
  name: 'install',
  description: 'Install dependencies',
  action: async () => {
    const packages = ['react', 'express', 'axios', 'lodash', 'typescript'];

    const progress = new ProgressBar({
      total: packages.length,
      label: 'Installing',
      showPercentage: true,
      showEta: true,
    });

    for (let i = 0; i < packages.length; i++) {
      await sleep(500);
      progress.update(i + 1);
    }

    progress.complete();
    console.log(c.success('\n✓ All packages installed'));
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mycli init

🚀 Project Initialization

? Project name: my-app
? Description: My awesome project
? Programming language: TypeScript
? Select features: Testing, Linting
? Initialize git repository? Yes

⠋ Creating project...
⠙ Installing dependencies...
⠹ Initializing git...
✓ Project created successfully!

📦 Project Summary

Name: my-app
Description: My awesome project
Language: TypeScript
Features: Testing, Linting
Git: ✓

✨ Next steps:
  cd my-app
  npm install
  npm start
```

---

## Data Processing CLI

CLI for processing data files with various output formats.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  OutputFormatter,
  ProgressBar,
  c,
  setupGlobalErrorHandlers,
  validateFileExists,
  validateChoice,
} from '@claude-flow/cli-framework';
import { readFile, writeFile } from 'fs/promises';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();

cli.register({
  name: 'convert',
  description: 'Convert data between formats',
  arguments: [
    { name: 'input', description: 'Input file', required: true },
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      long: 'output',
      type: 'string',
      description: 'Output file',
    },
    {
      name: 'from',
      short: 'f',
      long: 'from',
      type: 'string',
      choices: ['json', 'yaml', 'csv'],
      description: 'Input format',
    },
    {
      name: 'to',
      short: 't',
      long: 'to',
      type: 'string',
      choices: ['json', 'yaml', 'csv', 'table'],
      required: true,
      description: 'Output format',
    },
  ],
  action: async (args) => {
    const inputFile = await validateFileExists(args._[0], 'input');
    const outputFile = args.output as string | undefined;
    const fromFormat = args.from as string;
    const toFormat = validateChoice(args.to, ['json', 'yaml', 'csv', 'table'], 'to');

    // Read input
    const content = await readFile(inputFile, 'utf-8');

    // Parse based on format
    let data: any;
    if (fromFormat === 'json' || inputFile.endsWith('.json')) {
      data = JSON.parse(content);
    } else if (fromFormat === 'yaml' || inputFile.endsWith('.yaml')) {
      // Simple YAML parsing (production should use a library)
      data = parseSimpleYAML(content);
    } else {
      // CSV
      data = parseCSV(content);
    }

    // Convert format
    const formatter = new OutputFormatter();
    let output: string;

    switch (toFormat) {
      case 'json':
        output = formatter.json(data);
        break;
      case 'yaml':
        output = formatter.yaml(data);
        break;
      case 'csv':
        output = convertToCSV(data);
        break;
      case 'table':
        output = formatter.table(data, Object.keys(data[0]).map(key => ({
          header: key,
          field: key,
        })));
        break;
    }

    // Write or print
    if (outputFile) {
      await writeFile(outputFile, output);
      console.log(c.success(`✓ Converted ${inputFile} → ${outputFile}`));
    } else {
      console.log(output);
    }
  },
});

cli.register({
  name: 'analyze',
  description: 'Analyze data file',
  arguments: [
    { name: 'input', description: 'Input file', required: true },
  ],
  action: async (args) => {
    const inputFile = await validateFileExists(args._[0], 'input');
    const content = await readFile(inputFile, 'utf-8');
    const data = JSON.parse(content);

    console.log(c.bold('\n📊 Data Analysis\n'));
    console.log(`Records: ${c.cyan(data.length)}`);
    console.log(`Fields: ${c.cyan(Object.keys(data[0]).join(', '))}`);

    // Statistics
    console.log(c.bold('\nStatistics:'));
    for (const key of Object.keys(data[0])) {
      const values = data.map((item: any) => item[key]);
      const type = typeof values[0];

      if (type === 'number') {
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        console.log(`\n${c.bold(key)}:`);
        console.log(`  Average: ${avg.toFixed(2)}`);
        console.log(`  Min: ${min}`);
        console.log(`  Max: ${max}`);
      } else {
        const unique = new Set(values).size;
        console.log(`\n${c.bold(key)}: ${unique} unique values`);
      }
    }
  },
});

function parseSimpleYAML(content: string): any {
  // Simple YAML parser (production should use a library like js-yaml)
  return {};
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {} as any);
  });
}

function convertToCSV(data: any[]): string {
  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
    headers.map(h => item[h]).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mycli convert data.json --to yaml
users:
  - name: Alice
    age: 30
  - name: Bob
    age: 25

$ mycli analyze data.json

📊 Data Analysis

Records: 100
Fields: name, age, email, score

Statistics:

age:
  Average: 32.50
  Min: 18
  Max: 65

score:
  Average: 87.30
  Min: 45
  Max: 100

name: 100 unique values
```

---

## Configuration Management

CLI for managing configuration files.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  InteractivePrompt,
  OutputFormatter,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const prompt = new InteractivePrompt();
const formatter = new OutputFormatter();

const CONFIG_FILE = join(process.cwd(), '.myapp.json');

interface Config {
  apiKey?: string;
  apiUrl?: string;
  timeout?: number;
  verbose?: boolean;
}

async function loadConfig(): Promise<Config> {
  try {
    await access(CONFIG_FILE);
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveConfig(config: Config): Promise<void> {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

cli.register({
  name: 'config',
  description: 'Manage configuration',
  subcommands: [
    {
      name: 'get',
      description: 'Get configuration value',
      arguments: [
        { name: 'key', description: 'Configuration key', required: false },
      ],
      action: async (args) => {
        const config = await loadConfig();
        const key = args._[0] as string | undefined;

        if (key) {
          const value = config[key as keyof Config];
          if (value !== undefined) {
            console.log(value);
          } else {
            console.log(c.error(`Key "${key}" not found`));
            process.exit(1);
          }
        } else {
          console.log(formatter.yaml(config));
        }
      },
    },
    {
      name: 'set',
      description: 'Set configuration value',
      arguments: [
        { name: 'key', description: 'Configuration key', required: true },
        { name: 'value', description: 'Configuration value', required: true },
      ],
      action: async (args) => {
        const config = await loadConfig();
        const key = args._[0] as string;
        const value = args._[1] as string;

        // Type coercion
        let typedValue: any = value;
        if (value === 'true') typedValue = true;
        else if (value === 'false') typedValue = false;
        else if (!isNaN(Number(value))) typedValue = Number(value);

        config[key as keyof Config] = typedValue;
        await saveConfig(config);

        console.log(c.success(`✓ Set ${key} = ${typedValue}`));
      },
    },
    {
      name: 'unset',
      description: 'Unset configuration value',
      arguments: [
        { name: 'key', description: 'Configuration key', required: true },
      ],
      action: async (args) => {
        const config = await loadConfig();
        const key = args._[0] as string;

        if (key in config) {
          delete config[key as keyof Config];
          await saveConfig(config);
          console.log(c.success(`✓ Unset ${key}`));
        } else {
          console.log(c.warning(`Key "${key}" not found`));
        }
      },
    },
    {
      name: 'init',
      description: 'Initialize configuration interactively',
      action: async () => {
        console.log(c.bold('\n⚙️  Configuration Setup\n'));

        const apiUrl = await prompt.url('API URL:');
        const apiKey = await prompt.password('API Key:');
        const timeout = await prompt.number('Timeout (ms):', {
          min: 1000,
          max: 60000,
        });
        const verbose = await prompt.confirm({
          message: 'Enable verbose logging?',
          default: false,
        });

        const config: Config = {
          apiUrl,
          apiKey,
          timeout,
          verbose,
        };

        await saveConfig(config);

        console.log(c.success('\n✓ Configuration saved'));
        console.log(c.dim(`File: ${CONFIG_FILE}`));
      },
    },
    {
      name: 'list',
      description: 'List all configuration values',
      action: async () => {
        const config = await loadConfig();

        if (Object.keys(config).length === 0) {
          console.log(c.warning('No configuration found'));
          console.log(c.dim('Run "config init" to create one'));
          return;
        }

        console.log(c.bold('\n⚙️  Configuration\n'));

        const rows = Object.entries(config).map(([key, value]) => ({
          key,
          value: typeof value === 'string' && key.includes('Key')
            ? '***' + value.slice(-4)
            : String(value),
        }));

        console.log(formatter.table(rows, [
          { header: 'Key', field: 'key', width: 20 },
          { header: 'Value', field: 'value', width: 40 },
        ]));
      },
    },
  ],
});

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mycli config init

⚙️  Configuration Setup

? API URL: https://api.example.com
? API Key: ****
? Timeout (ms): 5000
? Enable verbose logging? No

✓ Configuration saved
File: /path/to/.myapp.json

$ mycli config list

⚙️  Configuration

Key         Value
apiUrl      https://api.example.com
apiKey      ***abcd
timeout     5000
verbose     false

$ mycli config get apiUrl
https://api.example.com

$ mycli config set timeout 10000
✓ Set timeout = 10000
```

---

## Package Manager

Simple package manager CLI.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  ProgressBar,
  Spinner,
  OutputFormatter,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const formatter = new OutputFormatter();

cli.register({
  name: 'install',
  description: 'Install packages',
  arguments: [
    { name: 'packages', description: 'Packages to install', multiple: true },
  ],
  options: [
    {
      name: 'save-dev',
      short: 'D',
      long: 'save-dev',
      type: 'boolean',
      description: 'Save as dev dependency',
    },
    {
      name: 'global',
      short: 'g',
      long: 'global',
      type: 'boolean',
      description: 'Install globally',
    },
  ],
  action: async (args) => {
    const packages = args._ as string[];
    const saveDev = args['save-dev'] as boolean;
    const global = args.global as boolean;

    if (packages.length === 0) {
      console.log('Installing dependencies from package.json...');
      // Install from package.json
      return;
    }

    const progress = new ProgressBar({
      total: packages.length,
      label: global ? 'Installing globally' : 'Installing',
      showPercentage: true,
    });

    for (let i = 0; i < packages.length; i++) {
      await sleep(500);
      progress.update(i + 1);
    }

    progress.complete();

    const location = global ? 'globally' : saveDev ? 'devDependencies' : 'dependencies';
    console.log(c.success(`\n✓ Installed ${packages.length} packages (${location})`));
  },
});

cli.register({
  name: 'uninstall',
  description: 'Uninstall packages',
  arguments: [
    { name: 'packages', description: 'Packages to uninstall', multiple: true, required: true },
  ],
  action: async (args) => {
    const packages = args._ as string[];

    const spinner = new Spinner();

    for (const pkg of packages) {
      spinner.start(`Removing ${pkg}...`);
      await sleep(300);
      spinner.success(`Removed ${pkg}`);
    }
  },
});

cli.register({
  name: 'list',
  description: 'List installed packages',
  options: [
    {
      name: 'depth',
      short: 'd',
      long: 'depth',
      type: 'number',
      default: 0,
      description: 'Depth of dependency tree',
    },
  ],
  action: async (args) => {
    const depth = args.depth as number;

    const packages = [
      { name: 'react', version: '18.2.0', size: '100 KB' },
      { name: 'express', version: '4.18.0', size: '200 KB' },
      { name: 'typescript', version: '5.0.0', size: '25 MB' },
    ];

    console.log(formatter.table(packages, [
      { header: 'Package', field: 'name', width: 20 },
      { header: 'Version', field: 'version', width: 15 },
      { header: 'Size', field: 'size', width: 10, align: 'right' },
    ]));

    console.log(c.dim(`\n${packages.length} packages installed`));
  },
});

cli.register({
  name: 'outdated',
  description: 'Check for outdated packages',
  action: async () => {
    const spinner = new Spinner({ text: 'Checking for updates...' });
    spinner.start();

    await sleep(1500);

    spinner.stop();

    const outdated = [
      { name: 'react', current: '18.2.0', wanted: '18.2.1', latest: '18.3.0' },
      { name: 'express', current: '4.18.0', wanted: '4.18.2', latest: '4.19.0' },
    ];

    if (outdated.length === 0) {
      console.log(c.success('✓ All packages are up to date'));
      return;
    }

    console.log(formatter.table(outdated, [
      { header: 'Package', field: 'name', width: 20 },
      { header: 'Current', field: 'current', width: 12 },
      { header: 'Wanted', field: 'wanted', width: 12 },
      { header: 'Latest', field: 'latest', width: 12 },
    ]));

    console.log(c.warning(`\n⚠  ${outdated.length} packages can be updated`));
    console.log(c.dim('Run "update" to update packages'));
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mypkg install react express typescript
Installing [████████████████████] 100% (3/3)
✓ Installed 3 packages (dependencies)

$ mypkg list
Package       Version    Size
react         18.2.0     100 KB
express       4.18.0     200 KB
typescript    5.0.0      25 MB

3 packages installed

$ mypkg outdated
⠋ Checking for updates...

Package       Current    Wanted     Latest
react         18.2.0     18.2.1     18.3.0
express       4.18.0     4.18.2     4.19.0

⚠  2 packages can be updated
Run "update" to update packages
```

---

## Deployment Tool

CLI for deploying applications.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  InteractivePrompt,
  Spinner,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const prompt = new InteractivePrompt();

cli.register({
  name: 'deploy',
  description: 'Deploy application',
  options: [
    {
      name: 'env',
      short: 'e',
      long: 'env',
      type: 'string',
      choices: ['dev', 'staging', 'production'],
      required: true,
      description: 'Environment to deploy to',
    },
    {
      name: 'skip-tests',
      long: 'skip-tests',
      type: 'boolean',
      description: 'Skip running tests',
    },
    {
      name: 'no-cache',
      long: 'no-cache',
      type: 'boolean',
      description: 'Disable build cache',
    },
  ],
  action: async (args) => {
    const env = args.env as string;
    const skipTests = args['skip-tests'] as boolean;
    const noCache = args['no-cache'] as boolean;

    // Confirmation for production
    if (env === 'production') {
      console.log(c.bold(c.red('\n⚠️  PRODUCTION DEPLOYMENT\n')));

      const confirmed = await prompt.confirm({
        message: 'Are you sure you want to deploy to production?',
        default: false,
      });

      if (!confirmed) {
        console.log(c.warning('Deployment cancelled'));
        return;
      }
    }

    const spinner = new Spinner();

    // Build
    spinner.start('Building application...');
    await sleep(2000);
    spinner.success('Built successfully');

    // Tests
    if (!skipTests) {
      spinner.start('Running tests...');
      await sleep(1500);
      spinner.success('All tests passed');
    }

    // Docker build
    spinner.start('Building Docker image...');
    await sleep(2500);
    spinner.success('Docker image built');

    // Push
    spinner.start(`Deploying to ${env}...`);
    await sleep(3000);
    spinner.success(`Deployed to ${env}`);

    console.log(c.bold(c.green('\n✨ Deployment complete!\n')));
    console.log(`Environment: ${c.cyan(env)}`);
    console.log(`URL: ${c.cyan(`https://${env}.example.com`)}`);
    console.log(c.dim(`\nDeployment ID: dep_${Date.now()}`));
  },
});

cli.register({
  name: 'rollback',
  description: 'Rollback to previous deployment',
  options: [
    {
      name: 'env',
      short: 'e',
      long: 'env',
      type: 'string',
      choices: ['dev', 'staging', 'production'],
      required: true,
      description: 'Environment to rollback',
    },
    {
      name: 'version',
      short: 'v',
      long: 'version',
      type: 'string',
      description: 'Version to rollback to',
    },
  ],
  action: async (args) => {
    const env = args.env as string;
    const version = args.version as string;

    const confirmed = await prompt.confirm({
      message: `Rollback ${env} to ${version || 'previous version'}?`,
      default: false,
    });

    if (!confirmed) {
      console.log(c.warning('Rollback cancelled'));
      return;
    }

    const spinner = new Spinner({ text: 'Rolling back...' });
    spinner.start();

    await sleep(2000);

    spinner.success('Rollback complete');
    console.log(c.success(`\n✓ ${env} rolled back to ${version || 'previous version'}`));
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mydeploy deploy --env staging
⠋ Building application...
✓ Built successfully
⠋ Running tests...
✓ All tests passed
⠋ Building Docker image...
✓ Docker image built
⠋ Deploying to staging...
✓ Deployed to staging

✨ Deployment complete!

Environment: staging
URL: https://staging.example.com

Deployment ID: dep_1234567890

$ mydeploy deploy --env production

⚠️  PRODUCTION DEPLOYMENT

? Are you sure you want to deploy to production? Yes
⠋ Building application...
```

---

## Testing Framework

CLI for running tests with various reporters.

```typescript
#!/usr/bin/env node
import {
  CommandRegistry,
  OutputFormatter,
  Spinner,
  c,
  setupGlobalErrorHandlers,
} from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();
const formatter = new OutputFormatter();

interface TestResult {
  file: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
}

cli.register({
  name: 'test',
  description: 'Run tests',
  arguments: [
    { name: 'pattern', description: 'Test file pattern', required: false },
  ],
  options: [
    {
      name: 'watch',
      short: 'w',
      long: 'watch',
      type: 'boolean',
      description: 'Watch mode',
    },
    {
      name: 'coverage',
      short: 'c',
      long: 'coverage',
      type: 'boolean',
      description: 'Collect coverage',
    },
    {
      name: 'reporter',
      short: 'r',
      long: 'reporter',
      type: 'string',
      choices: ['default', 'verbose', 'json', 'junit'],
      default: 'default',
      description: 'Test reporter',
    },
  ],
  action: async (args) => {
    const pattern = args._[0] as string || '**/*.test.ts';
    const watch = args.watch as boolean;
    const coverage = args.coverage as boolean;
    const reporter = args.reporter as string;

    console.log(c.dim(`Running tests matching: ${pattern}\n`));

    const spinner = new Spinner({ text: 'Finding tests...' });
    spinner.start();

    await sleep(500);

    const results: TestResult[] = [
      { file: 'auth.test.ts', tests: 12, passed: 12, failed: 0, duration: 250 },
      { file: 'api.test.ts', tests: 24, passed: 22, failed: 2, duration: 580 },
      { file: 'utils.test.ts', tests: 8, passed: 8, failed: 0, duration: 120 },
    ];

    spinner.stop();

    // Run tests
    for (const result of results) {
      const spinner = new Spinner({ text: `Running ${result.file}` });
      spinner.start();

      await sleep(result.duration);

      if (result.failed === 0) {
        spinner.success(
          `${result.file} ${c.green(`✓ ${result.passed}/${result.tests}`)} (${result.duration}ms)`
        );
      } else {
        spinner.error(
          `${result.file} ${c.red(`✗ ${result.failed} failed`)} (${result.duration}ms)`
        );
      }
    }

    // Summary
    const totalTests = results.reduce((sum, r) => sum + r.tests, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(c.bold('\n─────────────────────────'));
    console.log(c.bold('Test Summary'));
    console.log(c.bold('─────────────────────────'));
    console.log(`Total: ${totalTests}`);
    console.log(c.green(`Passed: ${totalPassed}`));
    if (totalFailed > 0) {
      console.log(c.red(`Failed: ${totalFailed}`));
    }
    console.log(`Duration: ${totalDuration}ms`);

    if (coverage) {
      console.log(c.bold('\n─────────────────────────'));
      console.log(c.bold('Coverage'));
      console.log(c.bold('─────────────────────────'));
      console.log('Statements: 85%');
      console.log('Branches: 78%');
      console.log('Functions: 92%');
      console.log('Lines: 87%');
    }

    if (totalFailed > 0) {
      process.exit(1);
    }
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

cli.execute(process.argv.slice(2));
```

**Usage:**
```bash
$ mytest test
Running tests matching: **/*.test.ts

⠋ Finding tests...
✓ auth.test.ts ✓ 12/12 (250ms)
✗ api.test.ts ✗ 2 failed (580ms)
✓ utils.test.ts ✓ 8/8 (120ms)

─────────────────────────
Test Summary
─────────────────────────
Total: 44
Passed: 42
Failed: 2
Duration: 950ms

$ mytest test --coverage
... test results ...

─────────────────────────
Coverage
─────────────────────────
Statements: 85%
Branches: 78%
Functions: 92%
Lines: 87%
```

---

## Helper Functions

Common utilities used in examples:

```typescript
/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
```

---

## More Examples

See the `/examples` directory for complete working examples:

- `basic-cli.ts` - Simple command registration
- `interactive-cli.ts` - Interactive prompts
- `advanced-cli.ts` - Full-featured CLI

---

## Links

- [README](../README.md)
- [API Reference](./API.md)
- [GitHub](https://github.com/ruvnet/claude-flow)
