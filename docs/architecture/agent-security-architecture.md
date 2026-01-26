# Agent Security Architecture

**Status**: Proposed
**Version**: 2.0 (Agent-Focused)
**Date**: 2026-01-25

---

## Overview

AgentScope's security architecture focuses exclusively on **Claude Code and coding agent configurations**, providing comprehensive threat detection and risk assessment for:

- Claude Code settings (`.claude/settings.json`)
- Agent instructions (`CLAUDE.md`)
- Hook configurations
- MCP server security
- Permission models
- Plugin validation

---

## System Architecture (C4 Level 2)

### Context Diagram

```mermaid
C4Context
    title Agent Security Architecture - Context

    Person(dev, "Developer", "Configures Claude Code agents")
    System(agentscope, "AgentScope", "Scans and secures agent configurations")

    System_Ext(claude_code, "Claude Code", "AI coding assistant")
    System_Ext(mcp_servers, "MCP Servers", "External tool providers")
    System_Ext(aidefence, "AIDefence", "Prompt injection detection")

    Rel(dev, agentscope, "Runs security scan")
    Rel(agentscope, claude_code, "Analyzes configurations")
    Rel(agentscope, mcp_servers, "Validates server security")
    Rel(agentscope, aidefence, "Detects prompt injection")
```

### Container Diagram

```mermaid
C4Container
    title Agent Security Architecture - Containers

    Container(scanner, "Security Scanner", "TypeScript", "Orchestrates security scans")
    Container(validators, "Validators", "Zod + TypeScript", "Schema validation")
    Container(detectors, "Threat Detectors", "TypeScript", "Pattern matching")
    Container(assessors, "Risk Assessors", "TypeScript", "DREAD scoring")
    Container(reporters, "Report Generator", "TypeScript", "Security reports")

    ContainerDb(settings, "Settings", ".claude/settings.json", "Claude Code config")
    ContainerDb(claudemd, "Instructions", "CLAUDE.md", "Agent instructions")

    Rel(scanner, validators, "Validates")
    Rel(scanner, detectors, "Scans")
    Rel(scanner, assessors, "Assesses")
    Rel(scanner, reporters, "Generates")

    Rel(validators, settings, "Reads")
    Rel(detectors, claudemd, "Analyzes")
```

### Component Diagram

```mermaid
C4Component
    title Agent Security Architecture - Components

    Component(settingsValidator, "Settings Validator", "Zod Schema", "Validates settings.json structure")
    Component(claudeMdParser, "CLAUDE.md Parser", "TypeScript", "Parses agent instructions")
    Component(hookValidator, "Hook Validator", "TypeScript", "Validates hook configurations")
    Component(mcpValidator, "MCP Validator", "TypeScript", "Validates MCP servers")

    Component(promptInjector, "Prompt Injection Detector", "AIDefence", "Detects jailbreaks")
    Component(commandInjector, "Command Injection Detector", "Regex", "Detects shell injection")
    Component(secretDetector, "Secret Detector", "Regex", "Finds API keys, tokens")
    Component(pathValidator, "Path Traversal Detector", "TypeScript", "Validates file paths")

    Component(dreadScorer, "DREAD Scorer", "TypeScript", "Calculates risk scores")
    Component(privilegeAnalyzer, "Privilege Analyzer", "TypeScript", "Analyzes permissions")
    Component(toolPermAnalyzer, "Tool Permission Analyzer", "TypeScript", "Analyzes tool access")

    Rel(settingsValidator, hookValidator, "Validates hooks")
    Rel(settingsValidator, mcpValidator, "Validates MCP")
    Rel(claudeMdParser, promptInjector, "Scans for injection")
    Rel(hookValidator, commandInjector, "Scans commands")
    Rel(settingsValidator, secretDetector, "Scans for secrets")

    Rel(promptInjector, dreadScorer, "Contributes to score")
    Rel(commandInjector, dreadScorer, "Contributes to score")
    Rel(secretDetector, dreadScorer, "Contributes to score")
    Rel(privilegeAnalyzer, dreadScorer, "Contributes to score")
```

---

## Data Flow Diagram

### Security Scanning Flow

