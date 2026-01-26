# ADR-306: Reporting Formats

## Status
Proposed

## Context

AgentScope-CI needs to generate reports in multiple formats for different consumers:

| Consumer | Format | Use Case |
|----------|--------|----------|
| **Developer (console)** | Human-readable text with color | Pre-commit feedback |
| **CI/CD system** | JSON (structured data) | Pipeline automation |
| **Test reporters** | JUnit XML | Integration with test frameworks |
| **Security tools** | SARIF | Integration with GitHub Security, Azure DevOps |
| **PR comments** | Markdown | GitHub/GitLab merge request comments |

### Requirements

**REQ-REP-001**: JSON output format for CI/CD parsing
**REQ-REP-002**: Human-readable console output with color
**REQ-REP-003**: Markdown report generation for PR comments (optional)
**REQ-REP-004**: JUnit XML format for CI/CD test reporters
**REQ-REP-005**: SARIF format for security tools integration

### Output Examples

**Console (for developers)**:
```
❌ Critical security issues found

Violations (3):

[CRITICAL] SECRET_EXPOSURE
  File: CLAUDE.md:42
  Policy: secrets.allowHardcodedSecrets
  Message: Hardcoded API key detected
  Fix: Replace with environment variable ${ANTHROPIC_API_KEY}

[HIGH] UNAPPROVED_MCP_SERVER
  File: .mcp.json:12
  Policy: mcpServers.allowed
  Message: MCP server "untrusted" is not in allowlist
  Fix: Use approved MCP servers: claude-flow, ruv-swarm
```

**JSON (for CI/CD)**:
```json
{
  "version": "1.0",
  "timestamp": "2026-01-26T10:30:00Z",
  "result": "failed",
  "exitCode": 2,
  "summary": {
    "critical": 2,
    "high": 1,
    "medium": 0,
    "low": 0
  },
  "violations": [...]
}
```

## Decision

Implement **5 reporter classes** with a common interface.

### 1. Reporter Interface

```typescript
// src/reporters/base-reporter.ts
export interface ReportData {
  violations: PolicyViolation[];
  policy: PolicyConfig;
  exitCode: ExitCode;
  timestamp: Date;
  duration: number;
  scannedFiles: string[];
}

export interface Reporter {
  /**
   * Generate report in specific format
   */
  generate(data: ReportData): string | object;

  /**
   * Write report to file (optional)
   */
  writeToFile?(data: ReportData, outputPath: string): Promise<void>;
}
```

### 2. Console Reporter (Human-Readable)

```typescript
// src/reporters/console-reporter.ts
import chalk from 'chalk';

export class ConsoleReporter implements Reporter {
  generate(data: ReportData): string {
    const lines: string[] = [];

    // Header
    if (data.exitCode === ExitCode.SUCCESS) {
      lines.push(chalk.green('✅ All security checks passed'));
    } else if (data.exitCode === ExitCode.WARNINGS) {
      lines.push(chalk.yellow('⚠️ Security warnings found'));
    } else if (data.exitCode === ExitCode.CRITICAL) {
      lines.push(chalk.red('❌ Critical security issues found'));
    } else if (data.exitCode === ExitCode.CONFIG_ERROR) {
      lines.push(chalk.red('❌ Invalid policy configuration'));
    } else if (data.exitCode === ExitCode.SCAN_ERROR) {
      lines.push(chalk.red('❌ Scan error'));
    }

    lines.push('');

    // Summary
    if (data.violations.length > 0) {
      const summary = this.summarize(data.violations);
      lines.push(`Violations (${data.violations.length}):`);
      lines.push('');

      // Group by severity
      for (const severity of ['critical', 'high', 'medium', 'low']) {
        const filtered = data.violations.filter(v => v.severity === severity);
        if (filtered.length === 0) continue;

        for (const violation of filtered) {
          lines.push(this.formatViolation(violation));
          lines.push('');
        }
      }
    }

    // Footer
    lines.push(chalk.gray(`Scanned ${data.scannedFiles.length} files in ${data.duration}ms`));

    return lines.join('\n');
  }

  private formatViolation(violation: PolicyViolation): string {
    const severityColor = {
      critical: chalk.red.bold,
      high: chalk.red,
      medium: chalk.yellow,
      low: chalk.blue
    }[violation.severity];

    const lines: string[] = [];

    // Header
    lines.push(severityColor(`[${violation.severity.toUpperCase()}] ${violation.type}`));

    // Location
    if (violation.file) {
      const location = violation.line
        ? `${violation.file}:${violation.line}`
        : violation.file;
      lines.push(chalk.gray(`  File: ${location}`));
    }

    // Policy
    lines.push(chalk.gray(`  Policy: ${violation.policy}`));

    // Message
    lines.push(`  Message: ${violation.message}`);

    // Remediation
    if (violation.remediation) {
      lines.push(chalk.cyan(`  Fix: ${violation.remediation}`));
    }

    // DREAD score
    if (violation.dreadScore !== undefined) {
      lines.push(chalk.gray(`  DREAD Score: ${violation.dreadScore.toFixed(1)}`));
    }

    return lines.join('\n');
  }

  private summarize(violations: PolicyViolation[]) {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const v of violations) {
      summary[v.severity]++;
    }

    return summary;
  }
}
```

