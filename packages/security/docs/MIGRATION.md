# Migration Guide - @claude-flow/security

Complete guide for integrating security validation into your application.

## Table of Contents

- [Quick Start](#quick-start)
- [Integration Patterns](#integration-patterns)
- [Framework Integration](#framework-integration)
- [Migration from Other Libraries](#migration-from-other-libraries)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

```bash
npm install @claude-flow/security
```

### Basic Usage

```typescript
import {
  InputValidator,
  PathValidator,
  SafeExecutor,
  SecretsSanitizer
} from '@claude-flow/security';

// 1. Validate user input
const emailValidator = InputValidator.string({ email: true });
const email = emailValidator.parse(req.body.email);

// 2. Validate file paths
const safePath = PathValidator.validate(userPath);

// 3. Validate commands
const safeCmd = SafeExecutor.validate(userCommand, {
  allowedCommands: ['npm', 'git']
});

// 4. Detect secrets
const findings = SecretsSanitizer.detect(logMessage);
if (findings.length > 0) {
  logMessage = SecretsSanitizer.redactContent(logMessage);
}
```

---

## Integration Patterns

### Pattern 1: Express.js Middleware

Create security middleware for Express applications.

```typescript
import express from 'express';
import { InputValidator, SecretsSanitizer } from '@claude-flow/security';

// Request validation middleware
export function validateRequest(schema: any) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error
      });
    }

    req.body = result.data;
    next();
  };
}

// Secret detection middleware
export function detectSecrets() {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const body = JSON.stringify(req.body);

    if (SecretsSanitizer.hasSecrets(body)) {
      return res.status(400).json({
        error: 'Request contains sensitive information'
      });
    }

    next();
  };
}

// Usage
const UserSchema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  name: InputValidator.string({ min: 1, max: 100 })
});

app.post('/users',
  validateRequest(UserSchema),
  detectSecrets(),
  createUserHandler
);
```

### Pattern 2: File Upload Handler

Secure file upload with path validation.

```typescript
import { PathValidator } from '@claude-flow/security';
import multer from 'multer';
import path from 'path';

const UPLOAD_DIR = '/var/app/uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const safePath = PathValidator.validate(UPLOAD_DIR, {
        allowedDirectories: [UPLOAD_DIR]
      });
      cb(null, safePath);
    } catch (error) {
      cb(error as Error, '');
    }
  },

  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = PathValidator.sanitize(file.originalname);
    const safe = path.basename(sanitized);
    cb(null, `${Date.now()}-${safe}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Validate filename doesn't contain traversal
    if (PathValidator.containsTraversal(file.originalname)) {
      cb(new Error('Invalid filename'));
      return;
    }
    cb(null, true);
  }
});

// Usage
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file?.filename });
});
```

### Pattern 3: CLI Command Execution

Secure subprocess execution.

```typescript
import { SafeExecutor } from '@claude-flow/security';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runNpmCommand(command: string, args: string[]): Promise<string> {
  // Build safe command
  const cmd = SafeExecutor.buildCommand(command, args);

  // Validate
  const validated = SafeExecutor.validate(cmd, {
    allowedCommands: ['npm'],
    blockedCommands: SafeExecutor.DANGEROUS_COMMANDS
  });

  // Execute
  try {
    const { stdout, stderr } = await execAsync(validated, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    });

    return stdout;
  } catch (error) {
    throw new Error(`Command failed: ${(error as Error).message}`);
  }
}

// Usage
async function installPackage(packageName: string) {
  // Validate package name
  const nameValidator = InputValidator.string({
    regex: /^[@a-z0-9-_./]+$/i,
    max: 214
  });

  const safeName = nameValidator.parse(packageName);

  // Execute
  const output = await runNpmCommand('npm', ['install', safeName]);
  console.log(output);
}
```

### Pattern 4: Logging with Secret Redaction

Secure logging that automatically redacts secrets.

```typescript
import { SecretsSanitizer } from '@claude-flow/security';
import winston from 'winston';

// Custom format that redacts secrets
const secretRedactionFormat = winston.format((info) => {
  // Redact message
  if (typeof info.message === 'string') {
    info.message = SecretsSanitizer.redactContent(info.message);
  }

  // Redact metadata
  if (info.meta && typeof info.meta === 'object') {
    const serialized = JSON.stringify(info.meta);
    if (SecretsSanitizer.hasSecrets(serialized)) {
      info.meta = JSON.parse(SecretsSanitizer.redactContent(serialized));
    }
  }

  return info;
});

// Create logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    secretRedactionFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.Console()
  ]
});

