# Contributing to AgentScope

Thank you for your interest in contributing to AgentScope! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Definition of Done](#definition-of-done)
- [License](#license)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/agentscope.git
   cd agentscope
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up git hooks**:
   ```bash
   chmod +x .claude/hooks/setup-hooks.sh
   ./.claude/hooks/setup-hooks.sh
   ```

## Development Workflow

### Test-Driven Development (TDD)

**This project requires TDD.** Write tests before implementation.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage
```

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Use Case |
|--------|----------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions/changes |
| `chore/` | Maintenance tasks |

Example: `feat/add-hierarchy-diagram`

## Commit Guidelines

### Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `build` - Build system or external dependencies
- `ci` - CI configuration
- `chore` - Other changes that don't modify src or test files
- `revert` - Reverts a previous commit

**Examples:**
```bash
feat(scanner): add Claude Code config parser
fix(diagram): handle empty agent list gracefully
docs(readme): update installation instructions
test(parser): add edge case for missing hooks
```

### Developer Certificate of Origin (DCO)

All commits must be signed off to certify you have the right to submit the code:

```bash
git commit -s -m "feat(scanner): add new feature"
```

This adds a `Signed-off-by` line to your commit message, indicating you agree to the [DCO](https://developercertificate.org/):

> Developer Certificate of Origin Version 1.1
>
> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications; or
>
> (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public and that a record of the contribution is maintained indefinitely.

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Check code coverage**: `npm run test:coverage` (minimum 80%)
3. **Run linting**: `npm run lint`
4. **Run type checking**: `npm run typecheck`
5. **Update documentation** if needed
6. **Update CHANGELOG.md** under `[Unreleased]`

### PR Template

When creating a PR, fill out the template completely:

- **Summary** - What does this PR do?
- **Type of Change** - Bug fix, feature, breaking change, etc.
- **Related Issues** - Link with `Closes #123` or `Fixes #456`
- **Testing** - How did you test?
- **Checklist** - Verify all items

### Review Process

1. **Automated checks** run first (lint, tests, coverage)
2. **AI review** provides feedback on security, architecture, and simplicity
3. **Human review** required for final approval
4. **Merge** after approval and all checks pass

### After Merge

- Delete your feature branch
- Pull latest changes to your fork

## Definition of Done

A PR is considered "done" when:

### Code Quality
- [ ] Code follows project style guide
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Self-reviewed for clarity

### Testing
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests passing
- [ ] Code coverage >= 80%
- [ ] Edge cases covered

### Documentation
- [ ] Code comments for complex logic
- [ ] README updated if needed
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] API docs updated if applicable

### Compliance
- [ ] All commits have DCO sign-off
- [ ] Conventional commit format used
- [ ] No secrets or credentials in code
- [ ] License headers on new files (if applicable)

### Review
- [ ] PR template completed
- [ ] All automated checks passing
- [ ] At least one human approval
- [ ] No unresolved review comments

## License

By contributing to AgentScope, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](LICENSE) for details.

---

Questions? Open a [Discussion](https://github.com/vipasane/agentscope/discussions) or reach out to the maintainers.
