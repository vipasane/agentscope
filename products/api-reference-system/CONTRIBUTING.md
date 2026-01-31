# Contributing to API Reference System

Thank you for your interest in contributing! This document provides guidelines for contributing to the API Reference Documentation System.

## Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- TypeScript knowledge
- Familiarity with DDD concepts

### Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/claude-flow/api-reference-system.git
cd api-reference-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the project**
```bash
npm run build
```

4. **Run tests**
```bash
npm test
```

5. **Start development**
```bash
npm run watch
```

## Project Structure

```
src/
├── domain/          # Domain models (DDD)
│   ├── shared/      # Shared kernel
│   ├── source-analysis/
│   └── documentation/
├── parser/          # TypeScript and TSDoc parsing
├── generator/       # Documentation renderers
├── validator/       # Example and quality validation
├── search/          # HNSW semantic search
├── watch/           # File watching
├── cli.ts           # CLI interface
└── index.ts         # Public API
```

## Coding Standards

### TypeScript
- Use strict mode
- Explicit return types for public methods
- No `any` types
- Prefer interfaces over type aliases for public APIs

### Naming Conventions
- Classes: PascalCase
- Interfaces: PascalCase
- Functions/Methods: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case.ts

### Example

```typescript
/**
 * Parse TypeScript source file
 *
 * @param filePath - Path to TypeScript file
 * @param options - Parse options
 * @returns Source analysis result
 * @throws {ParseError} When file cannot be parsed
 */
export async function parseFile(
  filePath: FilePath,
  options: ParseOptions
): Promise<SourceAnalysis> {
  // Implementation
}
```

## Domain-Driven Design

This project follows DDD principles:

### Aggregates
- Keep aggregates small
- One aggregate per transaction
- Use IDs for cross-aggregate references

### Value Objects
- Immutable
- Validate in constructor
- Implement equality

### Domain Events
- Past tense naming
- Emit after state change
- Include all necessary data

## Testing

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('FeatureName', () => {
  it('should do something', () => {
    // Arrange
    const input = createInput();

    // Act
    const result = performAction(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Test Coverage
- Maintain >80% coverage
- Test happy paths and error cases
- Use descriptive test names

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes
- Write code following standards
- Add/update tests
- Update documentation

### 3. Commit Changes

Follow conventional commits:

```bash
git commit -m "feat: add HTML renderer"
git commit -m "fix: resolve parser crash on generics"
git commit -m "docs: update README examples"
git commit -m "test: add coverage for validators"
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Maintenance

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## PR Checklist

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Coverage maintained >80%
- [ ] Commit messages follow conventions

## Adding New Features

### New Renderer

```typescript
// 1. Implement Renderer interface
export class CustomRenderer implements Renderer {
  render(doc: Documentation): string {
    // Custom rendering logic
    return output;
  }
}

// 2. Add tests
describe('CustomRenderer', () => {
  it('should render correctly', () => {
    // Test implementation
  });
});

// 3. Export in index.ts
export { CustomRenderer } from './generator/custom-renderer.js';
```

### New Validation Rule

```typescript
// 1. Create validator
export class CustomValidator {
  validate(example: CodeExample): ValidationResult {
    // Validation logic
    return result;
  }
}

// 2. Integrate into ExampleValidator
validator.addRule(new CustomValidator());
```

### New Search Filter

```typescript
// 1. Extend SearchFilter interface
export interface CustomFilter extends SearchFilter {
  customField: string;
}

// 2. Implement in HNSWIndexer
private matchesFilters(entry: IndexEntry, filters: SearchFilter[]): boolean {
  // Handle custom filter
}
```

## Documentation

### TSDoc Comments

All public APIs must have TSDoc comments:

```typescript
/**
 * Brief description of what this does
 *
 * Detailed explanation if needed. Can be multiple
 * paragraphs.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = functionName(param);
 * ```
 *
 * @since 1.0.0
 */
export function functionName(paramName: string): Result {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new CLI commands
- Changing configuration options
- Adding significant features
- Modifying usage patterns

## Performance Considerations

- Use parallel processing where possible
- Cache expensive operations
- Lazy-load large data structures
- Profile before optimizing

## Security

- Never commit secrets or API keys
- Scan examples for PII
- Validate all user input
- Use parameterized queries if adding database

## Release Process

Maintainers will:
1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm
5. Create GitHub release

## Getting Help

- **Issues**: Report bugs or request features
- **Discussions**: Ask questions or share ideas
- **Discord**: Join our community (link TBD)

## Code of Conduct

Be respectful, inclusive, and professional. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
