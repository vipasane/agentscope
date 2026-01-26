# DevContainer Scanner - Implementation Guide

This guide shows how to implement DevContainer Scanner in your project and workflow.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [CLI Integration](#cli-integration)
4. [CI/CD Integration](#cicd-integration)
5. [Advanced Configuration](#advanced-configuration)
6. [Common Scenarios](#common-scenarios)

---

## Installation

### NPM

```bash
npm install @devcontainer-security/scanner
```

### From Source

```bash
git clone https://github.com/devcontainer-security/scanner.git
cd scanner
npm install
npm run build
```

### Global CLI

```bash
npm install -g @devcontainer-security/scanner-cli
```

---

## Basic Usage

### TypeScript/JavaScript API

```typescript
import {
  validateDevContainer,
  calculateDREADScore,
  scanForSecrets,
  analyzeContainerEscapeRisk
} from '@devcontainer-security/scanner';
import fs from 'fs';

// Load configuration
const config = JSON.parse(
  fs.readFileSync('.devcontainer/devcontainer.json', 'utf-8')
);

// Validate
const validation = validateDevContainer(config);
console.log('Valid:', validation.valid);

if (validation.data) {
  // Assess risk
  const risk = calculateDREADScore(validation.data);
  console.log('Risk Level:', risk.priority);

  // Scan for secrets
  const secrets = scanForSecrets(validation.data);
  console.log('Secrets Found:', secrets.found);

  // Analyze escape risk
  const escape = analyzeContainerEscapeRisk(validation.data);
  console.log('Escape Risk:', escape.riskLevel);
}
```

### CLI

```bash
# Basic scan
devcontainer-scanner scan .devcontainer/devcontainer.json

# Verbose output
devcontainer-scanner scan .devcontainer/devcontainer.json --verbose

# Generate report
devcontainer-scanner report .devcontainer/devcontainer.json --output report.json

# Check with fail threshold
devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical

# Auto-fix issues
devcontainer-scanner fix .devcontainer/devcontainer.json --apply
```

---

## CLI Integration

### Installation

```bash
npm install -g @devcontainer-security/scanner-cli
```

### Available Commands

```bash
# Scan for security issues
devcontainer-scanner scan <path>
  --verbose        Show detailed output
  --format json    Output format (json, table, summary)
  --output file    Write to file instead of stdout

# Generate security report
devcontainer-scanner report <path>
  --format html    HTML report
  --template clean Default template
  --style dark     Color theme

# Fix security issues
devcontainer-scanner fix <path>
  --dry-run        Preview changes without applying
  --apply          Apply changes to file
  --backup         Keep backup of original

# Validate configuration
devcontainer-scanner validate <path>
  --strict         Strict validation mode
  --schema version Override schema version

# Check compliance
devcontainer-scanner check <path>
  --policy default Policy to check against
  --fail-on critical Exit code if threshold reached
```

### Example CLI Usage

```bash
# Scan and output JSON
devcontainer-scanner scan .devcontainer/devcontainer.json --format json

# Generate HTML report
devcontainer-scanner report .devcontainer/devcontainer.json --format html --output report.html

# Fix issues automatically
devcontainer-scanner fix .devcontainer/devcontainer.json --apply

# Check for critical issues (CI/CD)
devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical
# Exits with code 1 if critical issues found
```

---

## CI/CD Integration

### GitHub Actions

#### Basic Workflow

```yaml
name: DevContainer Security

on:
  pull_request:
    paths:
      - '.devcontainer/**'
  push:
    branches:
      - main

jobs:
  devcontainer-security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install DevContainer Scanner
        run: npm install -g @devcontainer-security/scanner-cli

      - name: Scan DevContainer
        run: devcontainer-scanner scan .devcontainer/devcontainer.json --verbose

      - name: Check for Critical Issues
        run: devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical

      - name: Generate Report
        if: always()
        run: devcontainer-scanner report .devcontainer/devcontainer.json --format json --output scanner-report.json

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: devcontainer-security-report
          path: scanner-report.json
```

#### Advanced Workflow with Custom Rules

```yaml
name: DevContainer Security - Advanced

on: [pull_request, push]

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm ci

      - name: Install Scanner
        run: npm install @devcontainer-security/scanner

      - name: Create Config
        run: |
          cat > .devcontainer-scanner.json << 'EOF'
          {
            "allowedBaseImages": [
              "^mcr\\.microsoft\\.com/devcontainers/.*",
              "^my-registry\\.com/.*"
            ],
            "blockedFeatures": [
              "docker-in-docker",
              "sshd",
              "kubernetes"
            ],
            "maxEnvironmentVars": 50,
            "failOnRiskLevel": "high"
          }
          EOF

      - name: Scan
        run: npm run scan -- .devcontainer/devcontainer.json --config .devcontainer-scanner.json

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚨 DevContainer security issues found. Please run `npm run devcontainer:fix` to auto-remediate.'
            })
```

### GitLab CI

```yaml
devcontainer-security:
  image: node:18
  stage: security

  script:
    - npm install -g @devcontainer-security/scanner-cli
    - devcontainer-scanner scan .devcontainer/devcontainer.json --verbose
    - devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical
    - devcontainer-scanner report .devcontainer/devcontainer.json --format json --output report.json

  artifacts:
    name: "devcontainer-security-report"
    paths:
      - report.json
    expire_in: 30 days

  allow_failure: false
```

### Jenkins

```groovy
pipeline {
  agent any

  stages {
    stage('DevContainer Security Scan') {
      steps {
        script {
          sh '''
            npm install -g @devcontainer-security/scanner-cli
            devcontainer-scanner scan .devcontainer/devcontainer.json --verbose
            devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical
            devcontainer-scanner report .devcontainer/devcontainer.json --format json --output report.json
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'report.json', allowEmptyArchive: true
    }
    failure {
      emailext(
        subject: 'DevContainer Security Issues',
        body: 'Security scan failed. Check the report.',
        to: '${DEFAULT_RECIPIENTS}'
      )
    }
  }
}
```

---

## Advanced Configuration

### Configuration File

Create `.devcontainer-scanner.json`:

```json
{
  "strictMode": true,
  "allowedBaseImages": [
    "^mcr\\.microsoft\\.com/devcontainers/.*",
    "^my-registry\\.com/trusted/.*"
  ],
  "blockedFeatures": [
    "docker-in-docker",
    "docker-from-docker",
    "sshd",
    "kubernetes"
  ],
  "maxFeatures": 15,
  "maxExtensions": 30,
  "maxEnvironmentVars": 50,
  "maxMounts": 10,
  "allowedMountDirs": [
    "/workspaces",
    "/home/user/projects"
  ],
  "failOnRiskLevel": "high",
  "reportFormat": "json",
  "secretPatterns": [
    "custom_pattern_.*"
  ],
  "customRules": [
    {
      "name": "no-legacy-images",
      "description": "Block legacy base images",
      "severity": "high",
      "check": "image !~ '^mcr\\.microsoft\\.com/devcontainers/typescript.*:18.*'"
    }
  ]
}
```

### Using Configuration File

```bash
# Scan with config
devcontainer-scanner scan .devcontainer/devcontainer.json --config .devcontainer-scanner.json

# Generate with config
devcontainer-scanner report .devcontainer/devcontainer.json --config .devcontainer-scanner.json --format html
```

---

## Common Scenarios

### Scenario 1: Fix Secrets in Environment Variables

**Problem**: Secrets committed to `.devcontainer.json`

```json
{
  "containerEnv": {
    "DATABASE_PASSWORD": "my-secret-password-123",
    "API_KEY": "sk-abc123def456"
  }
}
```

**Solution**:

1. Run scanner to detect:
   ```bash
   devcontainer-scanner scan .devcontainer/devcontainer.json
   # Output: 🚨 Secrets detected in containerEnv.DATABASE_PASSWORD
   ```

2. Auto-remediate:
   ```bash
   devcontainer-scanner fix .devcontainer/devcontainer.json --apply
   # Replaces secrets with [REDACTED]
   ```

3. Update to use environment files:
   ```json
   {
     "containerEnv": {
       "DATABASE_PASSWORD": "${localEnv:DATABASE_PASSWORD}",
       "API_KEY": "${localEnv:API_KEY}"
     }
   }
   ```

### Scenario 2: Remove Privileged Mode

**Problem**: Container running in privileged mode

```json
{
  "runArgs": ["--privileged", "--cap-add=SYS_ADMIN"]
}
```

**Solution**:

1. Detect:
   ```bash
   devcontainer-scanner check .devcontainer/devcontainer.json
   # Output: Critical: Privileged container detected
   ```

2. Auto-fix:
   ```bash
   devcontainer-scanner fix .devcontainer/devcontainer.json --apply --backup
   ```

3. Verify:
   ```bash
   # Check fixed config
   devcontainer-scanner validate .devcontainer/devcontainer.json
   ```

### Scenario 3: Secure Mount Points

**Problem**: Mounting sensitive system directories

```json
{
  "mounts": [
    "source=/etc,target=/host-etc",
    "source=/var/run/docker.sock,target=/docker.sock"
  ]
}
```

**Solution**:

```bash
# Scan and report
devcontainer-scanner report .devcontainer/devcontainer.json --verbose

# Fix with allowed directories
devcontainer-scanner fix .devcontainer/devcontainer.json \
  --allowed-dirs "/workspaces" \
  --allowed-dirs "/home/user" \
  --apply
```

### Scenario 4: Policy Compliance Check

**Problem**: Team needs to enforce security policies

**Solution**: Create team policy

```json
{
  "policies": {
    "team": {
      "name": "Team Development Policy",
      "rules": [
        {
          "name": "no-privileged",
          "severity": "critical",
          "check": "runArgs not contains '--privileged'"
        },
        {
          "name": "no-secrets",
          "severity": "critical",
          "check": "no secrets in containerEnv"
        },
        {
          "name": "approved-images",
          "severity": "high",
          "check": "image matches ^mcr\\.microsoft\\.com/devcontainers/.*"
        },
        {
          "name": "max-features",
          "severity": "medium",
          "check": "features.length <= 5"
        }
      ]
    }
  }
}
```

Then check compliance:

```bash
devcontainer-scanner check .devcontainer/devcontainer.json \
  --policy team \
  --fail-on critical
```

### Scenario 5: Pre-commit Hook

**Problem**: Prevent insecure configs from being committed

**Solution**: Setup pre-commit hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check if devcontainer.json changed
if git diff --cached --name-only | grep -q ".devcontainer/devcontainer.json"; then
  echo "Checking DevContainer security..."

  devcontainer-scanner check .devcontainer/devcontainer.json --fail-on critical

  if [ $? -ne 0 ]; then
    echo "❌ DevContainer has critical security issues!"
    echo "Run: devcontainer-scanner fix .devcontainer/devcontainer.json --apply"
    exit 1
  fi

  echo "✅ DevContainer security check passed"
fi

exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## Troubleshooting

### Common Issues

#### Issue: "File not found" error

```bash
$ devcontainer-scanner scan .devcontainer/devcontainer.json
Error: File not found at .devcontainer/devcontainer.json
```

**Solution**: Check file path

```bash
# Verify file exists
ls -la .devcontainer/devcontainer.json

# Use correct path
devcontainer-scanner scan /absolute/path/to/.devcontainer/devcontainer.json
```

#### Issue: "Invalid JSON" error

```bash
Error: Invalid JSON in configuration file
```

**Solution**: Validate JSON

```bash
# Check JSON syntax
jq . .devcontainer/devcontainer.json

# Use JSON linter
npx jsonlint .devcontainer/devcontainer.json
```

#### Issue: Scanner reports false positives

**Solution**: Configure allowed patterns

```bash
# Create config to allowlist your patterns
cat > .devcontainer-scanner.json << EOF
{
  "customPatterns": [
    "SAFE_PREFIX_.*"
  ]
}
EOF

devcontainer-scanner scan .devcontainer/devcontainer.json --config .devcontainer-scanner.json
```

---

## Best Practices

1. **Always scan before commit**
   - Use pre-commit hooks
   - Enable CI/CD checks

2. **Never hardcode secrets**
   - Use environment files
   - Use secret management systems

3. **Use official base images**
   - Stick to Microsoft official images
   - Avoid custom registries without approval

4. **Minimize privileges**
   - Don't use --privileged
   - Avoid host namespace access

5. **Limit features**
   - Only add needed features
   - Review each feature

6. **Keep scanners updated**
   - Regularly update the tool
   - Review security advisories

---

## Getting Help

- **GitHub Issues**: https://github.com/devcontainer-security/scanner/issues
- **Documentation**: See `/docs` directory
- **Examples**: See `/examples` directory
- **Security Contacts**: security@devcontainer-security.dev

---

**Last Updated**: January 2026
**Version**: 1.0

*Keep your containers secure.*
