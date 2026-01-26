# ADR-404: SARIF Generation Format

## Status
Accepted

## Context

SARIF (Static Analysis Results Interchange Format) is GitHub's native format for security findings. Proper SARIF generation is critical for:

1. **Code Scanning Integration**: Findings appear in GitHub's Security tab
2. **Trend Analysis**: Track security posture over time
3. **Compliance**: Generate audit reports from SARIF data
4. **Tool Interoperability**: SARIF is an industry standard (OASIS)
5. **Fix Suggestions**: SARIF supports automated fix recommendations

### SARIF Specification Requirements

**Version**: SARIF 2.1.0 (current standard)

**Key Components**:
1. **Tool metadata**: Name, version, rules
2. **Results**: Findings with locations
3. **Fixes**: Optional automated fix suggestions
4. **Rules**: Detailed rule descriptions
5. **Invocations**: Execution metadata

**GitHub Constraints**:
- Max file size: 10 MB
- Must validate against SARIF 2.1.0 JSON schema
- Required fields: `tool.driver.name`, `results[].locations`
- Recommended: `rules`, `fixes`, `helpUri`

### AgentScope-Specific Requirements

**AI Agent Vulnerabilities**:
- Prompt injection (OWASP LLM01)
- Tool misuse (OWASP LLM07)
- LLM denial of service (OWASP LLM04)
- Sensitive data exposure (OWASP LLM06)
- Insecure output handling (OWASP LLM02)

**Finding Attributes**:
- Rule ID (e.g., `prompt-injection-001`)
- Severity (critical, high, medium, low)
- CWE mapping (e.g., CWE-77)
- File location (path, line, column)
- Fix suggestion (code diff)
- Educational resources (help URL)

## Decision

We will generate **SARIF 2.1.0 compliant output** with the following structure:

### SARIF Template

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "AgentScope",
          "version": "1.0.0",
          "semanticVersion": "1.0.0",
          "informationUri": "https://agentscope.dev",
          "organization": "AgentScope Team",
          "rules": [
            {
              "id": "prompt-injection-001",
              "name": "PromptInjection",
              "shortDescription": {
                "text": "Prompt injection vulnerability"
              },
              "fullDescription": {
                "text": "User input is concatenated into LLM prompts without sanitization, allowing attackers to inject malicious instructions that can bypass system prompts, extract sensitive data, or cause unintended actions."
              },
              "help": {
                "text": "Sanitize all user input before including in prompts. Use parameterized prompts or template systems with escaping.",
                "markdown": "## Prompt Injection\n\nUser input should never be directly concatenated into LLM prompts...\n\n### How to Fix\n\n```typescript\n// ❌ Vulnerable\nconst prompt = `Answer: ${userInput}`;\n\n// ✅ Secure\nconst prompt = `Answer: ${sanitizePromptInput(userInput)}`;\n```"
              },
              "helpUri": "https://agentscope.dev/docs/rules/prompt-injection-001",
              "defaultConfiguration": {
                "level": "error"
              },
              "properties": {
                "tags": ["security", "llm", "prompt-injection", "owasp-llm01"],
                "precision": "high",
                "security-severity": "9.8",
                "cwe": ["CWE-77"],
                "problem.severity": "error"
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "prompt-injection-001",
          "ruleIndex": 0,
          "level": "error",
          "message": {
            "text": "Unsanitized user input concatenated into LLM prompt",
            "markdown": "**Prompt Injection**: User input `userQuery` is directly concatenated into the prompt without sanitization on line 42."
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "src/agents/chatbot.ts",
                  "uriBaseId": "%SRCROOT%"
                },
                "region": {
                  "startLine": 42,
                  "startColumn": 5,
                  "endLine": 42,
                  "endColumn": 50,
                  "snippet": {
                    "text": "const prompt = `Answer this: ${userQuery}`;"
                  }
                },
                "contextRegion": {
                  "startLine": 40,
                  "endLine": 44,
                  "snippet": {
                    "text": "function buildPrompt(userQuery: string) {\n  // Vulnerable: direct concatenation\n  const prompt = `Answer this: ${userQuery}`;\n  return prompt;\n}"
                  }
                }
              }
            }
          ],
          "fixes": [
            {
              "description": {
                "text": "Sanitize user input before including in prompt"
              },
              "artifactChanges": [
                {
                  "artifactLocation": {
                    "uri": "src/agents/chatbot.ts",
                    "uriBaseId": "%SRCROOT%"
                  },
                  "replacements": [
                    {
                      "deletedRegion": {
                        "startLine": 42,
                        "startColumn": 5,
                        "endLine": 42,
                        "endColumn": 50
                      },
                      "insertedContent": {
                        "text": "const prompt = `Answer this: ${sanitizePromptInput(userQuery)}`;"
                      }
                    }
                  ]
                }
              ]
            }
          ],
          "codeFlows": [
            {
              "threadFlows": [
                {
                  "locations": [
                    {
                      "location": {
                        "physicalLocation": {
                          "artifactLocation": {
                            "uri": "src/agents/chatbot.ts"
                          },
                          "region": {
                            "startLine": 40,
                            "snippet": {
                              "text": "function buildPrompt(userQuery: string)"
                            }
                          }
                        },
                        "message": {
                          "text": "Tainted input parameter 'userQuery'"
                        }
                      }
                    },
                    {
                      "location": {
                        "physicalLocation": {
                          "artifactLocation": {
                            "uri": "src/agents/chatbot.ts"
                          },
                          "region": {
                            "startLine": 42,
                            "snippet": {
                              "text": "const prompt = `Answer this: ${userQuery}`;"
                            }
                          }
                        },
                        "message": {
                          "text": "Unsanitized tainted data flows into prompt"
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ],
          "relatedLocations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "src/agents/chatbot.ts"
                },
                "region": {
                  "startLine": 23
                }
              },
              "message": {
                "text": "Similar pattern found here"
              }
            }
          ],
          "properties": {
            "github/alertNumber": 1,
            "github/alertUrl": "https://github.com/org/repo/security/code-scanning/1"
          }
        }
      ],
      "invocations": [
        {
          "executionSuccessful": true,
          "startTimeUtc": "2026-01-26T10:00:00.000Z",
          "endTimeUtc": "2026-01-26T10:02:34.567Z",
          "workingDirectory": {
            "uri": "file:///github/workspace"
          },
          "commandLine": "agentscope scan --config .agentscope.json"
        }
      ],
      "properties": {
        "metrics": {
          "filesScanned": 42,
          "rulesExecuted": 15,
          "totalFindings": 8,
          "criticalFindings": 2,
          "highFindings": 3,
          "mediumFindings": 2,
          "lowFindings": 1
        }
      }
    }
  ]
}
```

### SARIF Generator Implementation

```typescript
// src/sarif-generator.ts
import { SARIF, Result, Rule, Location, Fix } from 'sarif';

