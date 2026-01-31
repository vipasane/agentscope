# Changelog

All notable changes to the @vipasane/agentscope-learning package.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2026-01-30

### Added
- Initial implementation of ReasoningBank 4-step learning pipeline
- **TrajectoryTracker**: Track execution paths with action-observation-thought steps
- **VerdictJudge**: Evaluate trajectory quality with weighted scoring
- **PatternDistiller**: Extract reusable patterns from trajectories
- **EWCConsolidator**: Prevent catastrophic forgetting with EWC++ algorithm
- **LearningCoordinator**: Orchestrate complete pipeline with simple API
- Comprehensive TypeScript type definitions with JSDoc
- Unit tests for core components
- Zero-dependency core implementation
- In-memory pattern storage and retrieval

### Performance
- <1ms trajectory step recording
- <5ms verdict judgment
- <10ms pattern distillation
- <50ms EWC consolidation
- <75ms total overhead per execution

### Documentation
- README with quick start and examples
- IMPLEMENTATION-SUMMARY with architecture details
- Inline JSDoc for all public APIs

[0.1.0-alpha.1]: https://github.com/vipasane/agentscope/releases/tag/learning-v0.1.0-alpha.1