// Usage
logger.info('User logged in', {
  userId: 123,
  token: 'sk-ant-xxx...' // Will be redacted automatically
});
```

### Pattern 5: GraphQL Resolver Guards

Secure GraphQL resolvers with validation.

```typescript
import { InputValidator } from '@claude-flow/security';
import { GraphQLError } from 'graphql';

// Create validator directive
export function validateInput(schema: any) {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const [, input] = args;

      const result = schema.safeParse(input);
      if (!result.success) {
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            details: result.error
          }
        });
      }

      args[1] = result.data;
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Usage
const CreateUserInput = InputValidator.object({
  email: InputValidator.string({ email: true }),
  name: InputValidator.string({ min: 1, max: 100 }),
  age: InputValidator.number({ min: 0, int: true }).optional()
});

class UserResolver {
  @validateInput(CreateUserInput)
  async createUser(parent: any, input: any, context: any) {
    // input is validated and typed
    const user = await context.db.users.create(input);
    return user;
  }
}
```

---

## Framework Integration

### Next.js API Routes

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { InputValidator, SecretsSanitizer } from '@claude-flow/security';

const UserSchema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  name: InputValidator.string({ min: 1 })
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate input
  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Check for secrets
  if (SecretsSanitizer.hasSecrets(JSON.stringify(result.data))) {
    return res.status(400).json({ error: 'Request contains secrets' });
  }

  // Process request
  const user = await createUser(result.data);
  res.status(200).json({ user });
}
```

### Fastify Integration

```typescript
import Fastify from 'fastify';
import { InputValidator } from '@claude-flow/security';

const fastify = Fastify();

// Schema validation plugin
fastify.addHook('preValidation', async (request, reply) => {
  if (request.routeOptions.schema?.body) {
    const result = request.routeOptions.schema.body.safeParse(request.body);

    if (!result.success) {
      reply.code(400).send({ error: result.error });
      return;
    }

    request.body = result.data;
  }
});

// Define routes
fastify.post('/users', {
  schema: {
    body: InputValidator.object({
      email: InputValidator.string({ email: true }),
      name: InputValidator.string({ min: 1 })
    })
  },
  handler: async (request, reply) => {
    const user = await createUser(request.body);
    return { user };
  }
});
```

### NestJS Integration

```typescript
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { InputValidator } from '@claude-flow/security';

@Injectable()
export class ValidationPipe implements PipeTransform {
  constructor(private schema: any) {}

  transform(value: any) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error
      });
    }

    return result.data;
  }
}

// Usage in controller
const CreateUserDto = InputValidator.object({
  email: InputValidator.string({ email: true }),
  name: InputValidator.string({ min: 1 })
});

@Controller('users')
export class UsersController {
  @Post()
  create(@Body(new ValidationPipe(CreateUserDto)) createUserDto: any) {
    return this.usersService.create(createUserDto);
  }
}
```

---

## Migration from Other Libraries

### From Zod

```typescript
// Before (Zod)
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0)
});

// After (@claude-flow/security)
import { InputValidator } from '@claude-flow/security';

const schema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ int: true, min: 0 })
});

// API is nearly identical
const result = schema.safeParse(data);
```

### From Joi

```typescript
// Before (Joi)
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0)
});

// After (@claude-flow/security)
import { InputValidator } from '@claude-flow/security';

const schema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ int: true, min: 0 })
});

// Convert from Joi validation
try {
  const value = await schema.validateAsync(data);
} catch (error) {
  // Handle error
}

// To InputValidator
const result = schema.safeParse(data);
if (!result.success) {
  // Handle error
}
```

### From class-validator

```typescript
// Before (class-validator)
import { IsEmail, IsInt, Min, Max } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;
}

// After (@claude-flow/security)
import { InputValidator } from '@claude-flow/security';

const CreateUserSchema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ int: true, min: 0, max: 150 })
});

// No need for class instances
const result = CreateUserSchema.safeParse(plainObject);
```

---

## Best Practices

### 1. Layer Security Checks

```typescript
// Multiple layers of defense
async function handleFileUpload(req: Request) {
  // Layer 1: Input validation
  const schema = InputValidator.object({
    filename: InputValidator.string({ max: 255 })
  });
  const { filename } = schema.parse(req.body);

  // Layer 2: Path validation
  const safePath = PathValidator.validate(filename, {
    allowedDirectories: ['/uploads']
  });

  // Layer 3: Secret detection
  const content = await readFile(safePath);
  const findings = SecretsSanitizer.detect(content);
  if (findings.length > 0) {
    throw new Error('File contains secrets');
  }

  return safePath;
}
```

### 2. Use Type Inference

