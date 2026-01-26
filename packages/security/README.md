# @claude-flow/security

Zero-dependency security validation and sanitization for AI agents. Provides robust input validation, path traversal prevention, command injection protection, and secret detection.

## Features

- **Zero Dependencies**: No external dependencies, bundled validation logic
- **High Performance**: <50ms for validation operations, <100ms for secret scanning
- **Zod-style API**: Familiar, type-safe validation interface
- **Comprehensive Coverage**: Input, path, command, and secret validation
- **>90% Test Coverage**: Battle-tested with Vitest

## Installation

```bash
npm install @claude-flow/security
```

## Usage

### Input Validation

Validate user inputs with a Zod-style API:

```typescript
import { InputValidator } from '@claude-flow/security';

// String validation
const nameValidator = InputValidator.string({ min: 1, max: 100 });
const name = nameValidator.parse('John Doe'); // throws on invalid

// Safe validation
const result = nameValidator.safeParse('John Doe');
if (result.success) {
  console.log(result.data); // 'John Doe'
}

// Email validation
const emailValidator = InputValidator.string({ email: true });
emailValidator.parse('user@example.com'); // ✓

// Number validation
const ageValidator = InputValidator.number({ min: 0, max: 150, int: true });
const age = ageValidator.parse(25); // ✓

// Object validation
const userValidator = InputValidator.object({
  name: InputValidator.string({ min: 1 }),
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ min: 0, int: true }),
  role: InputValidator.enum(['admin', 'user', 'guest'] as const)
});

const user = userValidator.parse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  role: 'admin'
});

// Array validation
const tagsValidator = InputValidator.array(InputValidator.string());
const tags = tagsValidator.parse(['typescript', 'security']); // ✓

// Optional and nullable
const optionalName = InputValidator.string().optional();
optionalName.parse(undefined); // ✓

const nullableName = InputValidator.string().nullable();
nullableName.parse(null); // ✓
```

### Path Validation

Prevent path traversal attacks:

```typescript
import { PathValidator } from '@claude-flow/security';

// Validate safe paths
const safePath = PathValidator.validate('data/file.txt');
console.log(safePath); // /absolute/path/to/data/file.txt

// Reject path traversal
try {
  PathValidator.validate('../../../etc/passwd');
} catch (error) {
  console.error('Path traversal detected!');
}

// Check if path is safe
if (PathValidator.isSafe(userPath)) {
  // Safe to use
}

// Enforce allowed directories
const validated = PathValidator.validate(userPath, {
  allowedDirectories: ['/app/data', '/app/uploads'],
  maxDepth: 10
});

// Sanitize paths
const sanitized = PathValidator.sanitize(dangerousPath);

// Get relative path
const relative = PathValidator.getRelative(absolutePath, baseDir);
```

### Command Validation

Prevent command injection:

```typescript
import { SafeExecutor } from '@claude-flow/security';

// Validate commands
const safeCmd = SafeExecutor.validate('npm test', {
  requireShellEscape: true
});

// Use allowlist
SafeExecutor.validate('npm test', {
  allowedCommands: ['npm', 'git', 'node'],
  requireShellEscape: false
});

// Block dangerous commands
try {
  SafeExecutor.validate('rm -rf /');
} catch (error) {
  console.error('Dangerous command blocked!');
}

// Build safe commands
const cmd = SafeExecutor.buildCommand('git', [
  'commit',
  '-m',
  'User message with spaces'
]);
// Result: git 'commit' '-m' 'User message with spaces'

// Escape arguments
const escaped = SafeExecutor.escapeShellArg("it's dangerous");
// Result: 'it'\''s dangerous'

// Validate batch
const commands = SafeExecutor.validateBatch([
  'npm test',
  'npm run build'
], { requireShellEscape: false });
```

### Secret Detection

Detect and redact sensitive information:

