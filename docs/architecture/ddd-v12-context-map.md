# DDD v1.2 Context Map - Visual Architecture

**Related:** [DDD-003: Learning-Enhanced Domain Model](../adr/DDD-003-learning-enhanced-domain-model.md)

---

## Complete Context Map

```mermaid
graph TB
    subgraph "Core Domain - Learning Enhanced"
        AS[Agent Scanning Context]
        SV[Security Validation Context]
        DG[Documentation Generation Context]
    end

    subgraph "Supporting Domain"
        TS[Theme System Context]
        IC[Intelligence Context<br/><i>Anti-Corruption Layer</i>]
    end

    subgraph "External Learning Systems"
        CF[Claude Flow V3<br/>Hooks System]
        AB[AgentDB<br/>HNSW Vector Search]
        RB[ReasoningBank<br/>Trajectory Storage]
    end

    AS -->|"Customer-Supplier<br/>provides config"| SV
    AS -->|"Customer-Supplier<br/>provides config"| DG
    SV -->|"Customer-Supplier<br/>security summary"| DG
    TS -->|"Open Host Service<br/>styling"| DG

    AS -.->|"Published Events<br/>scan patterns"| IC
    SV -.->|"Published Events<br/>threat patterns"| IC
    DG -.->|"Published Events<br/>template preferences"| IC

    IC -.->|"Published Events<br/>optimizations"| AS
    IC -.->|"Published Events<br/>risk scores"| SV
    IC -.->|"Published Events<br/>template suggestions"| DG

    IC -->|"ACL<br/>translate"| CF
    IC -->|"ACL<br/>translate"| AB
    IC -->|"ACL<br/>translate"| RB

    style AS fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style SV fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style DG fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style TS fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style IC fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style CF fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,stroke-dasharray: 5 5
    style AB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,stroke-dasharray: 5 5
    style RB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,stroke-dasharray: 5 5
```

---

## Aggregate Collaboration

```mermaid
graph TB
    subgraph "Agent Scanning Context"
        ASC[AgentScopeConfiguration<br/><b>Aggregate Root</b>]
        ASC_E1[Agent<br/><i>Entity</i>]
        ASC_E2[Skill<br/><i>Entity</i>]
        ASC_VO[ScanPattern<br/><i>Learning VO</i>]
    end

    subgraph "Security Validation Context"
        SV_AR[SecurityAssessment<br/><b>Aggregate Root</b>]
        SV_E1[SecurityFinding<br/><i>Entity</i>]
        SV_VO[ThreatPattern<br/><i>Learning VO</i>]
    end

    subgraph "Documentation Generation Context"
        DG_AR[RichDocument<br/><b>Aggregate Root</b>]
        DG_E1[Section<br/><i>Entity</i>]
        DG_VO[TemplatePreference<br/><i>Learning VO</i>]
    end

    subgraph "Theme System Context"
        TS_AR[ThemePalette<br/><b>Aggregate Root</b>]
    end

    subgraph "Intelligence Context (ACL)"
        IC_AR[IntelligenceCoordinator<br/><b>Aggregate Root</b>]
        IC_S1[ClaudeFlowAdapter<br/><i>ACL Service</i>]
        IC_S2[AgentDBAdapter<br/><i>ACL Service</i>]
        IC_S3[ReasoningBankAdapter<br/><i>ACL Service</i>]
    end

    ASC -->|"provides config"| SV_AR
    ASC -->|"provides config"| DG_AR
    SV_AR -->|"security summary"| DG_AR
    TS_AR -->|"styling"| DG_AR

    ASC -.->|"pattern events"| IC_AR
    SV_AR -.->|"learning events"| IC_AR
    DG_AR -.->|"preference events"| IC_AR

    IC_AR -.->|"suggestions"| ASC
    IC_AR -.->|"risk scores"| SV_AR
    IC_AR -.->|"template opts"| DG_AR

    IC_AR --> IC_S1
    IC_AR --> IC_S2
    IC_AR --> IC_S3

    style ASC fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style SV_AR fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style DG_AR fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style TS_AR fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style IC_AR fill:#fff3e0,stroke:#e65100,stroke-width:3px
```

---

## Learning Integration Flow

