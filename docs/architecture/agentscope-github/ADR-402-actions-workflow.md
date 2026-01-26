# ADR-402: GitHub Actions Workflow Architecture

## Status
Accepted

## Context

GitHub Actions provides the runtime environment for AgentScope-GitHub. The workflow design must balance:

1. **Performance**: Scan 1,000 files in <5 minutes
2. **Cost**: Minimize Actions minutes consumption
3. **Usability**: Zero-config setup for 90% of users
4. **Flexibility**: Advanced customization when needed
5. **Reliability**: Handle transient failures gracefully

### GitHub Actions Capabilities

**Execution Environment**:
- Runners: `ubuntu-latest`, `macos-latest`, `windows-latest`
- Node.js: 20+ (for TypeScript action)
- Python: 3.10+ (for Python agent analysis)
- Timeout: 6 hours max
- Concurrency: 20 jobs per repository

**Caching**:
- Actions cache: Up to 10 GB per repository
- Cache eviction: LRU after 7 days
- Cache key: Hash of dependencies

**Outputs**:
- Action outputs available to subsequent steps
- Artifacts for long-term storage (90 days)
- Logs retained for 90 days

## Decision

We will provide **3 workflow templates** targeting different use cases:

### 1. Basic Scan Template

**File**: `.github/workflows/agentscope-scan.yml`

**Use Case**: Simple projects, quick setup, default rules

```yaml
name: AgentScope Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  security-events: write
  pull-requests: write
  checks: write

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run AgentScope scan
        uses: agentscope/scan-action@v1
        with:
          severity-threshold: high
          fail-on: critical
```

**Features**:
- Runs on push and PR
- Default severity: high
- Fails on critical findings
- Auto-uploads SARIF, posts PR comments

### 2. Advanced Scan Template

**File**: `.github/workflows/agentscope-advanced.yml`

**Use Case**: Teams with custom rules, specific paths, reporting needs

```yaml
name: AgentScope Advanced Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write
  pull-requests: write
  checks: write

jobs:
  scan:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]  # Test multiple Node versions

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for delta scanning

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run AgentScope scan
        id: scan
        uses: agentscope/scan-action@v1
        with:
          config-file: .agentscope.json
          upload-sarif: true
          comment-pr: true
          diff-only: true
          max-findings: 100
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload SARIF artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentscope-sarif-${{ matrix.node-version }}
          path: agentscope-results.sarif

      - name: Notify Slack on failure
        if: steps.scan.outputs.critical-count > 0
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚨 AgentScope found ${{ steps.scan.outputs.critical-count }} critical issues",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Critical Security Findings*\n• Total: ${{ steps.scan.outputs.findings-count }}\n• Critical: ${{ steps.scan.outputs.critical-count }}\n• High: ${{ steps.scan.outputs.high-count }}"
                }
              }]
            }'
```

**Features**:
- Matrix builds (test multiple versions)
- Custom configuration file
- Delta scanning (only changed files)
- SARIF artifact upload
- Slack notifications
- Uses action outputs for conditional logic

### 3. Scheduled Audit Template

**File**: `.github/workflows/agentscope-audit.yml`

**Use Case**: Weekly security audits, compliance reporting

```yaml
name: Weekly Security Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # Sunday midnight UTC
  workflow_dispatch:     # Manual trigger

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Full security audit
        uses: agentscope/scan-action@v1
        with:
          full-scan: true
          generate-report: true
          severity-threshold: low
          upload-sarif: true

      - name: Generate HTML report
        run: |
          npx @agentscope/cli report generate \
            --input agentscope-results.sarif \
            --output report.html \
            --format html

      - name: Upload report artifact
        uses: actions/upload-artifact@v4
        with:
          name: security-audit-report
          path: report.html
          retention-days: 90

      - name: Email report to security team
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          subject: Weekly Security Audit - ${{ github.repository }}
          to: security@example.com
          from: GitHub Actions
          body: See attached HTML report
          attachments: report.html
```

**Features**:
- Scheduled execution (weekly)
- Full repository scan (no delta)
- HTML report generation
- Long-term artifact retention
- Email notifications

### Action Inputs Reference