### 3. JSON Reporter (CI/CD)

```typescript
// src/reporters/json-reporter.ts
export class JSONReporter implements Reporter {
  generate(data: ReportData): object {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const v of data.violations) {
      summary[v.severity]++;
    }

    return {
      version: '1.0',
      timestamp: data.timestamp.toISOString(),
      result: data.exitCode === ExitCode.SUCCESS ? 'passed' : 'failed',
      exitCode: data.exitCode,
      duration: data.duration,
      scannedFiles: data.scannedFiles,
      summary,
      violations: data.violations.map(v => ({
        severity: v.severity,
        type: v.type,
        policy: v.policy,
        file: v.file,
        line: v.line,
        message: v.message,
        remediation: v.remediation,
        dreadScore: v.dreadScore
      })),
      policy: {
        mode: data.policy.mode,
        version: data.policy.version
      }
    };
  }

  async writeToFile(data: ReportData, outputPath: string): Promise<void> {
    const json = this.generate(data);
    await fs.writeFile(
      outputPath,
      JSON.stringify(json, null, 2),
      'utf-8'
    );
  }
}
```

### 4. JUnit XML Reporter (Test Integration)

```typescript
// src/reporters/junit-reporter.ts
export class JUnitReporter implements Reporter {
  generate(data: ReportData): string {
    const testSuites = this.groupByFile(data.violations);

    const xml: string[] = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<testsuites>');

    for (const [file, violations] of testSuites) {
      xml.push(this.formatTestSuite(file, violations, data));
    }

    xml.push('</testsuites>');

    return xml.join('\n');
  }

  private formatTestSuite(
    file: string,
    violations: PolicyViolation[],
    data: ReportData
  ): string {
    const failures = violations.filter(v =>
      v.severity === 'critical' || v.severity === 'high'
    ).length;

    const xml: string[] = [];
    xml.push(`  <testsuite name="${this.escapeXml(file)}" tests="${violations.length}" failures="${failures}" time="${data.duration / 1000}">`);

    for (const violation of violations) {
      xml.push(this.formatTestCase(violation));
    }

    xml.push('  </testsuite>');

    return xml.join('\n');
  }

  private formatTestCase(violation: PolicyViolation): string {
    const testName = `${violation.type} at line ${violation.line || 'unknown'}`;
    const isFailure = violation.severity === 'critical' || violation.severity === 'high';

    const xml: string[] = [];
    xml.push(`    <testcase name="${this.escapeXml(testName)}" classname="${this.escapeXml(violation.file)}">`);

    if (isFailure) {
      xml.push(`      <failure message="${this.escapeXml(violation.message)}" type="${violation.severity}">`);
      xml.push(this.escapeXml(violation.remediation || 'No remediation provided'));
      xml.push('      </failure>');
    }

    xml.push('    </testcase>');

    return xml.join('\n');
  }

  private groupByFile(violations: PolicyViolation[]): Map<string, PolicyViolation[]> {
    const groups = new Map<string, PolicyViolation[]>();

    for (const v of violations) {
      if (!groups.has(v.file)) {
        groups.set(v.file, []);
      }
      groups.get(v.file)!.push(v);
    }

    return groups;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async writeToFile(data: ReportData, outputPath: string): Promise<void> {
    const xml = this.generate(data);
    await fs.writeFile(outputPath, xml, 'utf-8');
  }
}
```

