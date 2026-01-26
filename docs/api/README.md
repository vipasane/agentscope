# AgentScope API Documentation

Complete TypeScript API reference generated from JSDoc comments using TypeDoc.

## Quick Start

1. **Open Main Documentation**: [index.html](./index.html)
2. **Browse by Package**: [modules.html](./modules.html)
3. **Search Feature**: Use the search icon in the top-right (Ctrl+K)

## Documentation Structure

### Entry Points
- **[index.html](./index.html)** - Main page with package overview and navigation
- **[modules.html](./modules.html)** - All documented packages
- **[hierarchy.html](./hierarchy.html)** - Class inheritance chains

### By Category
- **[classes.html](./classes.html)** - All 21+ classes
- **[interfaces.html](./interfaces.html)** - All 45+ interfaces
- **[types.html](./types.html)** - All 110+ type aliases
- **[functions.html](./functions.html)** - All 150+ exported functions
- **[enums.html](./enums.html)** - Enumeration types
- **[variables.html](./variables.html)** - Module variables

### Package Documentation

Seven packages are fully documented:

| Package | Documentation | Purpose |
|---------|---------------|---------|
| **types** | [modules/types.html](./modules/types.html) | Core type definitions |
| **errors** | [modules/errors_src.html](./modules/errors_src.html) | Error handling framework |
| **security** | [modules/_claude-flow_security.html](./modules/_claude-flow_security.html) | Security framework |
| **memory** | [modules/_claude-flow_memory.html](./modules/_claude-flow_memory.html) | Memory & vector search |
| **performance** | [modules/_claude-flow_performance.html](./modules/_claude-flow_performance.html) | Performance monitoring |
| **learning** | [modules/learning_src.html](./modules/learning_src.html) | Learning framework |
| **testing** | [modules/testing_src.html](./modules/testing_src.html) | Testing utilities |

## Navigating the Documentation

### Finding What You Need

**By Name**: Use search (Ctrl+K or click search icon)
- Type: Type or class name
- Shows: Matching items with file location
- Click: Jump to documentation

**By Category**: Use sidebar navigation
- Browse modules, classes, interfaces
- Click to view documentation
- Use breadcrumbs to navigate back

**By Relationship**: Click cross-references
- All type/class references are clickable
- Links point to related documentation
- "See Also" sections suggest related items

### Understanding Documentation Pages

Each documentation page includes:

1. **Type Definition** - Code signature
2. **Description** - Detailed explanation
3. **Properties/Methods** - For classes and interfaces
4. **Examples** - Usage code blocks
5. **Related Types** - Links to related documentation

## Key Packages

### @vipasane/types
Core TypeScript type definitions including:
- Agent architecture types
- Memory system types
- Security types
- Learning types

**View**: [modules/types.html](./modules/types.html)

### @vipasane/errors
Error handling and reporting framework with:
- Structured error types
- Multiple reporter backends
- Error recovery strategies

**View**: [modules/errors_src.html](./modules/errors_src.html)

### @vipasane/security
Comprehensive security framework featuring:
- Input validation
- Threat detection
- Security scanning
- Path security

**View**: [modules/_claude-flow_security.html](./modules/_claude-flow_security.html)

### @vipasane/memory
Advanced memory management with:
- Vector embeddings
- HNSW indexing (150x faster)
- Semantic search
- Pattern storage

**View**: [modules/_claude-flow_memory.html](./modules/_claude-flow_memory.html)

### @vipasane/performance
Performance monitoring and profiling:
- Metric recording
- Memory profiling
- Execution timing
- Statistical analysis

**View**: [modules/_claude-flow_performance.html](./modules/_claude-flow_performance.html)

### @vipasane/learning
Reinforcement learning framework:
- Trajectory recording
- Pattern learning
- Decision optimization
- EWC++ consolidation

**View**: [modules/learning_src.html](./modules/learning_src.html)

### @vipasane/testing
Testing utilities and frameworks:
- Test builders
- Mock factories
- Assertion helpers
- Integration testing

**View**: [modules/testing_src.html](./modules/testing_src.html)

## Using the Documentation

### For Type Information

1. Find the type in modules or use search
2. Review the type definition
3. Check properties and methods
4. See usage examples
5. Click related types for more context

### For Class Documentation

1. Open class page from classes.html
2. Review class description
3. See properties and methods with parameters
4. Check inheritance chain
5. View examples if available

### For Integration

1. View module documentation
2. Check exported types and functions
3. Review usage examples
4. Note cross-dependencies
5. Check "See Also" for related modules

## Search Tips

**Search Features**:
- Full-text search
- Type/class/function name search
- Results show: item type, location, description
- Click result to jump to page

**Common Searches**:
- Type names: `MemoryEntry`, `SecurityFinding`
- Classes: `ErrorFactory`, `MemoryStore`
- Functions: `createVectorDatabase`, `brand`
- Error types: `BaseError`, `ValidationError`

## Documentation Features

### Interactive Elements
- **Search**: Find any type/class/function
- **Navigation**: Browse by category
- **Breadcrumbs**: See current location
- **Cross-references**: Click to navigate

### Code Examples
- **JSDoc Examples**: Included where available
- **Syntax Highlighting**: Code blocks highlighted
- **Type Information**: Parameter types shown

### Advanced Features
- **Hierarchy View**: See class inheritance
- **Module Dependencies**: Understand relationships
- **Export Information**: Know what's public
- **Type Details**: Full type information

## Offline Access

The documentation is completely static HTML:
- Works offline (no server needed)
- Can be downloaded
- Can be cached
- Can be printed

## Deploying Documentation

### GitHub Pages
```bash
# Repository settings
# Pages source: /docs folder
```

### Custom Server
```bash
# Copy to your hosting
scp -r . user@host:/var/www/docs/
```

### Static Hosts
- Netlify: Add `docs/api/` as publish directory
- Vercel: Configure as static site
- AWS S3: Upload HTML files
- Any web server: Serve as static files

## Regenerating Documentation

The documentation is generated from JSDoc comments in source code.

**To regenerate**:
```bash
npm run build:docs
```

**Or**:
```bash
npm run docs
```

**Full rebuild**:
```bash
npm run build && npm run build:docs
```

## Related Resources

- **Usage Guide**: See [../API-DOCUMENTATION-GUIDE.md](../API-DOCUMENTATION-GUIDE.md)
- **Generation Details**: See [../TYPEDOC-GENERATION-SUMMARY.md](../TYPEDOC-GENERATION-SUMMARY.md)
- **TypeDoc Official**: https://typedoc.org
- **Source Code**: [packages/](../../packages/)

## Statistics

| Metric | Value |
|--------|-------|
| Total Pages | 253 |
| Documented Packages | 7/8 |
| Total Classes | 21+ |
| Total Interfaces | 45+ |
| Total Types | 110+ |
| Total Functions | 150+ |
| Documentation Size | ~5.5 MB |

## Notes

- **cli-framework**: Excluded due to TypeScript constraints (see source at `packages/cli-framework/src/`)
- **Custom Tags**: Some @custom tags displayed as warnings (doesn't affect documentation)
- **Relative Links**: Some JSDoc relative paths may not resolve in HTML context

## Support

For help:
1. Check the [Usage Guide](../API-DOCUMENTATION-GUIDE.md)
2. Review the [Generation Summary](../TYPEDOC-GENERATION-SUMMARY.md)
3. See source JSDoc comments
4. Visit https://typedoc.org

---

**Documentation Generated**: 2026-01-26
**TypeDoc Version**: 0.28.16
**Status**: Complete and ready to use