export class SARIFGenerator {
  private version = '1.0.0';
  private rules: Map<string, Rule> = new Map();

  constructor(private findings: Finding[]) {
    this.initializeRules();
  }

  generate(): SARIF {
    return {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: this.generateToolMetadata(),
          results: this.generateResults(),
          invocations: this.generateInvocations()
        }
      ]
    };
  }

  private generateToolMetadata() {
    return {
      driver: {
        name: 'AgentScope',
        version: this.version,
        semanticVersion: this.version,
        informationUri: 'https://agentscope.dev',
        organization: 'AgentScope Team',
        rules: Array.from(this.rules.values())
      }
    };
  }

  private generateResults(): Result[] {
    return this.findings.map(finding => ({
      ruleId: finding.ruleId,
      ruleIndex: this.getRuleIndex(finding.ruleId),
      level: this.mapSeverityToLevel(finding.severity),
      message: {
        text: finding.message,
        markdown: finding.markdownMessage
      },
      locations: [this.generateLocation(finding)],
      fixes: finding.fixSuggestion ? [this.generateFix(finding)] : [],
      codeFlows: finding.dataFlow ? [this.generateCodeFlow(finding)] : [],
      properties: {
        'github/alertNumber': finding.id,
        'github/alertUrl': finding.url
      }
    }));
  }

  private generateLocation(finding: Finding): Location {
    return {
      physicalLocation: {
        artifactLocation: {
          uri: finding.location.file,
          uriBaseId: '%SRCROOT%'
        },
        region: {
          startLine: finding.location.line,
          startColumn: finding.location.column,
          endLine: finding.location.endLine || finding.location.line,
          endColumn: finding.location.endColumn || finding.location.column,
          snippet: {
            text: finding.location.snippet
          }
        },
        contextRegion: {
          startLine: Math.max(1, finding.location.line - 2),
          endLine: finding.location.line + 2,
          snippet: {
            text: finding.location.contextSnippet
          }
        }
      }
    };
  }

  private generateFix(finding: Finding): Fix {
    return {
      description: {
        text: finding.fixSuggestion.description
      },
      artifactChanges: [
        {
          artifactLocation: {
            uri: finding.location.file,
            uriBaseId: '%SRCROOT%'
          },
          replacements: [
            {
              deletedRegion: {
                startLine: finding.location.line,
                startColumn: finding.location.column,
                endLine: finding.location.endLine || finding.location.line,
                endColumn: finding.location.endColumn || finding.location.column
              },
              insertedContent: {
                text: finding.fixSuggestion.code
              }
            }
          ]
        }
      ]
    };
  }

  private mapSeverityToLevel(severity: string): string {
    const mapping = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'note'
    };
    return mapping[severity] || 'warning';
  }

  private initializeRules(): void {
    // Load rule definitions from AgentScope Core
    const ruleDefinitions = loadRuleDefinitions();
    for (const rule of ruleDefinitions) {
      this.rules.set(rule.id, this.convertToSARIFRule(rule));
    }
  }

  private convertToSARIFRule(rule: RuleDefinition): Rule {
    return {
      id: rule.id,
      name: rule.name,
      shortDescription: { text: rule.shortDescription },
      fullDescription: { text: rule.fullDescription },
      help: {
        text: rule.helpText,
        markdown: rule.helpMarkdown
      },
      helpUri: `https://agentscope.dev/docs/rules/${rule.id}`,
      defaultConfiguration: {
        level: this.mapSeverityToLevel(rule.defaultSeverity)
      },
      properties: {
        tags: rule.tags,
        precision: rule.precision,
        'security-severity': rule.securitySeverity,
        cwe: rule.cwe,
        'problem.severity': this.mapSeverityToLevel(rule.defaultSeverity)
      }
    };
  }
}
```

### SARIF Optimization for 10 MB Limit

**Strategies**:
1. **Prioritization**: Include critical/high findings first
2. **Truncation**: Limit snippet length to 500 chars
3. **Compression**: Remove optional fields if approaching limit
4. **Chunking**: Split into multiple SARIF files if needed

```typescript
function optimizeSARIFSize(sarif: SARIF): SARIF {
  const maxSize = 10 * 1024 * 1024; // 10 MB

  let currentSize = JSON.stringify(sarif).length;

  if (currentSize < maxSize) {
    return sarif; // No optimization needed
  }

  // Strategy 1: Truncate snippets
  for (const result of sarif.runs[0].results) {
    for (const location of result.locations) {
      if (location.physicalLocation.region.snippet) {
        location.physicalLocation.region.snippet.text =
          location.physicalLocation.region.snippet.text.substring(0, 500);
      }
    }
  }

  currentSize = JSON.stringify(sarif).length;

  if (currentSize < maxSize) {
    return sarif;
  }

  // Strategy 2: Remove context regions
  for (const result of sarif.runs[0].results) {
    for (const location of result.locations) {
      delete location.physicalLocation.contextRegion;
    }
  }

  currentSize = JSON.stringify(sarif).length;

  if (currentSize < maxSize) {
    return sarif;
  }

  // Strategy 3: Prioritize critical/high, remove low/medium
  sarif.runs[0].results = sarif.runs[0].results.filter(
    r => r.level === 'error'
  );

  return sarif;
}
```

## Consequences

### Positive

1. **Native Integration**: SARIF appears in GitHub's Security tab automatically
2. **Standards-Based**: SARIF is an OASIS standard (interoperable)
3. **Rich Metadata**: Supports rules, fixes, code flows, related locations
4. **Actionable**: Fix suggestions enable automated remediation
5. **Educational**: Help text and links guide developers
6. **Trend Analysis**: GitHub tracks findings over time

### Negative

1. **Size Limit**: 10 MB can be restrictive for large repos with many findings
   - **Mitigation**: Prioritization, truncation, chunking
2. **Complexity**: SARIF schema is verbose (harder to generate manually)
   - **Mitigation**: Use SARIF library (`@microsoft/sarif`)
3. **GitHub-Specific**: Some fields only work with GitHub Code Scanning
   - **Mitigation**: Follow SARIF spec closely for portability

### Neutral

1. **Validation Required**: SARIF must validate against schema
2. **Rule Metadata**: Requires comprehensive rule descriptions
3. **CWE Mapping**: Should map to CWE categories where applicable

## Related Decisions

- ADR-401: Native GitHub Integration Architecture
- ADR-403: PR Comment Management Strategy
- ADR-405: GitHub App Architecture (future)

## References

- [SARIF Specification v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub SARIF Support](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)
- [SARIF Tutorials](https://github.com/microsoft/sarif-tutorials)
- [SARIF NPM Package](https://www.npmjs.com/package/@microsoft/sarif)