```mermaid
graph TB
    subgraph "Input Stage"
        I1[.claude/settings.json]
        I2[CLAUDE.md]
        I3[.claude/agents/**]
        I4[.claude/skills/**]
        I5[.mcp.json]
    end

    subgraph "Parsing Stage"
        P1[Settings Parser]
        P2[CLAUDE.md Parser]
        P3[Hook Parser]
        P4[MCP Parser]
    end

    subgraph "Validation Stage"
        V1[Schema Validation]
        V2[Type Validation]
        V3[Constraint Validation]
    end

    subgraph "Threat Detection Stage"
        T1[Prompt Injection Scan]
        T2[Command Injection Scan]
        T3[Secret Detection]
        T4[Path Traversal Check]
    end

    subgraph "Risk Assessment Stage"
        R1[DREAD Scoring]
        R2[Privilege Analysis]
        R3[Tool Permission Analysis]
        R4[Vulnerability Prioritization]
    end

    subgraph "Report Generation Stage"
        G1[Aggregate Findings]
        G2[Generate Remediations]
        G3[Calculate Security Score]
        G4[Format Report]
    end

    subgraph "Output Stage"
        O1[Security Report JSON]
        O2[Markdown Report]
        O3[Terminal Output]
        O4[CI/CD Exit Code]
    end

    I1 --> P1
    I2 --> P2
    I3 --> P2
    I4 --> P2
    I5 --> P4

    P1 --> V1
    P2 --> V1
    P3 --> V1
    P4 --> V1

    V1 --> T1
    V1 --> T2
    V1 --> T3
    V1 --> T4

    T1 --> R1
    T2 --> R1
    T3 --> R1
    T4 --> R2

    R1 --> R4
    R2 --> R4
    R3 --> R4

    R4 --> G1
    G1 --> G2
    G2 --> G3
    G3 --> G4

    G4 --> O1
    G4 --> O2
    G4 --> O3
    G4 --> O4

    style I1 fill:#e3f2fd,stroke:#1976d2
    style I2 fill:#e3f2fd,stroke:#1976d2
    style T1 fill:#fff3e0,stroke:#f57c00
    style T2 fill:#fff3e0,stroke:#f57c00
    style T3 fill:#fff3e0,stroke:#f57c00
    style R1 fill:#fce4ec,stroke:#c2185b
    style G4 fill:#e8f5e9,stroke:#388e3c
    style O1 fill:#e8f5e9,stroke:#388e3c
```

---

## Component Interactions

### Settings Validation Flow

```mermaid
sequenceDiagram
    participant Scanner
    participant SettingsParser
    participant Validator
    participant ThreatDetector
    participant DREADScorer
    participant Reporter

    Scanner->>SettingsParser: Read .claude/settings.json
    SettingsParser->>Validator: Parse JSON
    Validator->>Validator: Validate with Zod schema

    alt Invalid Schema
        Validator-->>Scanner: Return validation errors
    else Valid Schema
        Validator->>ThreatDetector: Pass validated config
        ThreatDetector->>ThreatDetector: Scan for injection patterns
        ThreatDetector->>ThreatDetector: Detect secrets
        ThreatDetector->>ThreatDetector: Check path traversal

        ThreatDetector->>DREADScorer: Pass threat findings
        DREADScorer->>DREADScorer: Calculate DREAD score
        DREADScorer->>DREADScorer: Determine priority

        DREADScorer->>Reporter: Pass risk assessment
        Reporter->>Reporter: Generate report
        Reporter-->>Scanner: Return security report
    end
```

### Prompt Injection Detection Flow

```mermaid
sequenceDiagram
    participant Scanner
    participant ClaudeMdParser
    participant LocalDetector
    participant AIDefence
    participant ReasoningBank
    participant Reporter

    Scanner->>ClaudeMdParser: Read CLAUDE.md
    ClaudeMdParser->>LocalDetector: Scan with regex patterns

    alt Local Detection Positive
        LocalDetector->>AIDefence: Deep scan with AIDefence
        AIDefence->>AIDefence: Analyze prompt structure
        AIDefence->>ReasoningBank: Search similar threats

        ReasoningBank-->>AIDefence: Return similar patterns
        AIDefence->>AIDefence: Calculate confidence score

        AIDefence-->>Scanner: Return threat analysis
    else Local Detection Negative
        LocalDetector-->>Scanner: No threats detected
    end

    Scanner->>Reporter: Generate findings
    Reporter-->>Scanner: Return report
```

### MCP Server Security Validation Flow

