# DevContainer Scanner

A comprehensive security scanner and analyzer for VS Code DevContainer configurations.

## What is DevContainer Scanner?

DevContainer Scanner is a specialized security tool that analyzes `.devcontainer/devcontainer.json` files to identify security vulnerabilities, configuration issues, and best practice violations in containerized development environments.

It provides:
- **Security scanning** with DREAD risk analysis
- **Vulnerability detection** for container escape, privilege escalation, and path traversal
- **Secret detection** in environment variables and lifecycle commands
- **Configuration validation** using strict Zod schemas
- **Automated remediation** with sanitization suggestions
- **Comprehensive reporting** with actionable recommendations

## Target Users

- **DevOps Engineers**: Ensure container configurations meet security policies
- **Platform Engineers**: Build secure DevContainer templates for teams
- **Security Teams**: Audit container configurations across projects
- **Development Teams**: Secure containerized development workflows
- **CI/CD Maintainers**: Integrate container security into pipelines

## Why a Separate Tool?

DevContainer Scanner is separate from AgentScope to provide:

1. **Focused Expertise**: Specialized container security knowledge
2. **Flexible Integration**: Use standalone or integrated with larger systems
3. **Zero Dependencies**: Can run in isolated environments
4. **Reusable Components**: Validators and sanitizers for other projects
5. **Rapid Iteration**: Independent release cycle from AgentScope
6. **Community Contribution**: Easier for security researchers to contribute

## Key Differentiators

### vs. Standard DevContainer Validation
- **Security-First**: DREAD scoring and vulnerability analysis
- **Secrets Detection**: Pattern matching for API keys, tokens, credentials
- **Container Escape Analysis**: Identifies privilege escalation vectors
- **Automated Remediation**: Suggests and applies security fixes

### vs. General Container Scanners
- **DevContainer Specific**: Understands VSCode customizations and features
- **Lifecycle Integration**: Analyzes postCreate, postStart, postAttach commands
- **Agent System Aware**: Detects Claude Code and agent configurations
- **Development Context**: Focuses on developer machine security

### vs. Ad-hoc Checking
- **Automated**: CI/CD integration and scheduled scanning
- **Comprehensive**: Five-layer security architecture
- **Consistent**: Deterministic analysis and scoring
- **Traceable**: Detailed reports and audit logs

## Quick Start

### Installation

```bash
npm install @devcontainer-security/scanner
```

### Basic Usage

```typescript
import { scanDevContainer, generateReport } from '@devcontainer-security/scanner';

// Scan a devcontainer.json file
const result = await scanDevContainer('/project/.devcontainer/devcontainer.json');

// Generate security report
const report = generateReport(result);
console.log(report);
```

### CLI Usage

```bash
# Scan current project
devcontainer-scanner scan

# Scan with detailed output
devcontainer-scanner scan --verbose

# Generate HTML report
devcontainer-scanner scan --format html --output report.html

# Apply automatic remediation
devcontainer-scanner fix --apply

# Integration with pre-commit
devcontainer-scanner check --fail-on critical
```

## Features

### 1. Security Validation (Zod Schemas)

Type-safe validation prevents malformed configurations:
- Base image allowlist (Microsoft official images only)
- Environment variable constraints
- Port forwarding limits
- Feature and extension counts
- Mount point validation
- Lifecycle command limits

### 2. DREAD Risk Analysis

Quantitative risk scoring (0-10 scale):
- **Damage**: Impact potential from configuration
- **Reproducibility**: How easily exploited
- **Exploitability**: Effort required to exploit
- **Affected Users**: Scope of impact
- **Discoverability**: How easily found

Priority levels: critical, high, medium, low

### 3. Secrets Detection

Pattern matching for:
- API keys (OpenAI, GitHub, GitLab, AWS)
- Authentication tokens
- Database connection strings
- Private keys (RSA, DSA, EC, SSH, PGP)
- Generic password patterns