```mermaid
sequenceDiagram
    participant CLI
    participant AS as AgentScanning
    participant SV as SecurityValidation
    participant DG as DocumentationGen
    participant IC as Intelligence Context
    participant CF as Claude Flow Hooks
    participant AB as AgentDB/HNSW
    participant RB as ReasoningBank

    Note over CLI,RB: 1. PRE-SCAN: Get Learned Optimizations

    CLI->>IC: Get scan optimizations (domain query)
    IC->>AB: Search similar configs (HNSW)
    AB-->>IC: Vector search results (k=5)
    IC-->>CLI: Domain optimizations

    Note over CLI,RB: 2. SCAN: Apply Optimizations

    CLI->>AS: Scan with optimizations
    AS->>AS: Apply learned file skips
    AS->>AS: Use optimal parser order
    AS-->>CLI: AgentConfigScanned event

    Note over CLI,RB: 3. POST-SCAN: Store Pattern

    AS->>IC: Store scan pattern
    IC->>CF: Publish hook event
    IC->>AB: Store embedding (64-dim)
    IC->>RB: Record trajectory step

    Note over CLI,RB: 4. SECURITY VALIDATION

    CLI->>IC: Get threat patterns
    IC->>AB: Search similar threats (HNSW)
    AB-->>IC: Threat patterns (k=10)
    IC-->>CLI: Risk optimizations

    CLI->>SV: Validate with learned patterns
    SV->>SV: Apply false positive filters
    SV->>SV: Use adjusted DREAD weights
    SV-->>CLI: SecurityAssessmentCompleted

    SV->>IC: Store threat patterns
    IC->>AB: Update threat embeddings

    Note over CLI,RB: 5. DOCUMENTATION GENERATION

    CLI->>IC: Get template preferences
    IC->>AB: Search similar configs (HNSW)
    AB-->>IC: Template preferences (k=3)
    IC-->>CLI: Template suggestions

    CLI->>DG: Generate with preferences
    DG->>DG: Apply section order
    DG->>DG: Use verbosity level
    DG-->>CLI: DocumentGenerated

    DG->>IC: Store template preference
    IC->>AB: Update preference embeddings

    Note over CLI,RB: 6. FEEDBACK LOOP

    CLI->>IC: User feedback (corrections)
    IC->>AB: Adjust pattern confidence
    IC->>RB: Record verdict (success/failure)
    AB-->>IC: Patterns updated
    RB-->>IC: Trajectory completed

    IC->>AS: Updated optimizations
    IC->>SV: Updated risk scores
    IC->>DG: Updated templates
```

---

## Anti-Corruption Layer Architecture

```mermaid
graph TB
    subgraph "Domain Layer (Pure Business Logic)"
        AGG[Aggregate Roots<br/>Domain Events<br/>Value Objects<br/><i>NO external dependencies</i>]
    end

    subgraph "ACL Layer (Translation)"
        IC[Intelligence Coordinator<br/><i>Aggregate Root</i>]

        subgraph "Adapters"
            CFA[ClaudeFlowAdapter<br/><i>Hook Event Translation</i>]
            ADA[AgentDBAdapter<br/><i>Vector Embedding Translation</i>]
            RBA[ReasoningBankAdapter<br/><i>Trajectory Translation</i>]
        end
    end

    subgraph "External Systems Layer"
        CF[Claude Flow V3]
        AB[AgentDB HNSW]
        RB[ReasoningBank]
    end

    AGG -->|"Domain Events<br/>(pure domain language)"| IC

    IC -->|"Translate"| CFA
    IC -->|"Translate"| ADA
    IC -->|"Translate"| RBA

    CFA -->|"Hook Events<br/>(claude-flow format)"| CF
    ADA -->|"Embeddings + Metadata<br/>(vector format)"| AB
    RBA -->|"Trajectories<br/>(reasoning format)"| RB

    CF -.->|"Hooks<br/>(external format)"| CFA
    AB -.->|"Vectors<br/>(HNSW results)"| ADA
    RB -.->|"Verdicts<br/>(learning results)"| RBA

    CFA -.->|"Translate"| IC
    ADA -.->|"Translate"| IC
    RBA -.->|"Translate"| IC

    IC -.->|"Suggestions<br/>(domain language)"| AGG

    style AGG fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style IC fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style CFA fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style ADA fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style RBA fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style CF fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style AB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style RB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
```

---