```typescript
import { SecretsSanitizer } from '@claude-flow/security';

const code = `
  const config = {
    anthropicKey: "sk-ant-${'x'.repeat(95)}",
    githubToken: "ghp_${'y'.repeat(36)}"
  };
`;

// Detect secrets
const findings = SecretsSanitizer.detect(code, 'config.ts');
for (const finding of findings) {
  console.log(`${finding.severity}: ${finding.type} at line ${finding.location.line}`);
  console.log(`Redacted: ${finding.value}`);
  console.log(`Fix: ${finding.remediation}`);
}

// Redact secrets in content
const redacted = SecretsSanitizer.redactContent(code);
console.log(redacted); // Secrets replaced with [REDACTED]

// Check if content has secrets
if (SecretsSanitizer.hasSecrets(code)) {
  console.warn('Secrets detected!');
}

// Get secret types
const types = SecretsSanitizer.getSecretTypes(code);
// ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN']
```

## Supported Secret Types

- **API Keys**: Anthropic, OpenAI, Google, AWS
- **Tokens**: GitHub (PAT, OAuth, App), Slack
- **Credentials**: Private keys, passwords, basic auth, bearer tokens
- **High Entropy**: Unknown secrets detected via entropy analysis

## Performance

| Operation | Target | Typical |
|-----------|--------|---------|
| Input validation | <50ms | ~10ms |
| Path validation | <50ms | ~5ms |
| Command validation | <50ms | ~5ms |
| Secret scanning | <100ms | ~20ms |

## Security Features

### Layer 1: Input Protection
- File size limits (10 MB)
- Path traversal prevention
- Malformed JSON handling
- Control character sanitization

### Layer 2: Validation & Normalization
- Schema validation (Zod-style)
- Type checking
- Format validation (email, URL)
- Input sanitization

### Layer 3: Detection & Analysis
- Regex-based secret detection
- Entropy-based unknown secret detection
- Command injection pattern detection
- Path traversal detection

## API Reference

### InputValidator

- `string(options?)` - String validator
- `number(options?)` - Number validator
- `boolean()` - Boolean validator
- `array(itemValidator)` - Array validator
- `object(shape)` - Object validator
- `enum(values)` - Enum validator
- `literal(value)` - Literal validator
- `optional()` - Make validator optional
- `nullable()` - Make validator nullable
- `sanitizeInput(input)` - Sanitize string input

### PathValidator

- `validate(path, options?)` - Validate path
- `isSafe(path)` - Check if path is safe
- `sanitize(path)` - Sanitize path
- `containsTraversal(path)` - Check for traversal
- `getRelative(path, baseDir)` - Get relative path

### SafeExecutor

- `validate(command, options?)` - Validate command
- `containsInjection(command)` - Check for injection
- `escapeShellArg(arg)` - Escape argument
- `buildCommand(base, args)` - Build safe command
- `validateBatch(commands, options?)` - Validate multiple
- `sanitize(command)` - Sanitize command

### SecretsSanitizer

- `detect(content, filePath?)` - Detect secrets
- `redactContent(content)` - Redact secrets
- `redact(secret)` - Redact single secret
- `hasSecrets(content)` - Check for secrets
- `getSecretTypes(content)` - Get secret types

## TypeScript Support

Full TypeScript support with strict type checking:

```typescript
import { InputValidator, type ValidationResult } from '@claude-flow/security';

const validator = InputValidator.object({
  name: InputValidator.string(),
  age: InputValidator.number()
});

type User = ReturnType<typeof validator.parse>;
// { name: string; age: number }

const result: ValidationResult<User> = validator.safeParse(data);
```

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Contributing

Contributions welcome! Please ensure:
- >90% test coverage
- All tests pass
- TypeScript strict mode
- No new dependencies

## License

MIT

## Related

- [@claude-flow/cli](https://www.npmjs.com/package/@claude-flow/cli) - Claude Flow CLI
- [agentscope](https://github.com/vipasane/agentscope) - Agent orchestration framework
