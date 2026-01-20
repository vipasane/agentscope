# AgentScope Development Environment

Docker-based development container for AgentScope with Claude Flow V3 multi-agent swarm orchestration.

## Environment Specifications

| Component | Version | Description |
|-----------|---------|-------------|
| **Base OS** | Debian 12 (Bookworm) | Latest stable Debian |
| **Node.js** | LTS (v24.x) | With pnpm, yarn, nvm |
| **Docker** | Latest (DinD) | Docker-in-Docker for isolated tests |
| **Compose** | v2 | Multi-container orchestration |
| **GitHub CLI** | Latest | PR, issue management |
| **Claude Code** | Latest | AI-powered development assistant |
| **Claude Flow** | V3 | Multi-agent swarm coordination |

## Features

- **Docker-in-Docker** - Run containers inside the devcontainer for isolated testing
- **Claude Code** - Pre-installed globally on container creation
- **Claude Flow V3** - Auto-initialized with daemon on container start
- **VS Code Extensions** - ESLint, TypeScript, Docker tools, Markdown support
- **BuildKit** - Faster container builds with `DOCKER_BUILDKIT=1`
- **Non-root Docker** - Run Docker commands without sudo

## Ports

| Port | Purpose |
|------|---------|
| 3000 | Development server |
| 8080 | Alternative dev/API server |

## Pre-installed VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| `yzhang.markdown-all-in-one` | Markdown editing and preview |
| `dbaeumer.vscode-eslint` | JavaScript/TypeScript linting |
| `ms-vscode.vscode-typescript-next` | TypeScript language features |
| `ms-azuretools.vscode-docker` | Docker container management |

## VS Code Settings

The devcontainer configures these editor settings:

```json
{
  "editor.formatOnSave": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Lifecycle Commands

### On Container Creation (`postCreateCommand`)

```bash
npm install -g @anthropic-ai/claude-code
```

Installs Claude Code globally for AI-assisted development.

### On Container Start (`postStartCommand`)

```bash
npx @claude-flow/cli@latest init --force
npx @claude-flow/cli@latest daemon start --quiet
```

Initializes Claude Flow and starts the background daemon for multi-agent coordination.

## Usage

### Opening in VS Code

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the project folder
3. Click "Reopen in Container" when prompted (or use Command Palette: `Dev Containers: Reopen in Container`)

### Opening in GitHub Codespaces

1. Navigate to the repository on GitHub
2. Click "Code" > "Codespaces" > "Create codespace on main"

### Manual Build

```bash
# From project root
devcontainer build --workspace-folder .
devcontainer up --workspace-folder .
```

## Claude Flow Commands

Once the container starts, Claude Flow is ready to use:

```bash
# Check daemon status
npx @claude-flow/cli@latest daemon status

# Initialize a swarm
npx @claude-flow/cli@latest swarm init --topology hierarchical

# Spawn an agent
npx @claude-flow/cli@latest agent spawn -t coder --name my-agent

# Check system health
npx @claude-flow/cli@latest doctor
```

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `DOCKER_BUILDKIT` | `1` | Enable BuildKit for faster builds |
| `COMPOSE_DOCKER_CLI_BUILD` | `1` | Use BuildKit with Docker Compose |

## Troubleshooting

### Docker daemon not running

```bash
# Check Docker status
docker info

# If Docker-in-Docker failed, restart the container
# VS Code: Command Palette > "Dev Containers: Rebuild Container"
```

### Claude Flow daemon issues

```bash
# Check daemon status
npx @claude-flow/cli@latest daemon status

# Restart daemon
npx @claude-flow/cli@latest daemon stop
npx @claude-flow/cli@latest daemon start

# Run diagnostics
npx @claude-flow/cli@latest doctor --fix
```

### Node.js version issues

```bash
# Check current version
node --version

# Switch versions with nvm
nvm install 22
nvm use 22
```

## Customization

To add features or modify the environment, edit `devcontainer.json`:

```jsonc
{
  // Add more VS Code extensions
  "customizations": {
    "vscode": {
      "extensions": [
        "your.extension-id"
      ]
    }
  },

  // Add more forwarded ports
  "forwardPorts": [3000, 8080, 9000],

  // Add environment variables
  "containerEnv": {
    "MY_VAR": "value"
  }
}
```

## Related Documentation

- [Dev Containers Specification](https://containers.dev/)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [Claude Flow V3](https://github.com/ruvnet/claude-flow)

---

*DevContainer configuration for AgentScope project*