## Learning Cycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Bootstrap: First Use

    Bootstrap --> Deterministic: No patterns yet
    Deterministic --> ExecuteOperation: Use defaults
    ExecuteOperation --> RecordPattern: Store baseline
    RecordPattern --> Learning: Pattern stored

    Learning --> RetrieveOptimizations: Subsequent use
    RetrieveOptimizations --> PatternMatched: Found similar (confidence > 0.5)
    RetrieveOptimizations --> Deterministic: No match

    PatternMatched --> ApplyOptimizations: Use learned enhancements
    ApplyOptimizations --> ExecuteOperation: Enhanced execution

    ExecuteOperation --> RecordImprovedPattern: Store result
    RecordImprovedPattern --> FeedbackLoop: Wait for feedback

    FeedbackLoop --> PositiveFeedback: Correct result
    FeedbackLoop --> NegativeFeedback: Incorrect result
    FeedbackLoop --> NoFeedback: Timeout

    PositiveFeedback --> IncreaseConfidence: +0.1 confidence
    NegativeFeedback --> DecreaseConfidence: -0.1 confidence
    NoFeedback --> MaintainConfidence: No change

    IncreaseConfidence --> ContinuousImprovement
    DecreaseConfidence --> ContinuousImprovement
    MaintainConfidence --> ContinuousImprovement

    ContinuousImprovement --> RetrieveOptimizations: Next operation

    ContinuousImprovement --> [*]: End session

    note right of Bootstrap
        Initial state:
        - No learned patterns
        - Use deterministic defaults
        - Establish baseline
    end note

    note right of PatternMatched
        Confidence thresholds:
        - > 0.85: High confidence (use)
        - 0.5-0.85: Medium (use cautiously)
        - < 0.5: Low (skip pattern)
    end note

    note right of ContinuousImprovement
        After 10+ operations:
        - 25%+ speed improvement
        - 40%+ false positive reduction
        - 80%+ user satisfaction
    end note
```

---

## Storage Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        AGG[Aggregate Roots<br/>AgentScopeConfiguration<br/>SecurityAssessment<br/>RichDocument]
    end

    subgraph "Intelligence Context (ACL)"
        IC[Intelligence Coordinator]
        CFA[ClaudeFlow Adapter]
        ADA[AgentDB Adapter]
        RBA[ReasoningBank Adapter]
    end

    subgraph "Storage Layer"
        subgraph "AgentDB/HNSW"
            HNSW[HNSW Index<br/><i>64-dim vectors</i>]
            VEC_META[Vector Metadata<br/><i>Pattern info</i>]
        end

        subgraph "SQLite"
            PATTERNS[Patterns Table<br/><i>Structured data</i>]
            PREFS[Preferences Table<br/><i>User settings</i>]
            STATS[Statistics Table<br/><i>Usage metrics</i>]
        end

        subgraph "ReasoningBank"
            TRAJ[Trajectories<br/><i>Operation sequences</i>]
            VERDICTS[Verdicts<br/><i>Success/failure</i>]
        end

        subgraph "Claude Flow"
            HOOKS[Hook Events<br/><i>Published events</i>]
        end
    end

    AGG -->|"Domain Events"| IC

    IC -->|"Translate"| CFA
    IC -->|"Translate"| ADA
    IC -->|"Translate"| RBA

    ADA -->|"Store embeddings"| HNSW
    ADA -->|"Store metadata"| VEC_META
    ADA -->|"Store patterns"| PATTERNS
    ADA -->|"Store preferences"| PREFS
    ADA -->|"Store stats"| STATS

    RBA -->|"Store trajectories"| TRAJ
    RBA -->|"Store verdicts"| VERDICTS

    CFA -->|"Publish events"| HOOKS

    HNSW -.->|"Vector search<br/>(< 100ms)"| ADA
    VEC_META -.->|"Metadata lookup"| ADA
    PATTERNS -.->|"Pattern query"| ADA
    PREFS -.->|"Preference query"| ADA
    STATS -.->|"Statistics query"| ADA

    TRAJ -.->|"Strategy query"| RBA
    VERDICTS -.->|"Verdict lookup"| RBA

    HOOKS -.->|"Hook callbacks"| CFA

    ADA -.->|"Domain suggestions"| IC
    RBA -.->|"Domain feedback"| IC
    CFA -.->|"Domain events"| IC

    IC -.->|"Optimizations"| AGG

    style HNSW fill:#4caf50,stroke:#1b5e20,color:#fff,stroke-width:2px
    style PATTERNS fill:#2196f3,stroke:#0d47a1,color:#fff,stroke-width:2px
    style TRAJ fill:#9c27b0,stroke:#4a148c,color:#fff,stroke-width:2px
    style HOOKS fill:#ff9800,stroke:#e65100,color:#fff,stroke-width:2px
```

