# Mermaid Theme System

AgentScope includes a comprehensive theme system for customizing the appearance of generated Mermaid diagrams. This system supports accessibility requirements including dark mode, high contrast, and colorblind-safe options.

## Built-in Themes

AgentScope ships with 6 built-in themes:

| Theme | Description | Best For |
|-------|-------------|----------|
| `light` | Default light theme with blue accents | Light mode displays, printing |
| `dark` | Dark theme with vibrant colors | Dark mode displays, terminals |
| `high-contrast-light` | High contrast on light background | WCAG AAA compliance, vision impaired users |
| `high-contrast-dark` | High contrast on dark background | WCAG AAA compliance, dark mode |
| `colorblind-light` | Okabe-Ito palette on light | Color vision deficiencies |
| `colorblind-dark` | Okabe-Ito palette on dark | Color vision deficiencies |

## CLI Usage

### Specify Theme by Name

```bash
# Use the dark theme
agentscope scan --theme dark

# Use colorblind-safe theme
agentscope scan --theme colorblind-light

# Use high contrast theme
agentscope scan --theme high-contrast-dark
```

### Custom Theme File

```bash
# Use a custom theme JSON file
agentscope scan --theme-path ./my-theme.json
```

## Configuration File

You can set the theme in your `agentscope.config.json`:

```json
{
  "theme": "dark",
  "themeOverrides": {
    "agents": {
      "coordinator": {
        "fill": "#custom-color"
      }
    }
  }
}
```

Or reference a custom theme file:

```json
{
  "themePath": "./themes/company-brand.json"
}
```

## Environment Variable

Set the default theme via environment variable:

```bash
export AGENTSCOPE_THEME=dark
agentscope scan  # Will use dark theme
```

## Resolution Priority

Theme resolution follows this priority (highest to lowest):

1. CLI `--theme` option
2. CLI `--theme-path` custom file
3. Config file `theme` or `themePath`
4. Environment variable `AGENTSCOPE_THEME`
5. Default theme (light)

## Creating Custom Themes

Create a JSON file with the following structure:

```json
{
  "id": "my-custom-theme",
  "name": "My Custom Theme",
  "scheme": "light",
  "accessibility": "AA",
  "agents": {
    "coordinator": { "fill": "#e1f5fe", "stroke": "#01579b", "strokeWidth": 3 },
    "worker": { "fill": "#f3e5f5", "stroke": "#4a148c", "strokeWidth": 2 },
    "specialist": { "fill": "#e8f5e9", "stroke": "#1b5e20", "strokeWidth": 2 },
    "reviewer": { "fill": "#fff3e0", "stroke": "#e65100", "strokeWidth": 2 },
    "custom": { "fill": "#fafafa", "stroke": "#424242", "strokeWidth": 1 }
  },
  "elements": {
    "input": { "fill": "#e8f5e9", "stroke": "#2e7d32" },
    "output": { "fill": "#fff3e0", "stroke": "#ef6c00" },
    "hook": { "fill": "#f3e5f5", "stroke": "#7b1fa2", "strokeDasharray": "5,5" },
    "mcp": { "fill": "#e3f2fd", "stroke": "#1565c0" },
    "skill": { "fill": "#fce4ec", "stroke": "#c2185b" },
    "subgraph": { "fill": "#f5f5f5", "stroke": "#9e9e9e" }
  },
  "links": {
    "delegation": { "fill": "none", "stroke": "#1976d2" },
    "tool": { "fill": "none", "stroke": "#7b1fa2" },
    "data": { "fill": "none", "stroke": "#388e3c" }
  },
  "chrome": {
    "background": "#ffffff",
    "border": "#e0e0e0",
    "text": "#212121",
    "muted": "#757575"
  }
}
```

### Theme Properties

| Property | Description |
|----------|-------------|
| `id` | Unique identifier (lowercase, hyphens only) |
| `name` | Human-readable display name |
| `scheme` | Color scheme: `light`, `dark`, or `high-contrast` |
| `accessibility` | Level: `AA`, `AAA`, or `colorblind-safe` |
| `agents` | Colors for agent node types |
| `elements` | Colors for non-agent elements |
| `links` | Colors for relationship lines |
| `chrome` | UI element colors |