```mermaid
sequenceDiagram
    participant Scanner
    participant McpParser
    participant CommandValidator
    participant TransportValidator
    participant AuthValidator
    participant Reporter

    Scanner->>McpParser: Parse MCP server configs
    McpParser->>CommandValidator: Validate command string

    CommandValidator->>CommandValidator: Check for injection
    alt Command Injection Detected
        CommandValidator-->>Scanner: Critical vulnerability
    else Command Safe
        CommandValidator->>TransportValidator: Validate transport

        TransportValidator->>TransportValidator: Check encryption (wss://, https://)
        alt Unencrypted Transport
            TransportValidator-->>Scanner: High severity issue
        else Transport Encrypted
            TransportValidator->>AuthValidator: Check authentication

            AuthValidator->>AuthValidator: Validate auth config
            alt Missing Authentication
                AuthValidator-->>Scanner: Medium severity issue
            else Authentication Present
                AuthValidator-->>Scanner: MCP server secure
            end
        end
    end

    Scanner->>Reporter: Generate MCP report
    Reporter-->>Scanner: Return findings
```

---

## Security Boundaries

### Trust Boundaries

```mermaid
graph TB
    subgraph "Trusted Zone"
        AgentScope[AgentScope Scanner]
        Validators[Validators]
        Detectors[Threat Detectors]
    end

    subgraph "Untrusted Input Zone"
        Settings[settings.json]
        ClaudeMd[CLAUDE.md]
        Hooks[Hook Commands]
        MCP[MCP Servers]
    end

    subgraph "External Services"
        AIDefence[AIDefence API]
        ReasoningBank[ReasoningBank]
    end

    Settings -.->|Validate| Validators
    ClaudeMd -.->|Parse & Scan| Detectors
    Hooks -.->|Command Injection Check| Detectors
    MCP -.->|Transport & Auth Check| Validators

    Detectors -->|API Call| AIDefence
    Detectors -->|Vector Search| ReasoningBank

    style Settings fill:#ffcdd2,stroke:#c62828
    style ClaudeMd fill:#ffcdd2,stroke:#c62828
    style Hooks fill:#ffcdd2,stroke:#c62828
    style MCP fill:#ffcdd2,stroke:#c62828
    style AgentScope fill:#c8e6c9,stroke:#2e7d32
```

### Data Flow Security

```mermaid
graph LR
    subgraph "Input Layer"
        I1[User Input]
    end

    subgraph "Sanitization Layer"
        S1[Path Sanitizer]
        S2[Secret Redactor]
        S3[Injection Stripper]
    end

    subgraph "Validation Layer"
        V1[Schema Validator]
        V2[Type Checker]
    end

    subgraph "Processing Layer"
        P1[Threat Detector]
        P2[Risk Assessor]
    end

    subgraph "Output Layer"
        O1[Sanitized Report]
    end

    I1 --> S1
    I1 --> S2
    I1 --> S3

    S1 --> V1
    S2 --> V1
    S3 --> V1

    V1 --> P1
    V2 --> P2

    P1 --> O1
    P2 --> O1

    style I1 fill:#ffcdd2,stroke:#c62828
    style O1 fill:#c8e6c9,stroke:#2e7d32
```

---

## Deployment Architecture

### Standalone CLI

```mermaid
graph TB
    subgraph "Developer Workstation"
        CLI[agentscope security]
        Scanner[Security Scanner]
        DB[Local SQLite Cache]
    end

    subgraph "Project Directory"
        Settings[.claude/settings.json]
        ClaudeMd[CLAUDE.md]
        Agents[.claude/agents/]
    end

    subgraph "External Services"
        AIDefence[AIDefence API]
    end

    CLI --> Scanner
    Scanner --> Settings
    Scanner --> ClaudeMd
    Scanner --> Agents
    Scanner --> DB
    Scanner --> AIDefence

    Scanner --> Report[security-report.json]

    style CLI fill:#1976d2,stroke:#0d47a1,color:#fff
    style Report fill:#4caf50,stroke:#2e7d32,color:#fff
```

### CI/CD Integration

```mermaid
graph TB
    subgraph "CI/CD Pipeline"
        Checkout[Checkout Code]
        Install[Install AgentScope]
        Scan[Run Security Scan]
        Check[Check Exit Code]
    end

    subgraph "AgentScope"
        Scanner[Security Scanner]
        Validator[Validator]
        Reporter[Reporter]
    end

    subgraph "Results"
        Pass[✅ Security Passed]
        Fail[❌ Security Failed]
        Report[Upload Report Artifact]
    end

    Checkout --> Install
    Install --> Scan
    Scan --> Scanner
    Scanner --> Validator
    Validator --> Reporter

    Reporter --> Check
    Check -->|Exit 0| Pass
    Check -->|Exit 1| Fail
    Check --> Report

    style Pass fill:#4caf50,stroke:#2e7d32,color:#fff
    style Fail fill:#f44336,stroke:#c62828,color:#fff
```

