# Mermaid Theme Examples

All 6 theme variants showing the same agent architecture diagram.

---

## Theme 1: Light (Default)

Standard light theme - good for light mode interfaces.

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '14px' }}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% Light theme classDefs
    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b
    classDef worker fill:#f3e5f5,stroke:#4a148c,color:#4a148c
    classDef specialist fill:#e8f5e9,stroke:#1b5e20,color:#1b5e20
    classDef mcpServer fill:#fff3e0,stroke:#e65100,color:#e65100

    class pr_manager,planner coordinator
    class code_review,coder worker
    class auditor,pii specialist
    class claude_flow mcpServer
```

---

## Theme 2: Dark

Dark theme using Mermaid's dark2 - good for dark mode interfaces.

```mermaid
%%{init: {'theme': 'dark'}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% Dark theme - uses Mermaid dark theme defaults
    %% Text is automatically light on dark backgrounds
```

---

## Theme 3: High Contrast Light

WCAG AAA compliant - high contrast on light background.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#000000', 'primaryTextColor': '#000000', 'primaryBorderColor': '#000000', 'lineColor': '#000000', 'secondaryColor': '#ffffff', 'tertiaryColor': '#f0f0f0', 'background': '#ffffff' }}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% High contrast light - black on white with thick borders
    classDef coordinator fill:#ffffff,stroke:#000000,stroke-width:3px,color:#000000
    classDef worker fill:#e0e0e0,stroke:#000000,stroke-width:2px,color:#000000
    classDef specialist fill:#c0c0c0,stroke:#000000,stroke-width:2px,color:#000000
    classDef mcpServer fill:#ffffff,stroke:#000000,stroke-width:3px,color:#000000,stroke-dasharray: 5 5

    class pr_manager,planner coordinator
    class code_review,coder worker
    class auditor,pii specialist
    class claude_flow mcpServer
```

---

## Theme 4: High Contrast Dark

WCAG AAA compliant - high contrast on dark background.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#ffffff', 'lineColor': '#ffffff', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460' }}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% High contrast dark - white on black with thick borders
    classDef coordinator fill:#1a1a2e,stroke:#ffffff,stroke-width:3px,color:#ffffff
    classDef worker fill:#16213e,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef specialist fill:#0f3460,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef mcpServer fill:#1a1a2e,stroke:#ffffff,stroke-width:3px,color:#ffffff,stroke-dasharray: 5 5

    class pr_manager,planner coordinator
    class code_review,coder worker
    class auditor,pii specialist
    class claude_flow mcpServer
```

---

## Theme 5: Colorblind-Safe Light

Okabe-Ito palette - safe for deuteranopia and protanopia.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '14px' }}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% Okabe-Ito colorblind-safe palette (light variant)
    %% Orange: #E69F00, Sky Blue: #56B4E9, Bluish Green: #009E73
    %% Yellow: #F0E442, Blue: #0072B2, Vermillion: #D55E00, Purple: #CC79A7
    classDef coordinator fill:#56B4E9,stroke:#0072B2,stroke-width:2px,color:#000000
    classDef worker fill:#E69F00,stroke:#D55E00,stroke-width:2px,color:#000000
    classDef specialist fill:#009E73,stroke:#005544,stroke-width:2px,color:#000000
    classDef mcpServer fill:#CC79A7,stroke:#993366,stroke-width:2px,color:#000000

    class pr_manager,planner coordinator
    class code_review,coder worker
    class auditor,pii specialist
    class claude_flow mcpServer
```

---

## Theme 6: Colorblind-Safe Dark

Okabe-Ito palette adapted for dark backgrounds.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1e1e1e', 'lineColor': '#56B4E9' }}}%%
graph TB
    subgraph github["🐙 GitHub"]
        pr_manager["👑 pr-manager"]
        code_review["🤖 code-review-swarm"]
    end

    subgraph security["🔒 Security"]
        auditor["🎯 security-auditor"]
        pii["🎯 pii-detector"]
    end

    subgraph dev["💻 Development"]
        planner["👑 planner"]
        coder["🤖 coder"]
    end

    subgraph mcp["🔌 MCP"]
        claude_flow["🟢 claude-flow"]
    end

    planner --> coder
    pr_manager --> code_review
    pr_manager -.-> claude_flow
    auditor -.-> claude_flow

    %% Okabe-Ito colorblind-safe palette (dark variant)
    %% Darker fills with bright borders for visibility
    classDef coordinator fill:#0072B2,stroke:#56B4E9,stroke-width:2px,color:#ffffff
    classDef worker fill:#D55E00,stroke:#E69F00,stroke-width:2px,color:#ffffff
    classDef specialist fill:#009E73,stroke:#00CC99,stroke-width:2px,color:#ffffff
    classDef mcpServer fill:#993366,stroke:#CC79A7,stroke-width:2px,color:#ffffff

    class pr_manager,planner coordinator
    class code_review,coder worker
    class auditor,pii specialist
    class claude_flow mcpServer
```

---

## Theme Comparison Table

| Theme | Background | Text | Coordinator | Worker | Specialist | MCP |
|-------|------------|------|-------------|--------|------------|-----|
| Light | White | Dark | `#e1f5fe` | `#f3e5f5` | `#e8f5e9` | `#fff3e0` |
| Dark | Dark | Light | Mermaid dark | Mermaid dark | Mermaid dark | Mermaid dark |
| HC Light | White | Black | `#ffffff` | `#e0e0e0` | `#c0c0c0` | `#ffffff` dashed |
| HC Dark | `#1a1a2e` | White | `#1a1a2e` | `#16213e` | `#0f3460` | `#1a1a2e` dashed |
| CB Light | White | Dark | `#56B4E9` | `#E69F00` | `#009E73` | `#CC79A7` |
| CB Dark | Dark | Light | `#0072B2` | `#D55E00` | `#009E73` | `#993366` |

---

## Color Palettes Reference

### Okabe-Ito Colorblind-Safe Palette

| Name | Hex | Swatch | Use |
|------|-----|--------|-----|
| Orange | `#E69F00` | 🟧 | Workers |
| Sky Blue | `#56B4E9` | 🔵 | Coordinators |
| Bluish Green | `#009E73` | 🟢 | Specialists |
| Yellow | `#F0E442` | 🟡 | Highlights |
| Blue | `#0072B2` | 🔷 | Borders |
| Vermillion | `#D55E00` | 🟠 | Alerts |
| Reddish Purple | `#CC79A7` | 🟣 | MCP/External |
| Black | `#000000` | ⬛ | Text |

### Material Design Colors (Light Theme)

| Type | Fill | Border | Text |
|------|------|--------|------|
| Coordinator | `#e1f5fe` | `#01579b` | `#01579b` |
| Worker | `#f3e5f5` | `#4a148c` | `#4a148c` |
| Specialist | `#e8f5e9` | `#1b5e20` | `#1b5e20` |
| Reviewer | `#fff3e0` | `#e65100` | `#e65100` |
| MCP Server | `#fce4ec` | `#880e4f` | `#880e4f` |
| Skill | `#e3f2fd` | `#0d47a1` | `#0d47a1` |
| Disabled | `#eeeeee` | `#9e9e9e` | `#9e9e9e` |

---

## Usage

```bash
# Generate with specific theme
agentscope scan --theme dark
agentscope scan --theme colorblind-light
agentscope scan --theme high-contrast-dark

# Set default in config
echo '{"theme": "dark"}' > agentscope.config.json
```

---

## Platform Rendering Notes

| Platform | Auto Dark Mode | Custom Themes | Click Events |
|----------|:--------------:|:-------------:|:------------:|
| GitHub | ✅ | ✅ | ❌ (strict) |
| VS Code | ✅ | ✅ | ⚠️ (depends) |
| Obsidian | ✅ | ✅ | ✅ |
| Docusaurus | ✅ | ✅ | ✅ |

---

[← Back to Examples](./README-example.md)
