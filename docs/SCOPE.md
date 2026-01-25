# AgentScope Scope Definition

**Last Updated**: January 2026
**Status**: Approved
**Version**: 1.0

---

## Executive Summary

AgentScope is an **Agent Architecture Documentation Tool** that scans and visualizes Claude Code agent configurations. It generates diagrams and documentation to help developers understand their agent setup.

AgentScope focuses exclusively on **agent configurations in development environments**, not infrastructure, containers, or deployment environments.

---

## What AgentScope Scans

AgentScope scans and documents:

### Agent Configurations
- **Claude Code setup** (`.claude/` directory)
- **Agent definitions** (`.claude/agents/` with YAML/JSON)
- **Skills and capabilities** (`.claude/skills/` with YAML/JSON)
- **Hooks and automation** (Claude Code hooks - 9 event types)
- **Commands** (custom command definitions)
- **Plugins** (marketplace plugin references)
- **Permissions** (access control rules)

### Configuration Files
- **`.claude/settings.json`** - Claude Code settings and agent configuration
- **`CLAUDE.md`** - Project-level agent documentation
- **`.mcp.json`** - Model Context Protocol server definitions
- **`~/.claude/`** - User-level agent configurations
- **Referenced files** - Files mentioned in CLAUDE.md (v1.2+)
- **`AGENTS.md`** - Detailed agent documentation (v1.2+)

### Output Documentation
- **Component Map Diagram** - All agents, skills, hooks, MCPs
- **Workflow Sequence Diagram** - Request flow through agent architecture
- **Hierarchy Diagram** - Agent delegation relationships
- **Dataflow Diagram** - Information flow between components
- **README.md** - Quick reference with embedded diagrams
- **AGENTS.md** - Detailed agent specifications and capabilities
- **JSON export** - Machine-readable configuration
- **Security Analysis** - DREAD risk scoring

### Supported Frameworks (v1.0+)
- **Claude Code** (primary focus)
- **MCP servers** (Model Context Protocol)
- **Claude Flow** (future v2.0+)
- **BMad Method** (future v1.2+)
- **Gemini CLI** (future v2.0+)

---

## What AgentScope Does NOT Scan

AgentScope explicitly does NOT handle:

### Container & Infrastructure (Out of Scope)
- **DevContainer configurations** (`.devcontainer/devcontainer.json`)
- **Docker files** (`Dockerfile`, `.dockerignore`)
- **Kubernetes manifests** (`.yaml`, `.yml`)
- **Infrastructure as Code** (Terraform, CloudFormation, etc.)
- **Container runtimes** (Docker, Podman, containerd)
- **Container orchestration** (Kubernetes, Docker Compose for production)
- **Container registries** (ECR, Docker Hub, etc.)

### Deployment & Operations
- **Production deployments** (cloud provider configs)
- **CI/CD pipelines** (GitHub Actions, Jenkins, GitLab CI)
- **Infrastructure provisioning** (AWS, GCP, Azure)
- **Service meshes** (Istio, Linkerd)
- **Observability platforms** (DataDog, New Relic, Prometheus)
- **Load balancers** and networking
- **Database schemas** and migrations
- **Secrets management** systems

### Development Environment Setup
- **Dev dependencies** (installed via package managers)
- **Environment variables** (`.env` files - security risk)
- **IDE configurations** (VS Code settings, JetBrains configs)
- **Git configurations** (`.git/`, `.gitignore`)
- **Build tools** configuration (webpack, esbuild, rollup)
- **Package managers** (npm, yarn, pnpm configurations)
- **Testing frameworks** configuration (Jest, Vitest, etc.)

### Code & Artifacts
- **Source code analysis** (complexity, metrics, dependencies)
- **Generated artifacts** (built files, dist/, node_modules)
- **Documentation content** (beyond agent architecture)
- **API specifications** (OpenAPI, GraphQL schemas)
- **Type definitions** (TypeScript types outside agent config)
- **Test suites** (beyond documenting test configuration)

---

## Scope Boundaries

### Clear Boundary: Agent Configuration vs. Infrastructure

| Category | AgentScope | Reason |
|----------|-----------|--------|
| Claude Code agent definitions | ✅ In Scope | Core purpose - document agent setup |
| MCP server definitions | ✅ In Scope | Agents use MCPs to extend capabilities |
| Agent hooks and automation | ✅ In Scope | Part of agent architecture |
| DevContainer configs | ❌ Out of Scope | Infrastructure, not agent config |
| Docker/Kubernetes | ❌ Out of Scope | Production deployment, not agent setup |
| CI/CD pipelines | ❌ Out of Scope | Operations, not agent development |
| Environment setup | ❌ Out of Scope | Infrastructure dependency, not agent |

### Coexistence with Other Tools

**DevContainer Scanner** (separate project)
- Scans `.devcontainer/devcontainer.json` files
- Documents container-specific configurations
- Handles container features and customizations
- Complements AgentScope by documenting dev environment

**Other tools** that complement AgentScope:
- `devcontainers/cli` - DevContainer management
- `code-metrics` tools - Code complexity analysis
- `dependency-check` - Dependency management
- `infrastructure-as-code` tools - Infrastructure documentation

---

## Agent Scope Examples

### Included: Agent Configurations