---

## Quality Attributes

### Security

| Quality | Target | Measurement |
|---------|--------|-------------|
| **Threat Detection Rate** | >95% | % of known threats detected |
| **False Positive Rate** | <5% | % of safe configs flagged |
| **DREAD Accuracy** | >90% | Alignment with manual assessment |
| **Scan Time** | <5s | Time to scan typical project |

### Reliability

| Quality | Target | Measurement |
|---------|--------|-------------|
| **Uptime** | 99.9% | % time scanner available |
| **Error Rate** | <0.1% | % scans that crash |
| **Recovery Time** | <1s | Time to recover from error |

### Performance

| Quality | Target | Measurement |
|---------|--------|-------------|
| **Throughput** | 100 scans/min | Scans processed per minute |
| **Latency** | <500ms p95 | 95th percentile scan time |
| **Memory** | <100MB | Peak memory usage |

---

## Technology Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Validation** | Zod | Type-safe schema validation |
| **Parsing** | TypeScript | Configuration parsing |
| **Threat Detection** | Regex + AIDefence | Pattern matching & ML detection |
| **Risk Scoring** | DREAD Algorithm | Quantitative risk assessment |
| **Reporting** | TypeScript | Report generation |

### External Integrations

| Service | Purpose | API |
|---------|---------|-----|
| **AIDefence** | Prompt injection detection | REST API |
| **ReasoningBank** | Pattern similarity search | Vector DB |
| **@claude-flow/security** | Input validation | npm package |

---

## Security Controls

### Preventive Controls

| Control | Type | Description |
|---------|------|-------------|
| **Schema Validation** | Input | Zod schemas reject malformed configs |
| **Path Sanitization** | Input | Prevent directory traversal |
| **Secret Redaction** | Output | Remove secrets from reports |
| **Command Whitelisting** | Execution | Only allow safe hook commands |

### Detective Controls

| Control | Type | Description |
|---------|------|-------------|
| **Prompt Injection Scan** | Detection | AIDefence-powered scanning |
| **Command Injection Scan** | Detection | Regex pattern matching |
| **Secret Detection** | Detection | API key/token patterns |
| **DREAD Scoring** | Risk | Quantitative risk assessment |

### Corrective Controls

| Control | Type | Description |
|---------|------|-------------|
| **Remediation Suggestions** | Guidance | Automated fix recommendations |
| **CI/CD Blocking** | Enforcement | Fail builds on critical issues |
| **Report Generation** | Audit | Detailed vulnerability reports |

---

## Threat Model

### Threat Actors

| Actor | Motivation | Capability |
|-------|------------|------------|
| **Malicious Plugin Author** | Data exfiltration | Craft malicious hook commands |
| **Insider Threat** | Privilege escalation | Modify settings.json |
| **Supply Chain Attack** | Code injection | Compromise MCP server |
| **Accidental Misconfiguration** | None | Overly permissive settings |

### Attack Vectors

| Vector | Entry Point | Impact |
|--------|-------------|--------|
| **Prompt Injection** | CLAUDE.md, skill prompts | Agent behavior manipulation |
| **Command Injection** | Hook commands, MCP servers | Arbitrary code execution |
| **Secret Exposure** | settings.json, env vars | Credential theft |
| **Path Traversal** | File permissions, mounts | Unauthorized file access |

### Mitigations

| Threat | Mitigation | Effectiveness |
|--------|------------|---------------|
| **Prompt Injection** | AIDefence scanning + pattern matching | High |
| **Command Injection** | Command validation + sandboxing | High |
| **Secret Exposure** | Secret detection + redaction | Medium |
| **Path Traversal** | Path sanitization + allowlists | High |

---

## References

- [ADR-012: Agent Security Architecture](../adr/ADR-012-agent-security-architecture.md)
- [ADR-009: Security Model](./decisions/ADR-009-security-model.md)
- [@claude-flow/security](https://github.com/ruvnet/claude-flow/tree/main/packages/security)
- [OWASP AI Security Guide](https://owasp.org/www-project-ai-security-and-privacy-guide/)
- [DREAD Risk Assessment](https://en.wikipedia.org/wiki/DREAD_(risk_assessment_model))

---

**Last Updated**: 2026-01-25
**Version**: 2.0 (Agent-Focused)
**Status**: Proposed
