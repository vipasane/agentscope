# AI Reviewer Personas

This directory contains reviewer persona definitions used for automated PR reviews.

## How It Works

1. **On PR creation**: GitHub Actions triggers multi-persona review
2. **Each persona**: Reviews with its specific checklist
3. **Aggregation**: Results combined into review document
4. **Human flagging**: Issues requiring human attention are highlighted

## Personas

| Persona | Focus | Auto-approve? |
|---------|-------|---------------|
| `architect.yml` | System design, patterns, dependencies | If score > 90% |
| `security.yml` | Vulnerabilities, secrets, auth | Never (always flag) |
| `simplifier.yml` | Complexity, over-engineering | If score > 85% |
| `documentation.yml` | Comments, docs, API | If score > 95% |
| `test-coverage.yml` | Missing tests, edge cases | If coverage > 80% |
| `breaking-change.yml` | API compatibility, migrations | Never (always flag) |
| `performance.yml` | Efficiency, bottlenecks | If no critical issues |
| `dependency.yml` | Package vulnerabilities | If no vulnerabilities |

## Scoring

Each persona produces:
- **Score**: 0-100% compliance with checklist
- **Issues**: List of problems found
- **Suggestions**: Improvement recommendations
- **Human Required**: Boolean flag for mandatory review

## Usage

```bash
# Run all reviewers locally
npx agentscope review --all

# Run specific persona
npx agentscope review --persona security
```
