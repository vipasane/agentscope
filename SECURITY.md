# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release

### Scope

This security policy applies to:
- The AgentScope CLI tool
- Official npm packages
- This GitHub repository

### Out of Scope

- Third-party dependencies (report to their maintainers)
- User misconfiguration
- Social engineering attacks

## Security Design Principles

AgentScope follows these security principles:

1. **No Code Execution** - Only reads and parses configuration files
2. **No Network Access** - All operations are local
3. **No Secrets Handling** - Does not parse or expose API keys
4. **Path Validation** - Prevents directory traversal attacks
5. **Input Sanitization** - All parsed content is sanitized before output

## Security Checklist for Contributors

When contributing, ensure:

- [ ] No hardcoded secrets or credentials
- [ ] No execution of user-provided code
- [ ] Input validation on all external data
- [ ] Path traversal prevention on file operations
- [ ] Dependencies are from trusted sources
- [ ] No verbose error messages exposing internals