### 5. SARIF Reporter (Security Tools)

```typescript
// src/reporters/sarif-reporter.ts
export class SARIFReporter implements Reporter {
  generate(data: ReportData): object {
    return {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'AgentScope-CI',
              version: '1.0.0',
              informationUri: 'https://github.com/agentscope/agentscope-ci',
              rules: this.generateRules(data.violations)
            }
          },
          results: data.violations.map(v => this.formatResult(v)),
          properties: {
            timestamp: data.timestamp.toISOString(),
            exitCode: data.exitCode,
            duration: data.duration
          }
        }
      ]
    };
  }

  private generateRules(violations: PolicyViolation[]) {
    const ruleMap = new Map<string, any>();

    for (const v of violations) {
      if (!ruleMap.has(v.type)) {
        ruleMap.set(v.type, {
          id: v.type,
          name: v.type,
          shortDescription: {
            text: v.message
          },
          fullDescription: {
            text: v.remediation || v.message
          },
          helpUri: `https://docs.agentscope.dev/security/${v.type.toLowerCase()}`,
          properties: {
            tags: [v.severity],
            precision: 'high'
          }
        });
      }
    }

    return Array.from(ruleMap.values());
  }

  private formatResult(violation: PolicyViolation) {
    return {
      ruleId: violation.type,
      level: this.mapSeverity(violation.severity),
      message: {
        text: violation.message
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: violation.file
            },
            region: violation.line
              ? {
                  startLine: violation.line
                }
              : undefined
          }
        }
      ],
      properties: {
        policy: violation.policy,
        remediation: violation.remediation,
        dreadScore: violation.dreadScore
      }
    };
  }

  private mapSeverity(severity: string): string {
    const map: Record<string, string> = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'note'
    };
    return map[severity] || 'warning';
  }

  async writeToFile(data: ReportData, outputPath: string): Promise<void> {
    const sarif = this.generate(data);
    await fs.writeFile(
      outputPath,
      JSON.stringify(sarif, null, 2),
      'utf-8'
    );
  }
}
```

### 6. Markdown Reporter (PR Comments)

```typescript
// src/reporters/markdown-reporter.ts
export class MarkdownReporter implements Reporter {
  generate(data: ReportData): string {
    const lines: string[] = [];

    // Header
    if (data.exitCode === ExitCode.SUCCESS) {
      lines.push('## ✅ AgentScope Security Check Passed');
    } else if (data.exitCode === ExitCode.WARNINGS) {
      lines.push('## ⚠️ AgentScope Security Warnings');
    } else {
      lines.push('## ❌ AgentScope Security Issues Found');
    }

    lines.push('');

    // Summary table
    const summary = this.summarize(data.violations);
    lines.push('### Summary');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    lines.push(`| Critical | ${summary.critical} |`);
    lines.push(`| High | ${summary.high} |`);
    lines.push(`| Medium | ${summary.medium} |`);
    lines.push(`| Low | ${summary.low} |`);
    lines.push('');

    // Violations
    if (data.violations.length > 0) {
      lines.push('### Violations');
      lines.push('');

      for (const violation of data.violations) {
        lines.push(this.formatViolation(violation));
        lines.push('');
      }
    }

    // Footer
    lines.push('---');
    lines.push(`Scanned ${data.scannedFiles.length} files in ${data.duration}ms`);
    lines.push('');
    lines.push('*Generated by [AgentScope-CI](https://github.com/agentscope/agentscope-ci)*');

    return lines.join('\n');
  }

  private formatViolation(violation: PolicyViolation): string {
    const emoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    }[violation.severity];

    const lines: string[] = [];

    // Header
    lines.push(`#### ${emoji} ${violation.type}`);
    lines.push('');