### Color Format

All colors must be 6-digit hex codes:

- ✅ `#e1f5fe` - Valid
- ✅ `#01579b` - Valid
- ❌ `#e1f` - Invalid (3-digit)
- ❌ `blue` - Invalid (named color)
- ❌ `rgb(225, 245, 254)` - Invalid (RGB)

Exception: Link `fill` can be `"none"` for transparent fills.

## Programmatic API

### Using the Theme Generator

```typescript
import {
  MermaidThemeGenerator,
  createThemeGenerator,
  generateMermaidInit,
  generateClassDefs
} from 'agentscope';

// Create generator with theme name
const generator = createThemeGenerator('dark');

// Get Mermaid init directive
const init = generator.getInit();
// Output: %%{init: {"theme":"dark","themeVariables":{...}}}%%

// Get class definitions
const classDefs = generator.getClassDefs();
// Output: ['classDef coordinator fill:#...,stroke:#...', ...]

// Get all styles combined
const allStyles = generator.getAllStyles();

// Apply a class to a node
const classStatement = generator.applyClass('myNode', 'coordinator');
// Output: 'class myNode coordinator'
```

### Using the Theme Registry

```typescript
import {
  getTheme,
  getThemeOrDefault,
  getThemeRegistry,
  isBuiltinTheme
} from 'agentscope';

// Get a theme by name (returns undefined if not found)
const dark = getTheme('dark');

// Get a theme with fallback to default
const theme = getThemeOrDefault('unknown'); // Returns light theme

// Check if a theme is built-in
if (isBuiltinTheme('dark')) {
  console.log('Dark is a built-in theme');
}

// Get the registry for advanced operations
const registry = getThemeRegistry();

// Register a custom theme
registry.register({
  id: 'my-theme',
  name: 'My Theme',
  // ... full theme definition
});

// List all available themes
const themes = registry.list(); // ['light', 'dark', 'high-contrast-light', ...]
```

### Using the Theme Loader

```typescript
import { ThemeLoader, resolveTheme } from 'agentscope';

// Resolve theme based on options and configuration
const result = resolveTheme({
  cliTheme: 'dark',        // CLI --theme option
  themePath: './custom.json', // CLI --theme-path option
  overrides: {             // Runtime overrides
    agents: {
      coordinator: { fill: '#custom' }
    }
  }
});

console.log(result.theme);    // The resolved ThemePalette
console.log(result.source);   // 'cli' | 'config' | 'env' | 'default'
console.log(result.warnings); // Any warnings during resolution
```

## Accessibility Guidelines

### WCAG Compliance

- **AA (Default)**: 4.5:1 contrast ratio for normal text
- **AAA (High Contrast)**: 7:1 contrast ratio for normal text

### Colorblind-Safe Palette

The colorblind themes use the Okabe-Ito palette, which is distinguishable by people with all common types of color vision deficiency:

| Color | Hex | Use |
|-------|-----|-----|
| Sky Blue | `#56B4E9` | Coordinator |
| Orange | `#E69F00` | Worker |
| Bluish Green | `#009E73` | Specialist |
| Yellow | `#F0E442` | Reviewer |
| Blue | `#0072B2` | Custom/Links |
| Vermillion | `#D55E00` | Warnings |
| Reddish Purple | `#CC79A7` | Hooks |

### Testing Themes

When creating custom themes, test with:

1. Color contrast analyzers (e.g., WebAIM Contrast Checker)
2. Colorblind simulators (e.g., Coblis, Color Oracle)
3. Both light and dark backgrounds
4. Screen readers (colors shouldn't be the only indicator)

## Performance

The theme system is highly optimized:

| Operation | Performance |
|-----------|-------------|
| Theme generator initialization | ~500k ops/sec |
| Theme registry lookup | ~13.8M ops/sec |
| Full diagram (5 agents) | ~68k ops/sec |
| Full diagram (50 agents) | ~12k ops/sec |

Theme generation adds less than 100μs overhead to diagram generation.