### 4. Container Escape Analysis

Detects vulnerabilities:
- Privileged mode flags
- Host namespace access (--pid=host, --network=host, --ipc=host)
- Dangerous capabilities (SYS_ADMIN, etc.)
- Sensitive mount points (/etc, /sys, /proc, /dev, docker.sock)
- Disabled security options (AppArmor, seccomp)

### 5. Automated Remediation

Sanitization functions:
- Redact detected secrets
- Remove privileged runArgs
- Validate mount paths
- Sanitize lifecycle commands
- Block dangerous features

## Documentation

- **[Research](./docs/research/)**: Problem analysis and context
- **[Architecture Decisions (ADRs)](./docs/adr/)**:
  - ADR-008: DevContainer Scanner design
  - ADR-009: Lifecycle hooks integration
  - ADR-011: Security architecture
  - DDD-002: Domain model
- **[Security](./docs/security/)**:
  - Security README with threat model
  - Architecture diagrams
  - Completion report

## Project Structure

```
devcontainer-scanner-project/
├── README.md                          # This file
├── docs/
│   ├── research/
│   │   └── devcontainer-analysis.md   # Problem analysis
│   ├── adr/
│   │   ├── ADR-008-devcontainer-scanner.md
│   │   ├── ADR-009-devcontainer-lifecycle-hooks.md
│   │   ├── ADR-011-devcontainer-security.md
│   │   └── DDD-002-devcontainer-domain.md
│   └── security/
│       ├── DEVCONTAINER-SECURITY-README.md
│       ├── ARCHITECTURE-DIAGRAM.md
│       └── COMPLETION-REPORT.md
├── src/
│   └── security/
│       ├── devcontainer-validators.ts
│       └── devcontainer-sanitizers.ts
├── examples/
│   ├── devcontainer-scanning.ts
│   └── devcontainer-implementation-example.md
├── ROADMAP.md
└── PRODUCT-VISION.md
```

## API Reference

### Core Functions

#### `scanDevContainer(filePath: string): Promise<ScanResult>`

Scans a DevContainer configuration file.

**Returns**: Comprehensive scan result including validation, DREAD score, secrets, and vulnerabilities.

#### `validateDevContainer(config: unknown): ValidationResult`

Validates configuration against strict schema.

**Returns**: Valid/invalid status with detailed error messages.

#### `calculateDREADScore(config: DevContainerConfig): DREADScore`

Performs DREAD risk analysis.

**Returns**: Damage, reproducibility, exploitability, affected users, discoverability scores and priority.

#### `scanForSecrets(config: DevContainerConfig): SecretScanResult`

Detects secrets in configuration.

**Returns**: Found status and locations of detected secrets.

#### `analyzeContainerEscapeRisk(config: DevContainerConfig): ContainerEscapeRisk`

Identifies container escape vulnerabilities.

**Returns**: Risk level and specific vulnerabilities.

#### `sanitizeDevContainer(config: DevContainerConfig, allowedDirs: string[]): SanitizationResult`

Applies security sanitization.

**Returns**: Sanitized config and detailed change log.

### Types

See `src/security/devcontainer-validators.ts` for complete type definitions:

- `DevContainerConfig`: Main configuration object
- `DREADScore`: Risk scoring result
- `ContainerEscapeRisk`: Escape vulnerability analysis
- `SanitizationResult`: Remediation results

## Examples

### Scanning a DevContainer

```typescript
import { scanDevContainer } from '@devcontainer-security/scanner';

const result = await scanDevContainer('./.devcontainer/devcontainer.json');

console.log('Risk Level:', result.dreadScore.priority);
console.log('Total Risk:', result.dreadScore.totalRisk);
console.log('Secrets Found:', result.secrets.found);
console.log('Container Escape Risk:', result.escapeRisk.riskLevel);
```

### Applying Automatic Remediation

