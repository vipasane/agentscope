# @claude-flow/security - API Reference

Complete API documentation for all classes, interfaces, and functions in the security package.

## Table of Contents

- [Validators](#validators)
  - [InputValidator](#inputvalidator)
  - [PathValidator](#pathvalidator)
  - [SafeExecutor](#safeexecutor)
- [Sanitizers](#sanitizers)
  - [SecretsSanitizer](#secretssanitizer)
- [Scoring](#scoring)
  - [DREADScorer](#dreadscorer)
- [Detectors](#detectors)
  - [detectPromptInjection](#detectpromptinjection)
- [Learning](#learning)
  - [SecurityLearningCoordinator](#securitylearningcoordinator)
- [Types](#types)

---

## Validators

### InputValidator

Zod-style validator for runtime type checking and input validation.

#### Static Methods

##### `InputValidator.string(options?: StringOptions)`

Create a string validator with optional constraints.

**Parameters:**
- `options.min?: number` - Minimum length (default: 0)
- `options.max?: number` - Maximum length (default: Infinity)
- `options.email?: boolean` - Validate email format (default: false)
- `options.url?: boolean` - Validate URL format (default: false)
- `options.regex?: RegExp` - Custom regex pattern
- `options.trim?: boolean` - Trim whitespace (default: true)

**Returns:** `ZodType<string>`

**Example:**
```typescript
const emailValidator = InputValidator.string({
  email: true,
  max: 254
});

const result = emailValidator.safeParse('user@example.com');
if (result.success) {
  console.log('Valid email:', result.data);
} else {
  console.error('Invalid:', result.error);
}
```

##### `InputValidator.number(options?: NumberOptions)`

Create a number validator with optional constraints.

**Parameters:**
- `options.min?: number` - Minimum value (inclusive)
- `options.max?: number` - Maximum value (inclusive)
- `options.int?: boolean` - Require integer (default: false)
- `options.positive?: boolean` - Require positive number (default: false)
- `options.negative?: boolean` - Require negative number (default: false)

**Returns:** `ZodType<number>`

**Example:**
```typescript
const ageValidator = InputValidator.number({
  min: 0,
  max: 150,
  int: true
});

const age = ageValidator.parse(25); // ✓
ageValidator.parse(25.5); // throws - not an integer
```

##### `InputValidator.boolean()`

Create a boolean validator.

**Returns:** `ZodType<boolean>`

**Example:**
```typescript
const boolValidator = InputValidator.boolean();
const value = boolValidator.parse(true); // ✓
```

##### `InputValidator.array(itemValidator: ZodType<T>)`

Create an array validator with item validation.

**Parameters:**
- `itemValidator: ZodType<T>` - Validator for array items

**Returns:** `ZodType<T[]>`

**Example:**
```typescript
const tagsValidator = InputValidator.array(
  InputValidator.string({ min: 1, max: 50 })
);

const tags = tagsValidator.parse(['typescript', 'security']); // ✓
```

##### `InputValidator.object(shape: { [key: string]: ZodType<any> })`

Create an object validator with property validation.

**Parameters:**
- `shape: { [key: string]: ZodType<any> }` - Object shape definition

**Returns:** `ZodType<object>`

**Example:**
```typescript
const userValidator = InputValidator.object({
  name: InputValidator.string({ min: 1, max: 100 }),
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ min: 0, int: true })
});

const user = userValidator.parse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
}); // ✓
```

##### `InputValidator.enum(values: readonly T[])`

Create an enum validator.

**Parameters:**
- `values: readonly T[]` - Allowed enum values

**Returns:** `ZodType<T>`

**Example:**
```typescript
const roleValidator = InputValidator.enum(['admin', 'user', 'guest'] as const);
const role = roleValidator.parse('admin'); // ✓
roleValidator.parse('superadmin'); // throws
```

##### `InputValidator.literal(value: T)`

Create a literal value validator.

**Parameters:**
- `value: T` - Exact value to match

**Returns:** `ZodType<T>`

**Example:**
```typescript
const statusValidator = InputValidator.literal('active');
statusValidator.parse('active'); // ✓
statusValidator.parse('inactive'); // throws
```

##### `InputValidator.sanitizeInput(input: string)`

Sanitize string input by removing dangerous characters.

**Parameters:**
- `input: string` - Input to sanitize

**Returns:** `string` - Sanitized input

**Example:**
```typescript
const safe = InputValidator.sanitizeInput('hello\x00world'); // 'helloworld'
```

#### Instance Methods

##### `validator.parse(value: unknown)`

Parse and validate value, throwing on error.

**Parameters:**
- `value: unknown` - Value to validate

**Returns:** `T` - Validated value

**Throws:** `ValidationError` if validation fails

**Example:**
```typescript
const validator = InputValidator.string({ min: 1 });
const value = validator.parse('hello'); // ✓
validator.parse(''); // throws
```

##### `validator.safeParse(value: unknown)`

Parse and validate value, returning result object.

**Parameters:**
- `value: unknown` - Value to validate

**Returns:** `ValidationResult<T>`
- `success: true, data: T` if valid
- `success: false, error: string` if invalid

**Example:**
```typescript
const result = validator.safeParse('hello');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

##### `validator.optional()`

Make validator optional (allows undefined).

**Returns:** `ZodType<T | undefined>`

**Example:**
```typescript
const optionalName = InputValidator.string().optional();
optionalName.parse(undefined); // ✓
optionalName.parse('John'); // ✓
```

##### `validator.nullable()`

Make validator nullable (allows null).

**Returns:** `ZodType<T | null>`

**Example:**
```typescript
const nullableName = InputValidator.string().nullable();
nullableName.parse(null); // ✓
nullableName.parse('John'); // ✓
```

---

### PathValidator

Prevent path traversal attacks and validate file paths.

#### Static Methods

##### `PathValidator.validate(path: string, options?: PathValidationOptions)`

Validate and normalize a file path.

**Parameters:**
- `path: string` - Path to validate
- `options.allowedDirectories?: string[]` - Allowed directories (whitelist)
- `options.allowTraversal?: boolean` - Allow `../` sequences (default: false)
- `options.maxDepth?: number` - Maximum directory depth (default: 10)

**Returns:** `string` - Normalized absolute path

**Throws:** `Error` if path is invalid or contains traversal

**Example:**
```typescript
// Valid path
const safe = PathValidator.validate('data/file.txt');
// Returns: '/absolute/path/to/data/file.txt'

// Invalid: path traversal
try {
  PathValidator.validate('../../../etc/passwd');
} catch (error) {
  console.error('Path traversal detected!');
}

// With allowed directories
const validated = PathValidator.validate('uploads/user.jpg', {
  allowedDirectories: ['/app/uploads', '/app/data']
});
```

##### `PathValidator.isSafe(path: string)`

Check if path is safe without throwing.

**Parameters:**
- `path: string` - Path to check

**Returns:** `boolean` - True if safe, false otherwise

**Example:**
```typescript
if (PathValidator.isSafe(userPath)) {
  // Safe to use
} else {
  // Reject request
}
```

##### `PathValidator.containsTraversal(path: string)`

Check if path contains traversal sequences.

**Parameters:**
- `path: string` - Path to check

**Returns:** `boolean` - True if contains `../` or similar

**Example:**
```typescript
PathValidator.containsTraversal('../file.txt'); // true
PathValidator.containsTraversal('data/file.txt'); // false
```

##### `PathValidator.sanitize(path: string)`

Sanitize path by removing dangerous patterns.

**Parameters:**
- `path: string` - Path to sanitize

**Returns:** `string` - Sanitized path

**Example:**
```typescript
const safe = PathValidator.sanitize('../../../data/file.txt');
// Returns: 'data/file.txt'
```

##### `PathValidator.getRelative(path: string, baseDir: string)`

Get relative path from base directory.

**Parameters:**
- `path: string` - Absolute path
- `baseDir: string` - Base directory

**Returns:** `string` - Relative path

**Example:**
```typescript
const relative = PathValidator.getRelative(
  '/app/data/file.txt',
  '/app'
);
// Returns: 'data/file.txt'
```

---

### SafeExecutor

Prevent command injection in shell commands.

#### Static Properties

##### `SafeExecutor.DANGEROUS_COMMANDS`

List of dangerous shell commands to block.

**Type:** `readonly string[]`

**Value:** `['rm', 'dd', 'mkfs', 'format', '>', '>>', '|', ';', '&', '$(', '`']`

**Example:**
```typescript
const blocked = SafeExecutor.DANGEROUS_COMMANDS;
console.log(blocked); // ['rm', 'dd', 'mkfs', ...]
```

#### Static Methods

##### `SafeExecutor.validate(command: string, options?: CommandValidationOptions)`

Validate command for safe execution.

**Parameters:**
- `command: string` - Command to validate
- `options.allowedCommands?: string[]` - Allowed command whitelist
- `options.blockedCommands?: string[]` - Blocked command list (default: DANGEROUS_COMMANDS)
- `options.requireShellEscape?: boolean` - Require shell escaping (default: true)
- `options.maxLength?: number` - Maximum command length (default: 10000)

**Returns:** `string` - Validated command

**Throws:** `Error` if command is invalid or dangerous

**Example:**
```typescript
// With whitelist
const safe = SafeExecutor.validate('npm test', {
  allowedCommands: ['npm', 'node', 'git']
});

// Block dangerous commands
try {
  SafeExecutor.validate('rm -rf /');
} catch (error) {
  console.error('Dangerous command blocked!');
}

// With escaping
const escaped = SafeExecutor.validate('git commit -m "message"', {
  requireShellEscape: true
});
```

##### `SafeExecutor.containsInjection(command: string)`

Check if command contains injection patterns.

**Parameters:**
- `command: string` - Command to check

**Returns:** `boolean` - True if injection detected

**Example:**
```typescript
SafeExecutor.containsInjection('npm test'); // false
SafeExecutor.containsInjection('npm test; rm -rf /'); // true
SafeExecutor.containsInjection('npm test && cat /etc/passwd'); // true
```

##### `SafeExecutor.escapeShellArg(arg: string)`

Escape shell argument for safe usage.

**Parameters:**
- `arg: string` - Argument to escape

**Returns:** `string` - Escaped argument

**Example:**
```typescript
const escaped = SafeExecutor.escapeShellArg("it's dangerous");
// Returns: 'it'\''s dangerous'

const cmd = `echo ${escaped}`;
// Safe to execute
```

##### `SafeExecutor.buildCommand(base: string, args: string[])`

Build safe command from base and arguments.

**Parameters:**
- `base: string` - Base command
- `args: string[]` - Command arguments

**Returns:** `string` - Escaped command

**Example:**
```typescript
const cmd = SafeExecutor.buildCommand('git', [
  'commit',
  '-m',
  'User message with spaces and "quotes"'
]);
// Returns: git 'commit' '-m' 'User message with spaces and "quotes"'
```

##### `SafeExecutor.validateBatch(commands: string[], options?: CommandValidationOptions)`

Validate multiple commands.

**Parameters:**
- `commands: string[]` - Commands to validate
- `options: CommandValidationOptions` - Validation options

**Returns:** `string[]` - Validated commands

**Throws:** `Error` if any command is invalid

**Example:**
```typescript
const commands = SafeExecutor.validateBatch(
  ['npm test', 'npm run build', 'npm run deploy'],
  { allowedCommands: ['npm'] }
);
```

##### `SafeExecutor.sanitize(command: string)`

Sanitize command by removing dangerous patterns.

**Parameters:**
- `command: string` - Command to sanitize

**Returns:** `string` - Sanitized command

**Example:**
```typescript
const safe = SafeExecutor.sanitize('npm test; echo "done"');
// Removes dangerous ';' separator
```

---

## Sanitizers

### SecretsSanitizer

Detect and redact sensitive information in code and logs.

#### Static Methods

##### `SecretsSanitizer.detect(content: string, filePath?: string)`

Detect secrets in content.

**Parameters:**
- `content: string` - Content to scan
- `filePath?: string` - Optional file path for context

**Returns:** `SecretFinding[]` - Array of detected secrets

**Example:**
```typescript
const code = `
  const config = {
    apiKey: "sk-ant-${('x').repeat(95)}"
  };
`;

const findings = SecretsSanitizer.detect(code, 'config.ts');
findings.forEach(f => {
  console.log(`${f.severity}: ${f.type}`);
  console.log(`Line ${f.location.line}: ${f.value}`);
  console.log(`Fix: ${f.remediation}`);
});
```

##### `SecretsSanitizer.redactContent(content: string)`

Redact all secrets in content.

**Parameters:**
- `content: string` - Content to redact

**Returns:** `string` - Content with secrets replaced

**Example:**
```typescript
const code = 'const key = "sk-ant-xxx...";';
const redacted = SecretsSanitizer.redactContent(code);
// Returns: 'const key = "[REDACTED:ANTHROPIC_API_KEY]";'
```

##### `SecretsSanitizer.redact(secret: string)`

Redact a single secret value.

**Parameters:**
- `secret: string` - Secret to redact

**Returns:** `string` - Redacted value (first 4 + last 4 chars)

**Example:**
```typescript
const redacted = SecretsSanitizer.redact('sk-ant-api03-XXXXXXX');
// Returns: 'sk-a...XXXX'
```

##### `SecretsSanitizer.hasSecrets(content: string)`

Check if content contains secrets.

**Parameters:**
- `content: string` - Content to check

**Returns:** `boolean` - True if secrets detected

**Example:**
```typescript
if (SecretsSanitizer.hasSecrets(logMessage)) {
  console.warn('⚠️  Secrets detected in log!');
  logMessage = SecretsSanitizer.redactContent(logMessage);
}
```

##### `SecretsSanitizer.getSecretTypes(content: string)`

Get types of secrets present in content.

**Parameters:**
- `content: string` - Content to analyze

**Returns:** `string[]` - Array of secret type names

**Example:**
```typescript
const types = SecretsSanitizer.getSecretTypes(code);
// ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN']
```

#### Supported Secret Types

| Type | Pattern | Example |
|------|---------|---------|
| ANTHROPIC_API_KEY | `sk-ant-api03-...` | Anthropic API keys |
| OPENAI_API_KEY | `sk-...` | OpenAI API keys |
| GOOGLE_API_KEY | `AIza...` | Google API keys |
| AWS_ACCESS_KEY | `AKIA...` | AWS access keys |
| GITHUB_TOKEN | `ghp_...`, `gho_...` | GitHub tokens |
| GITHUB_OAUTH | `gho_...` | GitHub OAuth tokens |
| GITHUB_APP | `(ghp|ghs)_...` | GitHub App tokens |
| SLACK_TOKEN | `xox[baprs]-...` | Slack tokens |
| PRIVATE_KEY | `-----BEGIN.*KEY-----` | Private keys |
| BASIC_AUTH | `://[^:]+:[^@]+@` | Basic auth credentials |
| BEARER_TOKEN | `Bearer [A-Za-z0-9\\-._~+/]+=*` | Bearer tokens |
| PASSWORD | `password['"]?\s*[:=]\s*['"]` | Password assignments |
| HIGH_ENTROPY | Shannon entropy > 4.5 | Unknown secrets |

---

## Scoring

### DREADScorer

Calculate DREAD risk scores for security findings.

#### Static Methods

##### `DREADScorer.scoreVulnerability(finding: SecurityFinding)`

Calculate DREAD score for a security finding.

**Parameters:**
- `finding: SecurityFinding` - Security finding to score

**Returns:** `DREADScore` - DREAD score breakdown

**Example:**
```typescript
const finding = {
  type: 'SECRET',
  severity: 'HIGH',
  message: 'API key detected'
};

const score = DREADScorer.scoreVulnerability(finding);
console.log(`Total: ${score.total}/10`);
console.log(`Damage: ${score.damage}/2`);
console.log(`Reproducibility: ${score.reproducibility}/2`);
```

##### `DREADScorer.scoreConfiguration(config: AgentConfig)`

Score agent configuration for security risks.

**Parameters:**
- `config: AgentConfig` - Agent configuration

**Returns:** `DREADScore` - Risk score

##### `DREADScorer.scoreHook(hook: Hook)`

Score hook for security risks.

**Parameters:**
- `hook: Hook` - Hook to score

**Returns:** `DREADScore` - Risk score

##### `DREADScorer.scoreMcpServer(server: McpServer)`

Score MCP server for security risks.

**Parameters:**
- `server: McpServer` - MCP server config

**Returns:** `DREADScore` - Risk score

---

## Detectors

### detectPromptInjection

Detect prompt injection attempts in user input.

**Signature:**
```typescript
function detectPromptInjection(
  input: string,
  options?: DetectionOptions
): PromptInjectionResult
```

**Parameters:**
- `input: string` - User input to analyze
- `options.threshold?: number` - Detection threshold 0-1 (default: 0.7)
- `options.checkPatterns?: boolean` - Check known patterns (default: true)
- `options.checkEntropy?: boolean` - Check entropy anomalies (default: true)

**Returns:** `PromptInjectionResult`
- `isInjection: boolean` - True if injection detected
- `confidence: number` - Confidence score 0-1
- `patterns: string[]` - Matched patterns
- `suggestions: string[]` - Mitigation suggestions

**Example:**
```typescript
const result = detectPromptInjection(userInput, {
  threshold: 0.8,
  checkPatterns: true
});

if (result.isInjection) {
  console.warn(`Injection detected (${result.confidence})`);
  console.warn('Matched patterns:', result.patterns);
  console.log('Suggestions:', result.suggestions);
}
```

---

## Learning

### SecurityLearningCoordinator

Adaptive learning system for security pattern recognition.

#### Constructor

```typescript
new SecurityLearningCoordinator(options?: {
  memoryNamespace?: string;
  learningRate?: number;
  minConfidence?: number;
})
```

**Parameters:**
- `options.memoryNamespace?: string` - Memory namespace (default: 'security-learning')
- `options.learningRate?: number` - Learning rate 0-1 (default: 0.1)
- `options.minConfidence?: number` - Minimum confidence threshold (default: 0.7)

#### Methods

##### `async learn(finding: SecurityFinding, feedback: SecurityFeedback)`

Learn from security finding and feedback.

**Parameters:**
- `finding: SecurityFinding` - Security finding
- `feedback: SecurityFeedback` - User feedback on finding

**Returns:** `Promise<void>`

**Example:**
```typescript
const coordinator = new SecurityLearningCoordinator();

await coordinator.learn(finding, {
  isAccurate: true,
  isFalsePositive: false,
  suggestedSeverity: 'HIGH'
});
```

##### `async getPatterns(category?: ThreatCategory)`

Get learned threat patterns.

**Parameters:**
- `category?: ThreatCategory` - Filter by category

**Returns:** `Promise<ThreatPattern[]>`

##### `async assess(context: any)`

Assess security context using learned patterns.

**Parameters:**
- `context: any` - Security context to assess

**Returns:** `Promise<SecurityAssessment>`

##### `async optimize()`

Generate optimization recommendations.

**Returns:** `Promise<RiskOptimization[]>`

---

## Types

### Core Types

```typescript
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface LocationInfo {
  line: number;
  column: number;
  file?: string;
}

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Security Findings

```typescript
interface SecurityFinding {
  type: string;
  severity: Severity;
  message: string;
  location?: LocationInfo;
  remediation?: string;
}

interface SecretFinding extends SecurityFinding {
  secretType: string;
  value: string;
  entropy: number;
}

interface InjectionFinding extends SecurityFinding {
  injectionType: 'COMMAND' | 'PATH' | 'PROMPT';
  pattern: string;
}
```

### Validation Options

```typescript
interface PathValidationOptions {
  allowedDirectories?: string[];
  allowTraversal?: boolean;
  maxDepth?: number;
}

interface CommandValidationOptions {
  allowedCommands?: string[];
  blockedCommands?: string[];
  requireShellEscape?: boolean;
  maxLength?: number;
}
```

### DREAD Scoring

```typescript
interface DREADScore {
  damage: number;          // 0-2
  reproducibility: number; // 0-2
  exploitability: number;  // 0-2
  affectedUsers: number;   // 0-2
  discoverability: number; // 0-2
  total: number;           // 0-10
}

interface DREADBreakdown {
  score: DREADScore;
  explanation: string;
  recommendations: string[];
}
```

---

## Error Handling

All methods throw standard JavaScript `Error` objects with descriptive messages:

```typescript
try {
  PathValidator.validate('../../../etc/passwd');
} catch (error) {
  console.error(error.message); // "Path traversal detected"
}
```

Validation errors include details:

```typescript
const result = validator.safeParse(invalidData);
if (!result.success) {
  console.error(result.error); // "String must be at least 1 character"
}
```

---

## Performance Guarantees

| Operation | Target | Typical |
|-----------|--------|---------|
| Input validation | <50ms | ~10ms |
| Path validation | <50ms | ~5ms |
| Command validation | <50ms | ~5ms |
| Secret scanning | <100ms | ~20ms |
| DREAD scoring | <10ms | ~2ms |
| Prompt injection detection | <50ms | ~15ms |

---

## Thread Safety

All classes are designed for single-threaded use. For concurrent usage:

1. Create separate instances per thread/worker
2. Use locking mechanisms for shared state
3. Consider using immutable patterns

---

## See Also

- [README](../README.md) - Package overview
- [MIGRATION](./MIGRATION.md) - Integration guide
- [ADR-012](../../../docs/adr/ADR-012-agent-security-architecture.md) - Security architecture
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