    // Details table
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| **Severity** | ${violation.severity.toUpperCase()} |`);
    lines.push(`| **File** | \`${violation.file}${violation.line ? `:${violation.line}` : ''}\` |`);
    lines.push(`| **Policy** | \`${violation.policy}\` |`);
    if (violation.dreadScore !== undefined) {
      lines.push(`| **DREAD Score** | ${violation.dreadScore.toFixed(1)} |`);
    }
    lines.push('');

    // Message
    lines.push(`**Message**: ${violation.message}`);
    lines.push('');

    // Remediation
    if (violation.remediation) {
      lines.push(`**Fix**: ${violation.remediation}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private summarize(violations: PolicyViolation[]) {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const v of violations) {
      summary[v.severity]++;
    }

    return summary;
  }

  async writeToFile(data: ReportData, outputPath: string): Promise<void> {
    const markdown = this.generate(data);
    await fs.writeFile(outputPath, markdown, 'utf-8');
  }
}
```

### 7. Reporter Factory

```typescript
// src/reporters/reporter-factory.ts
export type ReportFormat = 'console' | 'json' | 'junit' | 'sarif' | 'markdown';

export class ReporterFactory {
  static create(format: ReportFormat): Reporter {
    switch (format) {
      case 'console':
        return new ConsoleReporter();
      case 'json':
        return new JSONReporter();
      case 'junit':
        return new JUnitReporter();
      case 'sarif':
        return new SARIFReporter();
      case 'markdown':
        return new MarkdownReporter();
      default:
        throw new Error(`Unknown report format: ${format}`);
    }
  }

  /**
   * Generate multiple report formats at once
   */
  static async generateAll(
    data: ReportData,
    formats: ReportFormat[],
    outputDir: string
  ): Promise<void> {
    for (const format of formats) {
      const reporter = this.create(format);
      const outputPath = path.join(outputDir, `agentscope-${format}.${this.getExtension(format)}`);

      if (reporter.writeToFile) {
        await reporter.writeToFile(data, outputPath);
      } else {
        const content = reporter.generate(data);
        await fs.writeFile(
          outputPath,
          typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          'utf-8'
        );
      }
    }
  }

  private static getExtension(format: ReportFormat): string {
    const extensions: Record<ReportFormat, string> = {
      console: 'txt',
      json: 'json',
      junit: 'xml',
      sarif: 'sarif',
      markdown: 'md'
    };
    return extensions[format];
  }
}
```

### 8. CLI Integration

```bash
# Console output (default)
agentscope-ci check

# JSON output
agentscope-ci check --output=json

# Multiple formats
agentscope-ci check --output=json,junit,sarif

# Write to file
agentscope-ci check --output=json --output-file=result.json

# Generate all formats
agentscope-ci report --all --output-dir=./reports
```

### 9. CI/CD Integration Examples

#### GitHub Actions (SARIF Upload)

```yaml
- name: Security Scan
  run: agentscope-ci check --mode=blocking --output=sarif --output-file=agentscope.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  if: always()
  with:
    sarif_file: agentscope.sarif
```

#### GitLab CI (JUnit Report)

```yaml
agentscope-security:
  script:
    - agentscope-ci check --mode=blocking --output=junit --output-file=junit.xml
  artifacts:
    reports:
      junit: junit.xml
```

#### Jenkins (HTML Publisher)

```groovy
stage('Security Scan') {
  steps {
    sh 'agentscope-ci check --output=markdown --output-file=report.md'
    publishHTML([
      reportName: 'Security Report',
      reportDir: '.',
      reportFiles: 'report.md'
    ])
  }
}
```

## Consequences

### Positive

1. **Multiple Formats**: Console, JSON, JUnit, SARIF, Markdown
2. **CI/CD Integration**: Native support for test reporters and security tools
3. **Developer Friendly**: Colored console output with clear messages
4. **Extensible**: Easy to add new reporter formats
5. **Standardized**: SARIF and JUnit follow industry standards
6. **PR Comments**: Markdown format perfect for GitHub/GitLab comments

### Negative

1. **Maintenance Overhead**: Multiple formats to test and maintain
2. **Format Complexity**: SARIF/JUnit XML have complex specifications
3. **File Size**: Detailed reports can be large (mitigated by compression)

### Neutral

1. **Format Selection**: Developers choose based on use case
2. **Testing**: Need comprehensive tests for each format
3. **Documentation**: Need examples for each format

## Related Decisions

- ADR-301: CI/CD Integration Architecture (overall architecture)
- ADR-303: Exit Code Specification (reporters include exit codes)
- DDD-301: CI Domain Model (Reporter service)

## References

- [SARIF Specification v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [JUnit XML Format](https://llg.cubic.org/docs/junit/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [chalk (Terminal Colors)](https://www.npmjs.com/package/chalk)