```typescript
import { sanitizeDevContainer, generateSanitizationReport } from '@devcontainer-security/scanner';

const config = JSON.parse(fs.readFileSync('./.devcontainer/devcontainer.json', 'utf-8'));
const result = sanitizeDevContainer(config, ['/workspaces', '/home']);

console.log(generateSanitizationReport(result));

// Save sanitized config
fs.writeFileSync('./.devcontainer/devcontainer.json', JSON.stringify(result.sanitized, null, 2));
```

### CI/CD Integration

```bash
#!/bin/bash
# .github/workflows/container-security.yml

devcontainer-scanner check .devcontainer/devcontainer.json \
  --fail-on critical \
  --report json \
  --output ./container-security-report.json

if [ $? -ne 0 ]; then
  echo "Container security check failed"
  exit 1
fi
```

## Integration Options

### With AgentScope v1.2+

DevContainer Scanner is integrated into AgentScope:

```bash
# Scan project (includes DevContainer if present)
agentscope scan

# Exclude DevContainer from scan
agentscope scan --exclude-devcontainer

# Show DevContainer details
agentscope scan --show-devcontainer-info
```

### Standalone Usage

```bash
# Install and use independently
npm install -g @devcontainer-security/scanner

devcontainer-scanner scan ./path/to/.devcontainer
```

### GitHub Actions Integration

```yaml
- name: Scan DevContainer Security
  uses: devcontainer-security/scanner-action@v1
  with:
    path: .devcontainer/devcontainer.json
    fail-on: critical
    report-format: json
```

## Configuration

### Custom Allowed Images

```typescript
import { createScanner } from '@devcontainer-security/scanner';

const scanner = createScanner({
  allowedBaseImages: [
    /^my-registry\.com\/devcontainers\/.+$/,
    /^mcr\.microsoft\.com\/devcontainers\/.+$/
  ]
});
```

### Custom Sanitization Rules

```typescript
const rules = {
  maxFeatures: 20,
  maxEnvironmentVariables: 100,
  allowedMountDirs: ['/workspaces', '/home/user/projects'],
  blockedFeatures: ['docker-in-docker', 'sshd']
};

const result = await scanner.scan(config, rules);
```

## Performance

- **Scan Time**: ~50ms for typical DevContainer configurations
- **Memory**: ~5MB for parser and validators
- **Scaling**: Handles configurations up to 1MB

## Security Considerations

### What This Tool Does

- Validates DevContainer JSON syntax and structure
- Detects common security misconfigurations
- Identifies potential secrets in configuration
- Analyzes privilege escalation vectors
- Recommends remediation steps

### What This Tool Does NOT Do

- Execute container builds or runtime commands
- Access running containers or Docker daemon
- Perform dynamic container escape testing
- Scan container images themselves
- Monitor runtime behavior

### Safe by Design

- No code execution from parsed configurations
- Static analysis only (no container access)
- Strict input validation (Zod schemas)
- Deterministic outputs (same input = same output)
- No network access

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features:
- Dockerfile scanning integration
- Docker Compose integration
- Multi-stage DevContainer support
- Feature dependency analysis
- Custom rule engine
- Web UI dashboard
- API server mode
- Multi-project scanning

## Contributing

We welcome contributions! Areas of interest:

- Additional security patterns and rules
- Integration with other container tools
- Performance optimizations
- Documentation improvements
- Example DevContainer configurations
- Community templates and best practices

## License

MIT - See LICENSE file for details

## Related Projects

- **[AgentScope](https://github.com/vipasane/agentscope)**: Configuration scanner for Claude Code (includes DevContainer Scanner)
- **[DevContainer Spec](https://containers.dev/)**: Official DevContainer specification
- **[VSCode DevContainers](https://code.visualstudio.com/docs/devcontainers/containers)**: VSCode DevContainer documentation

## Support

- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join community discussions
- **Documentation**: Full docs at `./docs/`
- **Examples**: See `./examples/` directory

---

**Built for security-conscious development teams. Secure containers start here.**
