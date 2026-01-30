# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2026-01-30

### Added
- Initial alpha release of @vipasane/agentscope-security
- **InputValidator**: Zod-style validation API for strings, numbers, booleans, arrays, objects, enums
  - Email, URL, and pattern validation
  - Optional and nullable types
  - Type-safe schema validation
- **PathValidator**: Path traversal prevention and validation
  - Path sanitization
  - Directory allowlisting
  - Traversal detection
  - Relative path resolution
- **SafeExecutor**: Command injection prevention
  - Command validation and sanitization
  - Shell argument escaping
  - Command allowlisting
  - Safe command building
- **SecretsSanitizer**: Secret detection and redaction
  - API key detection (Anthropic, OpenAI, Google, AWS)
  - Token detection (GitHub, Slack)
  - Private key and credential detection
  - Entropy-based unknown secret detection
  - Content redaction
- **DREADScorer**: Security risk scoring
  - Damage, Reproducibility, Exploitability, Affected users, Discoverability
  - Severity classification (critical, high, medium, low)
- **PromptInjectionDetector**: AI-specific attack detection
  - Prompt injection patterns
  - Jailbreak attempt detection
  - Role confusion detection
- **SecurityLearningCoordinator**: Self-learning security patterns
  - Pattern storage and retrieval
  - Threat intelligence integration
  - Adaptive rule learning
- Zero external dependencies
- Full TypeScript support with strict types
- >90% test coverage
- Performance targets: <50ms validation, <100ms secret scanning

### Performance
- Input validation: ~10ms typical (target <50ms)
- Path validation: ~5ms typical (target <50ms)
- Command validation: ~5ms typical (target <50ms)
- Secret scanning: ~20ms typical (target <100ms)

### Documentation
- Comprehensive README with examples
- API reference documentation
- DREAD scoring methodology
- Implementation notes
- Benchmark suite

[0.1.0-alpha.1]: https://github.com/vipasane/agentscope/releases/tag/@vipasane/agentscope-security@0.1.0-alpha.1
