# Plan: Repeatable Example Generation

## Goal

Create a repeatable process to generate example documents from the current repository state. Examples are **always generated, never hand-crafted**.

---

## Implementation

### Step 1: Move Examples to Root

```bash
mv docs/agent-architecture/examples/ examples/
```

### Step 2: Add npm Script for Generation

In `package.json`:
```json
{
  "scripts": {
    "examples": "node dist/src/cli/index.js scan -o examples/generated",
    "examples:all": "npm run examples && npm run examples:themes",
    "examples:themes": "node scripts/generate-examples.js"
  }
}
```

### Step 3: Create Generation Script

`scripts/generate-examples.js`:
```javascript
#!/usr/bin/env node
// Generates example output for all themes and zoom levels
import { execSync } from 'child_process';

const themes = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'colorblind-light', 'colorblind-dark'];
const levels = ['summary', 'category', 'detail'];

// Generate theme examples
for (const theme of themes) {
  execSync(`node dist/src/cli/index.js scan -o examples/themes/${theme} --theme ${theme} --level summary`, { stdio: 'inherit' });
}

// Generate zoom level examples
for (const level of levels) {
  execSync(`node dist/src/cli/index.js scan -o examples/levels/${level} --level ${level}`, { stdio: 'inherit' });
}
```

### Step 4: Structure

```
examples/
├── README.md           # How to regenerate
├── generated/          # Default output (npm run examples)
│   ├── component-map.md
│   ├── hierarchy.md
│   ├── dataflow.md
│   ├── README.md
│   └── config.json
├── themes/             # Theme variations
│   ├── light/
│   ├── dark/
│   └── ...
└── levels/             # Zoom level variations
    ├── summary/
    ├── category/
    └── detail/
```

### Step 5: Examples README

`examples/README.md`:
```markdown
# Generated Examples

These examples are generated from this repository's agent configuration.

## Regenerate

```bash
npm run examples      # Generate default examples
npm run examples:all  # Generate all variations
```

## Last Generated

Check the timestamp at the bottom of each diagram file.
```

---

## Tasks

- [ ] Move `docs/agent-architecture/examples/` to `/examples/`
- [ ] Delete old hand-crafted content
- [ ] Add `examples` npm script to package.json
- [ ] Create `scripts/generate-examples.js`
- [ ] Create `examples/README.md`
- [ ] Run `npm run examples:all` to generate
- [ ] Update main README.md links
- [ ] Add to .gitignore or commit generated files (decision needed)

---

## Decision: Commit Generated Files?

**Option A: Commit generated files**
- Pros: Examples visible on GitHub without running commands
- Cons: Can get out of sync, larger repo

**Option B: Generate on demand only**
- Pros: Always fresh, smaller repo
- Cons: Users must run command to see examples

**Recommendation: Option A** - Commit generated files so they're visible on GitHub, but document the regeneration process.