---

## Dependency Graph

```mermaid
graph TD
    AS[Agent Scanning<br/>Context] --> IC[Intelligence<br/>Context]
    SV[Security Validation<br/>Context] --> IC
    DG[Documentation Generation<br/>Context] --> IC
    TS[Theme System<br/>Context] --> IC

    AS --> SV
    AS --> DG
    SV --> DG
    TS --> DG

    IC -->|"ACL"| CF[Claude Flow]
    IC -->|"ACL"| AB[AgentDB]
    IC -->|"ACL"| RB[ReasoningBank]

    style AS fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style SV fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style DG fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    style TS fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style IC fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style CF fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style AB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style RB fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
```

**Rules:**
1. ✅ Core domains depend on Intelligence Context (supporting)
2. ✅ Intelligence Context depends on external systems (ACL)
3. ❌ Core domains NEVER depend directly on external systems
4. ✅ No circular dependencies
5. ✅ Event-driven communication (loose coupling)

---

## Event Storming Results

```mermaid
graph LR
    subgraph "Commands (Blue)"
        C1[Scan Config]
        C2[Validate Security]
        C3[Generate Documentation]
        C4[Store Pattern]
        C5[Search Similar]
    end

    subgraph "Domain Events (Orange)"
        E1[AgentConfigScanned]
        E2[SecurityAssessmentCompleted]
        E3[DocumentGenerated]
        E4[PatternStoredInMemory]
        E5[SimilarPatternsFound]
        E6[ThreatPatternLearned]
        E7[TemplatePreferenceLearned]
    end

    subgraph "Aggregates (Yellow)"
        A1[AgentScopeConfiguration]
        A2[SecurityAssessment]
        A3[RichDocument]
        A4[IntelligenceCoordinator]
    end

    subgraph "Policies (Purple)"
        P1[Store Pattern After Scan]
        P2[Adjust Confidence on Feedback]
        P3[Suggest Optimizations Before Operation]
    end

    subgraph "Read Models (Green)"
        R1[Scan Optimizations View]
        R2[Threat Patterns View]
        R3[Template Preferences View]
    end

    C1 --> A1 --> E1
    C2 --> A2 --> E2
    C3 --> A3 --> E3
    C4 --> A4 --> E4
    C5 --> A4 --> E5

    E1 --> P1 --> E4
    E2 --> P1 --> E6
    E3 --> P1 --> E7

    E5 --> P3 --> R1
    E5 --> P3 --> R2
    E5 --> P3 --> R3

    E4 --> R1
    E6 --> R2
    E7 --> R3

    style C1 fill:#2196f3,color:#fff
    style C2 fill:#2196f3,color:#fff
    style C3 fill:#2196f3,color:#fff
    style C4 fill:#2196f3,color:#fff
    style C5 fill:#2196f3,color:#fff

    style E1 fill:#ff9800,color:#fff
    style E2 fill:#ff9800,color:#fff
    style E3 fill:#ff9800,color:#fff
    style E4 fill:#ff9800,color:#fff
    style E5 fill:#ff9800,color:#fff
    style E6 fill:#ff9800,color:#fff
    style E7 fill:#ff9800,color:#fff

    style A1 fill:#ffeb3b,color:#000
    style A2 fill:#ffeb3b,color:#000
    style A3 fill:#ffeb3b,color:#000
    style A4 fill:#ffeb3b,color:#000

    style P1 fill:#9c27b0,color:#fff
    style P2 fill:#9c27b0,color:#fff
    style P3 fill:#9c27b0,color:#fff

    style R1 fill:#4caf50,color:#fff
    style R2 fill:#4caf50,color:#fff
    style R3 fill:#4caf50,color:#fff
```

---

*Generated by AgentScope DDD Expert*
*Last Updated: 2026-01-25*