```yaml
inputs:
  config-file:
    description: 'Path to .agentscope.json'
    required: false
    default: '.agentscope.json'

  severity-threshold:
    description: 'Minimum severity to report'
    required: false
    default: 'medium'
    # Options: low, medium, high, critical

  fail-on:
    description: 'Severity level that fails the check'
    required: false
    default: 'critical'
    # Options: low, medium, high, critical, never

  exclude-paths:
    description: 'Comma-separated glob patterns to exclude'
    required: false
    # Example: 'tests/**,docs/**,*.test.ts'

  include-paths:
    description: 'Comma-separated glob patterns to include'
    required: false
    default: '**/*'

  upload-sarif:
    description: 'Upload results to Code Scanning'
    required: false
    default: 'true'

  comment-pr:
    description: 'Post findings as PR comments'
    required: false
    default: 'true'

  enable-rules:
    description: 'Comma-separated rule IDs to enable'
    required: false
    # Example: 'prompt-injection-*,tool-misuse-*'

  disable-rules:
    description: 'Comma-separated rule IDs to disable'
    required: false

  max-findings:
    description: 'Maximum findings to report'
    required: false
    default: '100'

  diff-only:
    description: 'Only report findings in changed files (PRs)'
    required: false
    default: 'true'

  full-scan:
    description: 'Force full repository scan'
    required: false
    default: 'false'

  generate-report:
    description: 'Generate HTML report'
    required: false
    default: 'false'

  token:
    description: 'GitHub token for API access'
    required: false
    default: '${{ github.token }}'
```

### Action Outputs Reference

```yaml
outputs:
  findings-count:
    description: 'Total number of findings'

  critical-count:
    description: 'Number of critical findings'

  high-count:
    description: 'Number of high severity findings'

  medium-count:
    description: 'Number of medium severity findings'

  low-count:
    description: 'Number of low severity findings'

  passed:
    description: 'Whether scan passed (true/false)'

  sarif-file:
    description: 'Path to generated SARIF file'
    # Example: 'agentscope-results.sarif'

  report-url:
    description: 'URL to detailed HTML report (if uploaded)'
```

### Caching Strategy

**Cache Key Computation**:
```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.cache/pip
      .agentscope/cache
    key: ${{ runner.os }}-agentscope-${{ hashFiles('package-lock.json', 'requirements.txt') }}-${{ env.AGENTSCOPE_VERSION }}
    restore-keys: |
      ${{ runner.os }}-agentscope-${{ hashFiles('package-lock.json', 'requirements.txt') }}-
      ${{ runner.os }}-agentscope-
```

**Cached Artifacts**:
1. `node_modules` - Node.js dependencies
2. `~/.cache/pip` - Python dependencies
3. `.agentscope/cache` - Previous scan results (for delta)

**Cache Invalidation**:
- Dependency changes (package-lock.json, requirements.txt)
- AgentScope version update
- Manual workflow re-run with cache disabled

### Performance Optimization

**Parallel Processing**:
```yaml
jobs:
  scan:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # Split into 4 parallel jobs

    steps:
      - name: Run AgentScope scan (shard ${{ matrix.shard }})
        uses: agentscope/scan-action@v1
        with:
          shard: ${{ matrix.shard }}
          total-shards: 4
```

**Incremental Scanning** (PRs):
```yaml
- name: Get changed files
  id: changed-files
  run: |
    git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.sha }} > changed-files.txt

- name: Scan only changed files
  uses: agentscope/scan-action@v1
  with:
    diff-only: true
    include-paths: $(cat changed-files.txt | tr '\n' ',')
```

## Consequences

### Positive

1. **Zero-Config**: Basic template works for 90% of repos without modification
2. **Progressive Disclosure**: Simple → Advanced → Scheduled templates
3. **Flexibility**: 15+ inputs for customization
4. **Performance**: Caching reduces scan time by 60-80%
5. **Integration**: Outputs enable downstream workflows (Slack, email, custom logic)
6. **Reliability**: Matrix builds test multiple configurations

### Negative

1. **Complexity**: Advanced templates can be overwhelming for beginners
   - **Mitigation**: Comprehensive documentation, examples
2. **Maintenance**: 3 templates to maintain and version
   - **Mitigation**: Shared base template, DRY principles
3. **Cache Churn**: Large repos may exceed 10 GB cache limit
   - **Mitigation**: Selective caching, prune old artifacts

### Neutral

1. **Actions Minutes**: Scanning consumes user's GitHub Actions quota
2. **Artifact Storage**: Reports count toward repository storage limits
3. **Version Pinning**: Users should pin action version (`@v1.2.3` vs `@v1`)

## Related Decisions

- ADR-401: Native GitHub Integration Architecture
- ADR-403: PR Comment Management Strategy
- ADR-404: SARIF Generation Format

## References

- [GitHub Actions Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Actions Cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Matrix Strategy](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Workflow Outputs](https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs)
