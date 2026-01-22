# Sample Project Configuration

## Available Agents

### Coordinators

- `planner`: Task orchestration agent for workflow planning
  - Delegates to: coder, tester, reviewer
  - Use for: Feature implementation, refactoring tasks

- `pr-manager`: Pull request lifecycle coordinator
  - Delegates to: coder, reviewer
  - Use for: PR creation, review coordination

### Workers

- `coder`: Implementation specialist for writing code
  - Tools: github MCP server
  - Use for: Code changes, bug fixes

- `tester`: Test writing and execution agent
  - Use for: Unit tests, integration tests

### Reviewers

- `reviewer`: Code review and quality specialist
  - Use for: PR reviews, code quality checks

### Specialists

- `security-auditor`: Security vulnerability analysis expert
  - Use for: Security scans, vulnerability assessment

## Agent Routing

When spawning agents, use the Task tool with these subagent_type values:

| subagent_type | Agent | Description |
|---------------|-------|-------------|
| planner | planner | Orchestrates multi-step tasks |
| coder | coder | Writes implementation code |
| tester | tester | Creates and runs tests |
| reviewer | reviewer | Reviews code quality |
| pr-manager | pr-manager | Manages PR lifecycle |
| security-auditor | security-auditor | Security analysis |

## MCP Servers

```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["@claude-flow/cli"]
    },
    "github": {
      "command": "gh",
      "args": ["mcp"]
    }
  }
}
```