```
Project Structure (AgentScope scans these):
my-project/
├── .claude/
│   ├── agents/
│   │   ├── researcher.yaml        ✅ Scanned
│   │   ├── coder.yaml             ✅ Scanned
│   │   └── reviewer.yaml          ✅ Scanned
│   ├── skills/
│   │   ├── git-operations.yaml    ✅ Scanned
│   │   └── pr-manager.yaml        ✅ Scanned
│   ├── hooks/
│   │   └── pre-commit.js          ✅ Scanned (referenced)
│   └── settings.json              ✅ Scanned
├── CLAUDE.md                       ✅ Scanned
├── AGENTS.md                       ✅ Scanned (v1.2+)
└── .mcp.json                       ✅ Scanned
```

### Excluded: Infrastructure & Deployment

```
Project Structure (AgentScope does NOT scan these):
my-project/
├── .devcontainer/                  ❌ Not scanned
│   └── devcontainer.json           ❌ Not scanned
├── .github/workflows/              ❌ Not scanned
│   ├── ci.yaml                     ❌ Not scanned
│   └── deploy.yaml                 ❌ Not scanned
├── infra/                          ❌ Not scanned
│   ├── terraform/                  ❌ Not scanned
│   └── kubernetes/                 ❌ Not scanned
├── .env                            ❌ Not scanned (security)
├── Dockerfile                      ❌ Not scanned
├── docker-compose.yaml             ❌ Not scanned
└── k8s-deployment.yaml             ❌ Not scanned
```

---

## Use Cases

### In Scope: Agent Architecture Documentation

> "I want to understand what Claude Code agents I have and what they can do"
- Scans `.claude/` and generates diagrams
- Shows agent hierarchy, capabilities, hooks
- Creates shareable documentation

> "I want to share my agent setup with my team"
- Exports configuration to JSON/YAML
- Generates README and AGENTS.md
- Imports configuration to new machine

> "I want to audit my agent permissions and security"
- Scans all agents for permission rules
- Generates permission matrix
- Performs DREAD security scoring

### Out of Scope: Infrastructure & Deployment

> "I want to scan my DevContainer to understand the container environment"
- Use: **DevContainer Scanner** (separate project)
- Not: AgentScope

> "I want to understand my CI/CD pipeline"
- Use: GitHub Actions viewer, Gitlab CI viewer, etc.
- Not: AgentScope

> "I want to document my Kubernetes deployment"
- Use: kubectx, k9s, or cloud provider tools
- Not: AgentScope

---

## Relationship to DevContainer Scanner

**DevContainer Scanner** is a **separate, complementary project** that:

- Scans `.devcontainer/devcontainer.json` files
- Documents container features and extensions
- Generates container architecture documentation
- Handles container lifecycle hooks
- Works alongside AgentScope

**AgentScope + DevContainer Scanner = Complete Dev Environment Documentation**

```
Developer Workflow:
1. Run: agentscope scan              → Agent configuration documentation
2. Run: devcontainer-scanner scan    → Container environment documentation
3. Result: Complete dev setup understanding
```

---

## Version History

| Version | Date | Key Decision |
|---------|------|-------------|
| 1.0 | Jan 2026 | Focus exclusively on agent configurations; DevContainer Scanner is separate project |

---

## Rationale

### Why Exclude DevContainers & Infrastructure?

1. **Clear Responsibility** - AgentScope has a focused purpose: document agent architecture
2. **Simplicity** - Avoids coupling with infrastructure concerns
3. **Reusability** - Infrastructure tooling can be used independently
4. **Separation of Concerns** - Each tool does one thing well
5. **Avoid Scope Creep** - Infrastructure scanning is complex; not part of MVP
6. **Better Tools Exist** - DevContainer CLI, Kubernetes tools, etc. already handle this

### Why Focus on Agent Configurations?

1. **High Value** - Developers need to understand agent setup first
2. **Unique Position** - AgentScope is the only tool documenting agent architecture
3. **Core Competency** - Agent configuration parsing is the original focus
4. **Rapid MVP** - Focused scope enables fast delivery
5. **Community Request** - Users explicitly ask for agent documentation

---

## Migration Path

If users need DevContainer scanning:

1. **Recommended** - Use **DevContainer Scanner** (separate project)
2. **Alternative** - Integrate with existing container tools
3. **Future** - AgentScope v2.0+ may reference DevContainer Scanner output

---

## Questions & Answers

### Q: Why doesn't AgentScope scan DevContainers?

**A**: Because DevContainers are infrastructure configuration, not agent configuration. AgentScope focuses on documenting what agents you have. DevContainer Scanner (separate project) documents your container environment. Both are useful; each does one thing well.

### Q: Can I use AgentScope with DevContainers?

**A**: Yes! AgentScope scans your agent configurations, and DevContainer Scanner documents your container environment. Run both tools to get complete documentation.

### Q: Will AgentScope add DevContainer scanning later?

**A**: No. DevContainer scanning belongs in a dedicated tool (DevContainer Scanner). AgentScope stays focused on agent documentation.

### Q: What if my agents are in my DevContainer?

**A**: Run AgentScope inside the DevContainer. It will scan `.claude/` and find your agent configurations, regardless of whether they're in a container.

### Q: Can I contribute DevContainer scanning support?

**A**: No, that's out of scope for AgentScope. Consider contributing to **DevContainer Scanner** instead.

---

## Related Documentation

- **README.md** - Quick start and feature overview
- **ARCHITECTURE.md** - System design and internals
- **AgentScope-PRD-v2.md** - Product requirements
- **ADRs** - Architecture decision records

---

## Approval & Governance

**Owner**: AgentScope Core Team
**Last Reviewed**: January 2026
**Next Review**: Q2 2026

To propose changes to scope, open an issue on [GitHub](https://github.com/vipasane/agentscope) with the `scope` label.
