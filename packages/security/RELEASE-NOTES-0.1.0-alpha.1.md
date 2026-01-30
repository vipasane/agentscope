# Release Notes: v0.1.0-alpha.1

## Alpha Release

First alpha release of @vipasane/agentscope-security (scoped as @claude-flow/security).

### What's Included
- **Input Validation** with shell metacharacter detection (Zod-based)
- **Path Validation** with traversal prevention
- **Secret Detection** using Shannon entropy (4.5 threshold)
- **AIDefence Integration** for threat detection
- **Performance**: <20ms overhead validated
- **Test Coverage**: 90%+ coverage with 300+ tests
- **Benchmark Suite**: Comprehensive performance validation

### Performance Validated (ADR-023)
- ✅ Tier 1 (Regex): <1ms average
- ✅ Tier 2 (Entropy): <5ms average
- ✅ Tier 3 (AIDefence): <20ms average
- ✅ Integration: 546,625 validations/second

### Installation
```bash
npm install @claude-flow/security@alpha
```

### Usage Example
```typescript
import { InputValidator, PathValidator, SecretsSanitizer } from '@claude-flow/security';

// Input validation
const result = InputValidator.string().safeParse(userInput);

// Path validation
const validator = new PathValidator('/allowed/root');
const isValid = validator.validate(userPath);

// Secret detection and sanitization
const sanitizer = new SecretsSanitizer();
const safe = sanitizer.sanitize(logMessage);
```

### Known Limitations
- Alpha quality - not production ready
- API may change in future releases
- Documentation in progress
- Some integration features pending

### Breaking Changes
None (initial release)

### Next Steps
- Beta release after user feedback
- Complete API documentation
- Additional validation methods
- Performance optimizations
- Extended AIDefence integration

### Dependencies
- zod: Input schema validation
- AIDefence integration (optional)

### Files Included
- Compiled ESM and CJS builds
- TypeScript declarations
- Documentation and examples
- Benchmark reports

### Support
- Issues: https://github.com/ruvnet/agentscope/issues
- Documentation: See README.md and docs/API.md
