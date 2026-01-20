# Claude Code Tuning Best Practices for Agentic Coding Workflows

A comprehensive guide to optimizing Claude Code for production-ready agentic development, based on current best practices from 2025-2026.

---

## Table of Contents

1. [CLAUDE.md Optimization](#1-claudemd-optimization)
2. [Agent Configuration](#2-agent-configuration)
3. [Quality Control for Agentic Coding](#3-quality-control-for-agentic-coding)
4. [Swarm Coordination Best Practices](#4-swarm-coordination-best-practices)
5. [Cost Optimization](#5-cost-optimization)
6. [Common Pitfalls and Anti-Patterns](#6-common-pitfalls-and-anti-patterns)
7. [CLAUDE.md Template Recommendations](#7-claudemd-template-recommendations)
8. [Sources](#8-sources)

---

## 1. CLAUDE.md Optimization

### What is CLAUDE.md?

CLAUDE.md is a special configuration file that Claude automatically incorporates into every conversation, providing persistent context about your project. It transforms Claude Code from a general-purpose assistant into a tool configured specifically for your codebase.

### File Location Strategy

Place CLAUDE.md files strategically based on your needs:

| Location | Use Case |
|----------|----------|
| Repository root (`./CLAUDE.md`) | Project-wide context, shared with team via git |
| Parent directories | Monorepo configurations, cascading settings |
| Child directories | Module-specific rules (loaded on demand) |
| Home folder (`~/.claude/CLAUDE.md`) | Personal preferences across all projects |
| Local variant (`./CLAUDE.local.md`) | Personal overrides, gitignored |

### The WHAT-WHY-HOW Framework

Structure your CLAUDE.md around three key questions:

**WHAT (Technical Context)**
- Technology stack (languages, frameworks, tools)
- Project structure and architecture
- Key directories and their purposes
- Dependencies and their roles

**WHY (Purpose and Context)**
- Project goals and objectives
- What each component does
- Business logic explanations
- Domain-specific terminology

**HOW (Operational Instructions)**
- Build and test commands
- Development workflows
- Verification steps Claude should follow
- Code style and conventions

### Content Best Practices

**Keep It Concise**

Claude has limited context space, and your actual code needs most of it. Anthropic recommends keeping CLAUDE.md files concise and human-readable.

```markdown
# Bad: Overly verbose
## Development Environment Setup Instructions
When setting up the development environment, you should first ensure that you have
Node.js installed. The recommended version is 20.x or higher. You can verify your
Node.js installation by running the `node --version` command in your terminal...

# Good: Concise and actionable
## Setup
- Node.js 20+
- Run: `npm install && npm run dev`
- Test: `npm test`
```

**Use Emphasis for Critical Instructions**

Anthropic engineers tune instructions with emphasis to improve adherence:

```markdown
# IMPORTANT: Always run tests before committing
# YOU MUST use TypeScript strict mode
# CRITICAL: Never commit secrets or API keys
```

**Use the # Key for Quick Updates**

Press `#` in Claude Code to add instructions that automatically get incorporated into CLAUDE.md. This is a powerful way to document patterns as you discover them.

**Reference External Files**

Use `@ref` syntax to keep your main CLAUDE.md clean:

```markdown
# Project Overview
See @docs/architecture.md for system design.
See @docs/testing-guide.md for test procedures.
```

### What to Include (and What to Avoid)

**Include:**
- Common bash commands (build, test, lint)
- Core files and utility functions
- Code style guidelines
- Testing instructions
- Repository etiquette (branch naming, commit conventions)
- Developer environment setup
- Unexpected behaviors or warnings

**Avoid:**
- Every possible command (leads to sub-optimal results)
- Information not universally applicable to tasks
- Duplicate information available elsewhere
- Lengthy documentation that could be referenced instead

### Iterate and Refine

Treat CLAUDE.md as a frequently-used prompt that requires iteration:

1. Start with `/init` to generate a baseline
2. Review and refine based on your team's practices
3. Update as the project evolves
4. Run through Anthropic's prompt improver occasionally
5. Document lessons when you discover agent mistakes

---

## 2. Agent Configuration

### Model Selection: Haiku vs Sonnet vs Opus

Understanding when to use each model is critical for cost-effective agentic workflows.

#### Pricing Overview (2026)

| Model | Input/Output (per 1M tokens) | Speed | Best For |
|-------|------------------------------|-------|----------|
| Haiku 4.5 | $1/$5 | Fastest (27s benchmark) | Simple tasks, high-volume |
| Sonnet 4.5 | $3/$15 | Balanced (86s benchmark) | Daily coding work |
| Opus 4.5 | $5/$25 | Thorough (76s benchmark) | Complex reasoning |

#### Model Selection Guidelines

**Use Haiku for:**
- Simple file reads and basic content extraction
- Routine formatting and style corrections
- Basic syntax validation and linting
- Simple text transformations and data parsing
- Quick status checks and basic analysis
- Simple utility scripts or throwaway code
- High-frequency sub-agent tasks

**Use Sonnet for:**
- General feature development
- Writing unit tests
- Improving existing code
- Generating documentation
- Standard code reviews
- Most everyday coding tasks

**Use Opus for:**
- Multi-step reasoning tasks
- Complex algorithm design
- Large refactoring planning
- Debugging with tangled dependencies
- Architectural decisions
- Security-critical analysis

#### Intelligent Routing Strategy

The optimal architecture uses intelligent routing based on task characteristics:

```markdown
# CLAUDE.md routing hints
## Model Routing
- Simple queries, file reads: Route to Haiku
- Feature implementation, tests: Use Sonnet (default)
- Architecture, security, complex debugging: Escalate to Opus
```

If Haiku handles 90% of your volume at 20% of Sonnet's cost, the savings compound significantly. Haiku 4.5 is 3x cheaper than Sonnet 4.5 while maintaining approximately 90% capability.

### Task Decomposition Strategies

**Explore-Plan-Code-Commit Pattern**

The most effective workflow prevents Claude from writing code immediately:

1. **Explore**: Research the codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan
3. **Code**: Implement according to the plan
4. **Commit**: Review, test, and commit changes

```markdown
# Prompt example
Before coding, I need you to:
1. Explore the existing authentication code in src/auth/
2. List all files that will need changes
3. Create a bullet-point plan for the implementation
4. Wait for my approval before writing any code
```

**Use Extended Thinking**

Trigger extended thinking for complex tasks:

| Phrase | Thinking Budget |
|--------|-----------------|
| "think" | Standard extended thinking |
| "think hard" | More thinking tokens |
| "think harder" | Even more thinking tokens |

Note: As of January 2026, explicit ultrathink keywords are deprecated. Thinking budget is now controlled by the `max_thinking_tokens` SDK parameter.

### Parallel vs Sequential Agent Execution

**When to Use Parallel Execution:**
- Independent tasks (e.g., building different components)
- Multiple file explorations
- Parallel test suites
- Documentation generation for separate modules

**When to Use Sequential Execution:**
- Tasks with dependencies
- Multi-step workflows where output feeds into input
- Database migrations
- Staged deployments

**Practical Parallel Workflow:**

```markdown
# Prompt for parallel exploration
Explore the codebase using 4 tasks in parallel:
1. Analyze the API layer in src/api/
2. Review database models in src/models/
3. Check test coverage in tests/
4. Document current authentication flow
```

### Sub-agent Configuration

Create specialized sub-agents for different tasks:

```yaml
# .claude/agents/security-reviewer.md
name: security-reviewer
description: Reviews code for security vulnerabilities
model: opus  # Use most capable model for security
tools:
  - read
  - grep
  - glob
system_prompt: |
  You are a security specialist. Review code for:
  - SQL injection vulnerabilities
  - XSS attack vectors
  - Authentication bypasses
  - Insecure dependencies
```

**Sub-agent Best Practices:**
- Keep tool access minimal and focused
- Use cheaper models (Haiku) for simple sub-tasks
- Sub-agents cannot spawn other sub-agents
- Each sub-agent gets its own context window

---

## 3. Quality Control for Agentic Coding

### Test-Driven Development (TDD)

TDD is Anthropic's favorite workflow for agentic coding because it provides:
- **Structured Problem Solving**: Breaks complex problems into verifiable units
- **Reduced Context Drift**: Test suite acts as "source of truth"
- **Clear Success Criteria**: Tests define when work is complete

**TDD Workflow with Claude Code:**

```markdown
# Step 1: Write failing tests
Write a test for user authentication that:
- Tests successful login with valid credentials
- Tests failure with invalid password
- Tests account lockout after 5 failed attempts

Be explicit that you are doing TDD. Do not create mock implementations.

# Step 2: Verify tests fail
Run the tests and confirm they fail as expected.

# Step 3: Implement minimal code
Write the minimum code needed to make these tests pass.

# Step 4: Refactor
Clean up the implementation while keeping tests green.
```

**TDD Configuration in CLAUDE.md:**

```markdown
## Testing Protocol
- Framework: Jest with TypeScript
- Coverage requirement: 80% minimum
- IMPORTANT: When adding new features, write tests FIRST
- Never create mock implementations until tests are written
- Run `npm test` after every code change
```

### Automated Quality Checks with Hooks

Hooks provide deterministic control over Claude's probabilistic nature:

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "write|edit",
        "command": "npm run lint --fix && npm run format"
      }
    ],
    "Stop": [
      {
        "command": "npm test"
      }
    ]
  }
}
```

**Key Hook Events:**

| Event | When It Fires | Use Case |
|-------|---------------|----------|
| PreToolUse | Before a tool runs | Validation, safety checks |
| PostToolUse | After tool completes | Linting, formatting, tests |
| Notification | When Claude sends alerts | Logging, monitoring |
| Stop | When agent finishes | Final validation, commits |
| UserPromptSubmit | When user sends prompt | Context injection |
| SessionStart | When session begins | Environment setup |

### Human-in-the-Loop Checkpoints

**Checkpoint Strategy:**

```markdown
## Checkpoint Requirements
Create checkpoints before:
- Any database schema changes
- Modifications to authentication code
- Changes to payment processing
- Infrastructure or deployment changes

Request explicit approval for:
- Deleting files or directories
- Modifying environment variables
- Updating dependencies
- Merging to main branch
```

**Structured Workflow Pattern:**

```
Idea -> Specification -> Plan -> Tasks -> Implementation
         [Review]       [Review]  [Review]     [Review]
```

Each step produces artifacts you review and approve before proceeding.

**GitHub Integration:**

```yaml
# Require human approval for AI-authored PRs
- Minimum 2 human approvals for AI-initiated PRs
- CODEOWNERS file enforces review requirements
- Branch protection prevents direct merges
```

### Preventing Agent Drift

**Problem**: Agents can drift off-topic, forget earlier goals, or expand scope unexpectedly.

**Solutions:**

1. **Todo Lists as Drift Prevention**

   Todo lists push global plans into the model's recent attention span:

   ```markdown
   # Task: Implement user authentication

   ## Current Progress
   - [x] Create user model
   - [x] Implement password hashing
   - [ ] Build login endpoint  <-- CURRENT
   - [ ] Add session management
   - [ ] Write integration tests

   Stay focused on the current task. Do not modify unrelated code.
   ```

2. **Well-Scoped Tasks**

   ```markdown
   # Bad: Vague scope
   "Fix the authentication system"

   # Good: Specific scope
   "Add rate limiting to the /api/login endpoint:
   - Maximum 5 attempts per minute per IP
   - Return 429 status after limit exceeded
   - Do not modify other endpoints"
   ```

3. **Explicit Boundaries**

   ```markdown
   ## Scope Constraints
   - Only modify files in src/auth/
   - Do not update dependencies
   - Do not refactor unrelated code
   - If you need to change files outside scope, stop and ask
   ```

4. **Context Management**

   - Use `/clear` between different tasks
   - Delegate exploration to sub-agents
   - Commit frequently to create save points
   - Restart agents when they drift

---

## 4. Swarm Coordination Best Practices

### Topology Selection

Choose topology based on task requirements:

| Topology | Best For | Trade-offs |
|----------|----------|------------|
| Hierarchical | Tight control, anti-drift | Single point of coordination |
| Mesh | Peer communication, resilient | More complex, potential drift |
| Hierarchical-Mesh | Large teams (10+ agents) | Balance of control and flexibility |
| Ring | Circular workflows | Sequential bottlenecks |
| Star | Central coordination | Coordinator bottleneck |

**Anti-Drift Configuration:**

```bash
# Small teams (6-8 agents) - tight control
npx @claude-flow/cli swarm init \
  --topology hierarchical \
  --max-agents 8 \
  --strategy specialized

# Large teams (10-15 agents) - balanced
npx @claude-flow/cli swarm init \
  --topology hierarchical-mesh \
  --max-agents 15 \
  --strategy specialized
```

### Agent Specialization

Assign clear, non-overlapping roles:

```yaml
# Agent roles for feature implementation
coordinator:
  role: "Orchestrates work, maintains global state"
  model: sonnet

researcher:
  role: "Analyzes requirements, explores codebase"
  model: haiku

architect:
  role: "Designs implementation approach"
  model: opus

coder:
  role: "Implements according to design"
  model: sonnet

tester:
  role: "Writes and runs tests"
  model: sonnet

reviewer:
  role: "Reviews code quality and security"
  model: opus
```

### Memory Sharing Between Agents

Effective swarm coordination requires shared memory:

```bash
# Store findings for other agents
npx @claude-flow/cli memory store \
  --key "auth-patterns" \
  --value "JWT with refresh tokens, bcrypt hashing" \
  --namespace patterns

# Search memory before starting tasks
npx @claude-flow/cli memory search \
  --query "authentication implementation" \
  --namespace patterns
```

**Memory Best Practices:**
- Query semantic memory FIRST before solving problems
- Store successful patterns for future reference
- Use namespaces to organize different types of knowledge
- Persist state across sessions

### Task Handoff Patterns

**Planning Agent Pattern:**

Never do planning inline in the coordinator thread. Planning consumes massive context.

```markdown
# Bad: Inline planning
"Read all files, analyze structure, break down tasks, then coordinate..."

# Good: Delegate to planner
"Spawn a planner sub-agent to:
1. Analyze the task requirements
2. Break down into sub-tasks
3. Return structured task list
Then coordinate execution."
```

**Commit-Based Handoffs:**

```markdown
## Handoff Protocol
1. Complete current task phase
2. Commit changes with descriptive message
3. Update shared memory with findings
4. Signal next agent in workflow
5. Next agent pulls latest, reads memory, continues
```

### Progress Reporting

```markdown
## Progress Requirements
- Report progress every 30 minutes or at milestones
- Create checkpoints before risky operations
- Document blockers immediately
- Maintain changelog as work progresses
```

---

## 5. Cost Optimization

### Token Efficiency Techniques

**Prompt Caching**

Claude Code automatically enables prompt caching, reducing input token costs by up to 90%:

```markdown
# Cost comparison (10 debugging iterations)
Without caching: ~50,000 tokens processed
With caching: ~10,000 tokens processed
```

**Cache Optimization:**
- Place static content at prompt beginning
- Cache breakpoints at end of reusable content
- Cache read tokens cost 0.1x base price
- Minimum cache size: 1024 tokens
- Cache TTL: 5 minutes default, 1 hour optional

**Reduce Tool Overhead**

MCP tool definitions consume tokens before conversations start:

```markdown
# Problem: 5 servers with 58 tools = ~55K tokens overhead
# Solution: Use Tool Search Tool for 85% token reduction
```

**Context Window Management**

```markdown
## CLAUDE.md Context Rules
- Specify which files Claude can read
- Forbid unnecessary directories
- Use /clear between tasks
- Reference files instead of embedding content
```

### Batch Operations

Use headless mode for automation:

```bash
# Single file processing
claude -p "Review this file for security issues" --input src/auth.ts

# Batch processing with structured output
claude -p "Lint these files" --output-format stream-json \
  --input "src/**/*.ts"
```

### Cost-Effective Workflows

**Haiku-First Strategy:**

```markdown
# Route 90% of tasks to Haiku
- File reads and exploration
- Simple transformations
- Status checks
- Documentation queries

# Reserve Sonnet/Opus for complex work
- Implementation
- Architecture decisions
- Security reviews
```

**Token Budget Monitoring:**

```bash
# Check current usage
/cost

# Set budget alerts
# In CLAUDE.md:
## Budget Constraints
- Daily token limit: 100,000
- Alert at 80% usage
- Pause non-critical tasks at limit
```

### Caching and Memory Reuse

```markdown
## Session Persistence
# At session start
npx @claude-flow/cli session restore --latest

# At session end
npx @claude-flow/cli hooks session-end \
  --generate-summary true \
  --persist-state true \
  --export-metrics true
```

---

## 6. Common Pitfalls and Anti-Patterns

### The "Spec Dump" Anti-Pattern

**Problem**: Feeding a complete feature specification and expecting a miracle.

**Solution**: Break down into phases with checkpoints.

```markdown
# Bad
"Here's our 50-page PRD. Implement the entire user management system."

# Good
"Let's implement user management in phases:
Phase 1: User model and database schema
Phase 2: Registration endpoint
Phase 3: Login and session management
Phase 4: Profile management

Start with Phase 1. Show me the plan before coding."
```

### Jumping Straight to Coding

**Problem**: Without research and planning, Claude produces suboptimal solutions.

**Solution**: Explicit explore-plan-code workflow.

```markdown
# Prompt template
Before writing any code:
1. Explore existing patterns in the codebase
2. List files that will be affected
3. Propose implementation approach
4. Wait for my approval

Only then proceed with implementation.
```

### Vague Error Feedback

**Problem**: "Fix this" provides no useful guidance.

**Solution**: Specific, actionable feedback.

```markdown
# Bad
"The tests are failing, fix them"

# Good
"The UserAuth.test.ts is failing on line 45:
- Expected: 200 status
- Received: 401 status
- The mock for authenticateUser isn't being applied
- Check if the import path matches the actual module"
```

### Sub-agent Anti-Patterns

1. **Inconsistent Activation**: Claude may ignore sub-agents unless explicitly named
2. **Tool-Scope Confusion**: Don't give every agent every tool
3. **Short, Shallow Outputs**: Follow up for detailed analysis
4. **Verbose Auto-Generated Prompts**: Trim wizard-generated prompts manually
5. **Non-Deterministic Variance**: Same task can yield different plans

### Complex Slash Command Anti-Pattern

**Problem**: Long lists of custom slash commands become a new API to learn.

**Solution**: Use slash commands as simple shortcuts, not system replacements.

```markdown
# Bad: Complex command system
/feature-implement --type=api --with-tests --style=rest --auth=jwt

# Good: Simple shortcuts
/test  -> Run test suite
/lint  -> Run linter
/build -> Build project
```

### Context Poisoning

**Problem**: Failed attempts clutter working memory.

**Solution**: Fresh contexts and sub-agent isolation.

```markdown
# After failed attempts
/clear

# Or use sub-agent for exploration
"Use a sub-agent to investigate this issue.
Report back findings without modifying files."
```

### Scope Creep

**Problem**: Claude modifies files outside intended scope.

**Solution**: Explicit boundaries and monitoring.

```markdown
## Scope Enforcement
IMPORTANT: Only modify files in these directories:
- src/auth/
- tests/auth/

If you need to change files elsewhere:
1. Stop immediately
2. List the files and explain why
3. Wait for my approval
```

### Over-Engineering

**Problem**: Agents add unnecessary complexity, abstractions, or features.

**Solution**: Minimal implementation constraints.

```markdown
## Implementation Rules
- Implement the minimum viable solution
- No premature optimization
- No unnecessary abstractions
- Follow existing patterns exactly
- If in doubt, ask before adding complexity
```

---

## 7. CLAUDE.md Template Recommendations

### Minimal Template

For small projects or getting started:

```markdown
# Project: [Name]

## Quick Start
- Install: `npm install`
- Dev: `npm run dev`
- Test: `npm test`
- Build: `npm run build`

## Stack
- TypeScript 5.x
- Node.js 20+
- Jest for testing

## Rules
- Use TypeScript strict mode
- Write tests for new features
- Follow existing code patterns
```

### Standard Template

For typical development projects:

```markdown
# Project: [Name]

## Overview
[2-3 sentences describing what this project does]

## Architecture
```
src/
  api/       # REST endpoints
  models/    # Database models
  services/  # Business logic
  utils/     # Shared utilities
tests/       # Test files mirror src/ structure
```

## Tech Stack
- Language: TypeScript 5.x (strict mode)
- Runtime: Node.js 20+
- Framework: Express.js
- Database: PostgreSQL with Prisma ORM
- Testing: Jest + Supertest

## Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run build        # Build for production
```

## Code Style
- Use functional components where possible
- Prefer async/await over .then()
- Maximum file length: 300 lines
- Use descriptive variable names

## Testing Requirements
- Minimum 80% code coverage
- Write tests before implementation (TDD)
- Use meaningful test descriptions
- Mock external services, not internal modules

## Git Conventions
- Branch format: `feature/`, `bugfix/`, `hotfix/`
- Commit format: `type(scope): description`
- Squash merge to main
- Delete branches after merge

## IMPORTANT Rules
- NEVER commit secrets or API keys
- ALWAYS run tests before committing
- Do NOT modify files outside your task scope
- Ask before making architectural changes
```

### Full Template

For enterprise or complex projects:

```markdown
# Project: [Name]

## Overview
[Project description and goals]

## Architecture
See @docs/architecture.md for detailed system design.

### Key Components
- **API Layer**: REST endpoints in `src/api/`
- **Service Layer**: Business logic in `src/services/`
- **Data Layer**: Database access in `src/repositories/`
- **Domain Models**: `src/models/`

### External Dependencies
- Auth0 for authentication
- Stripe for payments
- AWS S3 for file storage
- Redis for caching

## Tech Stack
- Language: TypeScript 5.x (strict mode enabled)
- Runtime: Node.js 20 LTS
- Framework: NestJS 10.x
- Database: PostgreSQL 15 with Prisma
- Cache: Redis 7.x
- Queue: Bull with Redis
- Testing: Jest, Supertest, Testcontainers

## Development Setup
```bash
# Prerequisites
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15 (or use Docker)

# Setup
cp .env.example .env
docker-compose up -d
npm install
npm run db:migrate
npm run dev
```

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |

## Code Style Guide

### File Organization
- One class/component per file
- Maximum 300 lines per file
- Group imports: external, internal, relative

### Naming Conventions
- Classes: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case.ts

### Patterns to Follow
- Repository pattern for data access
- Dependency injection via NestJS
- DTOs for API request/response
- Domain events for cross-module communication

### Anti-Patterns to Avoid
- Direct database queries in controllers
- Business logic in controllers
- Circular dependencies
- God classes/modules

## Testing Strategy

### Unit Tests
- Located in `__tests__/` directories
- Mock external dependencies
- Test edge cases and error handling
- Naming: `[function].test.ts`

### Integration Tests
- Located in `tests/integration/`
- Use Testcontainers for database
- Test API endpoints end-to-end
- Clean database between tests

### Coverage Requirements
- Overall: 80% minimum
- Critical paths: 95% minimum
- New code: Must include tests

## Security Guidelines
- NEVER log sensitive data (passwords, tokens, PII)
- ALWAYS validate and sanitize user input
- Use parameterized queries (Prisma handles this)
- Rate limit all public endpoints
- Review dependencies for vulnerabilities weekly

## Git Workflow

### Branches
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Production fixes

### Commits
Format: `type(scope): description`

Types: feat, fix, docs, style, refactor, test, chore

### Pull Requests
- Link to issue/ticket
- Include test coverage
- Require 2 approvals
- Squash merge only

## Agent Instructions

### Before Coding
1. Read relevant existing code
2. Check for similar implementations
3. Create a plan and share it
4. Wait for approval on significant changes

### During Coding
- Follow existing patterns exactly
- Write tests alongside implementation
- Commit at logical checkpoints
- Document complex logic

### CRITICAL Rules
- YOU MUST run `npm test` before any commit
- YOU MUST NOT modify authentication code without approval
- YOU MUST NOT change database schemas without migration
- YOU MUST NOT commit .env files or secrets
- STOP and ask if task requires changes outside specified scope

### Checkpoint Requirements
Create checkpoint before:
- Database migrations
- Authentication changes
- Payment processing changes
- Infrastructure modifications

## Common Workflows

### Adding a New Feature
1. Create feature branch from develop
2. Write failing tests (TDD)
3. Implement minimal solution
4. Ensure tests pass
5. Update documentation if needed
6. Create PR with description

### Fixing a Bug
1. Create bugfix branch
2. Write test that reproduces bug
3. Fix the bug (test should pass)
4. Check for related issues
5. Create PR with bug description

### Database Changes
1. Create migration: `npm run db:migrate:create`
2. Write migration SQL
3. Test migration locally
4. Test rollback works
5. Create PR with migration only

## Troubleshooting

### Common Issues
- Port in use: `lsof -i :3000` then `kill -9 <PID>`
- Database connection: Check Docker is running
- Type errors: Run `npm run typecheck`

### Getting Help
- Check @docs/troubleshooting.md
- Search existing issues
- Ask in #engineering Slack
```

### Anti-Pattern Examples

What NOT to include:

```markdown
# BAD: Too verbose
## How to Install Node.js
First, you need to visit the Node.js website at https://nodejs.org...
Then click the download button...
Follow the installation wizard...

# BAD: Irrelevant information
## Company History
Founded in 2010, our company started as a small startup...

# BAD: Duplicate documentation
## API Documentation
### GET /users
Returns a list of users...
[500 lines of API docs that exist elsewhere]

# BAD: Overly complex command system
## Custom Commands
/feature-new-api-endpoint-with-auth-and-tests-and-docs
/bugfix-with-regression-tests-and-changelog-update
/refactor-extract-method-with-coverage-check
```

---

## 8. Sources

### Official Documentation
- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices) - Anthropic Engineering
- [Using CLAUDE.md files: Customizing Claude Code](https://claude.com/blog/using-claude-md-files) - Claude Blog
- [Model configuration - Claude Code Docs](https://code.claude.com/docs/en/model-config)
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Prompt caching - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Extended thinking tips - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips)

### Community Guides
- [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) - HumanLayer Blog
- [Claude Skills and CLAUDE.md: a practical 2026 guide](https://www.gend.co/blog/claude-skills-claude-md-guide) - Gend.co
- [My 7 essential Claude Code best practices for production-ready AI](https://www.eesel.ai/blog/claude-code-best-practices) - Eesel.ai
- [A practical guide to Claude Code model selection](https://www.eesel.ai/blog/claude-code-model-selection) - Eesel.ai
- [A complete guide to hooks in Claude Code](https://www.eesel.ai/blog/hooks-in-claude-code) - Eesel.ai
- [Cooking with Claude Code: The Complete Guide](https://www.siddharthbharath.com/claude-code-the-complete-guide/) - Sid Bharath
- [Maximising Claude Code: Building an Effective CLAUDE.md](https://www.maxitect.blog/posts/maximising-claude-code-building-an-effective-claudemd) - Maxitect Blog

### TDD and Quality
- [Claude Code and the Art of Test-Driven Development](https://thenewstack.io/claude-code-and-the-art-of-test-driven-development/) - The New Stack
- [Forcing Claude Code to TDD: An Agentic Red-Green-Refactor Loop](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/) - AlexOp.dev
- [Taming GenAI Agents: How TDD Transforms Claude Code](https://www.nathanfox.net/p/taming-genai-agents-like-claude-code) - Nathan Fox
- [CLAUDE MD TDD Wiki](https://github.com/ruvnet/claude-flow/wiki/CLAUDE-MD-TDD) - Claude Flow

### Multi-Agent and Swarms
- [Claude Flow - Agent Orchestration Platform](https://github.com/ruvnet/claude-flow) - GitHub
- [I Managed a Swarm of 20 AI Agents](https://zachwills.net/i-managed-a-swarm-of-20-ai-agents-for-a-week-here-are-the-8-rules-i-learned/) - Zach Wills
- [How to Use Claude Code Subagents to Parallelize Development](https://zachwills.net/how-to-use-claude-code-subagents-to-parallelize-development/) - Zach Wills
- [Multi-Agent Orchestration: Running 10+ Claude Instances](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) - DEV Community
- [Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) - Simon Willison

### Anti-Patterns and Pitfalls
- [Common Sub-Agent Anti-Patterns and Pitfalls](https://stevekinney.com/courses/ai-development/subagent-anti-patterns) - Steve Kinney
- [Agentic Coding Recommendations](https://lucumr.pocoo.org/2025/6/12/agentic-coding/) - Armin Ronacher
- [Optimizing Agentic Coding: How to use Claude Code](https://research.aimultiple.com/agentic-coding/) - AIMultiple Research

### Cost and Performance
- [Anthropic Claude API Pricing 2026: Complete Cost Breakdown](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration) - MetaCTO
- [Claude Code Batch API Complete Guide](https://smartscope.blog/en/generative-ai/claude/claude-code-batch-processing/) - SmartScope
- [How Prompt Caching Elevates Claude Code Agents](https://www.walturn.com/insights/how-prompt-caching-elevates-claude-code-agents) - Walturn

### Templates and Examples
- [CLAUDE MD Templates Wiki](https://github.com/ruvnet/claude-flow/wiki/CLAUDE-MD-Templates) - Claude Flow
- [Claude Code Templates](https://github.com/davila7/claude-code-templates) - GitHub
- [Claude-md-examples](https://github.com/ArthurClune/claude-md-examples) - GitHub

---

## Summary: Key Takeaways

1. **CLAUDE.md is your configuration file** - Keep it concise, iterate on it, use emphasis for critical rules

2. **Model selection matters** - Use Haiku for simple tasks, Sonnet for daily work, Opus for complex reasoning

3. **TDD is the gold standard** - Tests provide structure, prevent drift, and verify correctness

4. **Hooks enforce determinism** - Use PostToolUse hooks for automatic linting, testing, and formatting

5. **Sub-agents preserve context** - Delegate exploration to keep main context clean

6. **Scope explicitly** - Define boundaries, create checkpoints, prevent scope creep

7. **Cache aggressively** - Prompt caching can reduce costs by 90%

8. **Commit frequently** - Git commits are your safety net for agent experimentation

9. **Iterate continuously** - Update CLAUDE.md as you learn what works

10. **Start simple** - Begin with minimal configuration and add complexity as needed

---

*Last updated: January 2026*