```typescript
// Leverage TypeScript type inference
const UserSchema = InputValidator.object({
  email: InputValidator.string({ email: true }),
  age: InputValidator.number({ int: true })
});

// TypeScript infers the type
type User = ReturnType<typeof UserSchema.parse>;
// { email: string, age: number }

function createUser(user: User) {
  // user is fully typed
  console.log(user.email, user.age);
}
```

### 3. Create Reusable Validators

```typescript
// common/validators.ts
import { InputValidator } from '@claude-flow/security';

export const EmailValidator = InputValidator.string({
  email: true,
  max: 254
});

export const UsernameValidator = InputValidator.string({
  min: 3,
  max: 50,
  regex: /^[a-zA-Z0-9_-]+$/
});

export const PasswordValidator = InputValidator.string({
  min: 12,
  max: 128
});

export const UserSchema = InputValidator.object({
  email: EmailValidator,
  username: UsernameValidator,
  password: PasswordValidator
});
```

### 4. Centralize Security Configuration

```typescript
// config/security.ts
export const SECURITY_CONFIG = {
  paths: {
    allowed: ['/app/data', '/app/uploads'],
    maxDepth: 10
  },
  commands: {
    allowed: ['npm', 'git', 'node'],
    blocked: ['rm', 'dd', 'mkfs']
  },
  secrets: {
    autoRedact: true,
    logFindings: true
  }
} as const;

// Use throughout application
const safePath = PathValidator.validate(path, {
  allowedDirectories: SECURITY_CONFIG.paths.allowed,
  maxDepth: SECURITY_CONFIG.paths.maxDepth
});
```

### 5. Monitor Security Events

```typescript
import { logger } from './logger';

function securityMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Detect secrets in request
    const findings = SecretsSanitizer.detect(JSON.stringify(req.body));

    if (findings.length > 0) {
      logger.warn('Security: Secrets detected in request', {
        path: req.path,
        ip: req.ip,
        findings: findings.map(f => f.type)
      });
    }

    // Detect path traversal attempts
    const paths = extractPaths(req);
    const traversals = paths.filter(p =>
      PathValidator.containsTraversal(p)
    );

    if (traversals.length > 0) {
      logger.error('Security: Path traversal attempt', {
        path: req.path,
        ip: req.ip,
        attempts: traversals
      });
      return res.status(400).json({ error: 'Invalid paths' });
    }

    next();
  };
}
```

---

## Troubleshooting

### Issue: Validation Too Strict

**Problem:** Validators rejecting valid inputs.

**Solution:** Adjust constraints:

```typescript
// Too strict
const strict = InputValidator.string({ min: 5, max: 10 });

// More lenient
const lenient = InputValidator.string({ min: 1, max: 100 });

// Or make optional
const optional = strict.optional();
```

### Issue: False Positive Secret Detection

**Problem:** SecretsSanitizer detecting non-secrets.

**Solution:** Use entropy threshold:

```typescript
// Customize detection
const findings = SecretsSanitizer.detect(content);

// Filter out low-confidence findings
const highConfidence = findings.filter(f =>
  f.entropy > 5.0 // Higher entropy = more likely a secret
);
```

### Issue: Path Validation Rejecting Valid Paths

**Problem:** PathValidator blocking legitimate paths.

**Solution:** Configure allowed directories:

```typescript
// Allow specific directories
const safe = PathValidator.validate(path, {
  allowedDirectories: [
    '/app/data',
    '/app/uploads',
    '/tmp'
  ]
});

// Or allow traversal for specific cases
const safe = PathValidator.validate(path, {
  allowTraversal: true, // Use with caution
  maxDepth: 5
});
```

### Issue: Performance with Large Inputs

**Problem:** Validation slow for large payloads.

**Solution:** Add size limits:

```typescript
// Limit input size
app.use(express.json({
  limit: '1mb' // Reject payloads > 1MB
}));

// Or validate size before parsing
const MAX_SIZE = 1024 * 1024; // 1MB

if (Buffer.byteLength(requestBody) > MAX_SIZE) {
  throw new Error('Payload too large');
}

const result = schema.safeParse(JSON.parse(requestBody));
```

---

## Next Steps

1. Read the [API Reference](./API.md) for detailed documentation
2. Check out [example integrations](../examples/)
3. Review [security best practices](../../../docs/security/)
4. Join our [community](https://github.com/ruvnet/claude-flow/discussions)

---

## Breaking Changes

### Version 1.0.0

**No breaking changes** - This is the initial release.

Future versions will document breaking changes here with migration paths.

---

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Discussions: https://github.com/ruvnet/claude-flow/discussions
