# Architecture Overview - Visual Guide

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                            │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │  Admin UI  │  │ In-App SDK │  │  Reports   │  │   API      │    │
│  │  (React)   │  │  (JS/Py)   │  │  (Email)   │  │  Gateway   │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │
│        │               │               │               │             │
└────────┼───────────────┼───────────────┼───────────────┼─────────────┘
         │               │               │               │
         └───────────────┴───────────────┴───────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────┐
│                         APPLICATION LAYER                             │
│                                 │                                     │
│                    ┌────────────▼───────────┐                         │
│                    │   FastAPI + ASGI       │                         │
│                    │   - Rate Limiting      │                         │
│                    │   - Input Validation   │                         │
│                    │   - Authentication     │                         │
│                    └────────────┬───────────┘                         │
│                                 │                                     │
│              ┌──────────────────┴──────────────────┐                 │
│              │                                      │                 │
│     ┌────────▼─────────┐              ┌───────────▼──────────┐      │
│     │  COMMAND SIDE    │              │    QUERY SIDE         │      │
│     │  (Write Models)  │              │   (Read Models)       │      │
│     │                  │              │                       │      │
│     │ • SubmitFeedback │              │ • FeedbackAnalytics   │      │
│     │ • Categorize     │              │ • DashboardMetrics    │      │
│     │ • DetectPattern  │              │ • SimilaritySearch    │      │
│     │                  │              │ • ReportGenerator     │      │
│     └────────┬─────────┘              └───────────▲──────────┘      │
│              │                                     │                 │
└──────────────┼─────────────────────────────────────┼─────────────────┘
               │                                     │
               │                                     │
┌──────────────▼─────────────────────────────────────┼─────────────────┐
│                         DOMAIN LAYER                │                 │
│                                                     │                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────┴───────────┐    │
│  │   Feedback      │  │ FeedbackPattern │  │  ConsentRecord   │    │
│  │   Aggregate     │  │   Aggregate     │  │    Aggregate     │    │
│  │                 │  │                 │  │                  │    │
│  │ • submit()      │  │ • detect()      │  │ • giveConsent()  │    │
│  │ • categorize()  │  │ • learn()       │  │ • revokeConsent()│    │
│  │ • linkPattern() │  │ • predict()     │  │ • hasConsent()   │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘    │
│           │                    │                     │               │
│           └────────────────────┴─────────────────────┘               │
│                                │                                     │
│                    ┌───────────▼──────────┐                          │
│                    │    Event Bus         │                          │
│                    │  (In-memory)         │                          │
│                    └───────────┬──────────┘                          │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
┌────────────────────────────────▼──────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                              │
│                                                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │  Event Store   │  │   HNSW Index   │  │  Read Models   │         │
│  │   (AgentDB)    │  │   (AgentDB)    │  │  (AgentDB)     │         │
│  │                │  │                │  │                │         │
│  │ • Append-only  │  │ • 768-dim      │  │ • Materialized │         │
│  │ • Signatures   │  │ • 150x faster  │  │ • Projections  │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
│                                                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │ Neural Models  │  │  Cache Layer   │  │  External APIs │         │
│  │  (RuVector)    │  │   (Redis)      │  │ (GitHub, npm)  │         │
│  │                │  │                │  │                │         │
│  │ • SONA         │  │ • 5min (issues)│  │ • GraphQL      │         │
│  │ • MoE routing  │  │ • 1h (npm)     │  │ • REST         │         │
│  │ • LoRA + EWC++ │  │ • Hit rate 80% │  │ • Webhooks     │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Architecture

### Feedback Submission Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ Submits feedback
     ▼
┌─────────────────────────────────────────┐
│         API Gateway                      │
│  1. Rate limit check (100/min)         │
│  2. Authentication (Bearer token)       │
│  3. Input validation (@claude-flow)     │
└────┬────────────────────────────────────┘
     │ Valid request
     ▼
┌─────────────────────────────────────────┐
│      Feedback Aggregate                 │
│  1. Sanitize content (remove PII)       │
│  2. Create Feedback entity              │
│  3. Emit FeedbackSubmittedEvent         │
└────┬────────────────────────────────────┘
     │ Event published
     ├──────────────┬──────────────┬───────────────┐
     ▼              ▼              ▼               ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Event  │  │ Neural   │  │ Pattern  │  │  Analytics   │
│  Store  │  │Classifier│  │ Detector │  │  Projection  │
│         │  │          │  │          │  │              │
│ Append  │  │ Classify │  │ Cluster  │  │ Update       │
│ event   │  │ category │  │ HNSW     │  │ metrics      │
│         │  │ sentiment│  │          │  │              │
└─────────┘  └────┬─────┘  └────┬─────┘  └──────────────┘
                  │             │
                  ▼             ▼
            ┌──────────────────────┐
            │  Update Feedback     │
            │  • Category          │
            │  • Sentiment         │
            │  • Related patterns  │
            └──────────────────────┘
```

### Neural Learning Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                   RuVector 4-Step Pipeline                    │
└──────────────────────────────────────────────────────────────┘

Step 1: RETRIEVE (HNSW Search)
┌────────────────────────────────────────────┐
│  New Feedback                              │
│  ├─ Generate embeddings (768-dim)          │
│  └─ HNSW search for similar (k=10)         │
│     → Returns in ~5ms (150x faster)        │
└────────┬───────────────────────────────────┘
         │
         ▼
Step 2: JUDGE (Verdict Classification)
┌────────────────────────────────────────────┐
│  Historical Outcomes                       │
│  ├─ Was issue resolved? (success/failure)  │
│  ├─ User satisfaction score                │
│  └─ Reasoning extraction                   │
└────────┬───────────────────────────────────┘
         │
         ▼
Step 3: DISTILL (LoRA Fine-tuning)
┌────────────────────────────────────────────┐
│  Extract Key Learnings                     │
│  ├─ Low-rank adaptation (rank=8)           │
│  ├─ Compress to small weight updates       │
│  └─ Pattern recognition improvements       │
└────────┬───────────────────────────────────┘
         │
         ▼
Step 4: CONSOLIDATE (EWC++)
┌────────────────────────────────────────────┐
│  Prevent Catastrophic Forgetting           │
│  ├─ Compute Fisher information             │
│  ├─ Protect important old weights          │
│  └─ Merge new learnings                    │
└────────────────────────────────────────────┘
```

## 🧩 Bounded Contexts Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                      Context Map                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  External Sources    │
│  • GitHub API        │
│  • npm Registry      │
│  • Discord Webhooks  │
└──────────┬───────────┘
           │ Raw data
           ▼
┌──────────────────────┐
│ Collection Gateway   │  ◄───── Anti-Corruption Layer
│ (ACL)                │          Transforms external
│                      │          models to domain
│ • GitHubAdapter      │
│ • NpmAdapter         │
│ • DiscordAdapter     │
└──────────┬───────────┘
           │ Commands
           ▼
┌──────────────────────┐
│ Feedback Collection  │
│                      │
│ • Validate           │
│ • Sanitize           │
│ • Categorize         │
└──────────┬───────────┘
           │ Events
           ├──────────────────┬──────────────────┐
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Pattern         │  │ Analytics &     │  │ Privacy &       │
│ Learning        │  │ Reporting       │  │ Compliance      │
│                 │  │                 │  │                 │
│ • Detect        │  │ • Aggregate     │  │ • Consent       │
│ • Learn         │  │ • Query         │  │ • Anonymize     │
│ • Predict       │  │ • Visualize     │  │ • Data Rights   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     │                     │                     │
     │ Predictions        │ Reports             │ Policies
     └─────────────────────┴─────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Users      │
                    └──────────────┘
```

## 🛡️ Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Defense-in-Depth Layers                       │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
┌────────────────────────────────────────┐
│ • CDN with DDoS protection             │
│ • TLS 1.3 encryption                   │
│ • IP allowlist/blocklist               │
└────────┬───────────────────────────────┘
         │
         ▼
Layer 2: API Gateway
┌────────────────────────────────────────┐
│ • Rate limiting (100/min per user)     │
│ • Request size limits                  │
│ • CORS policy                          │
└────────┬───────────────────────────────┘
         │
         ▼
Layer 3: Authentication & Authorization
┌────────────────────────────────────────┐
│ • GitHub OAuth                         │
│ • JWT tokens (1h expiry)               │
│ • Claims-based authorization           │
└────────┬───────────────────────────────┘
         │
         ▼
Layer 4: Input Validation
┌────────────────────────────────────────┐
│ • @claude-flow/security                │
│   - InputValidator (XSS, SQL injection)│
│   - PathValidator (traversal)          │
│   - SafeExecutor (command injection)   │
│ • PII detection and removal            │
└────────┬───────────────────────────────┘
         │
         ▼
Layer 5: Data Encryption
┌────────────────────────────────────────┐
│ • At-rest: AES-256-GCM                 │
│ • In-transit: TLS 1.3                  │
│ • Anonymization: SHA-256 + salt        │
└────────┬───────────────────────────────┘
         │
         ▼
Layer 6: Audit & Monitoring
┌────────────────────────────────────────┐
│ • Tamper-proof audit logs              │
│ • Anomaly detection                    │
│ • Real-time alerting                   │
│ • Incident response automation         │
└────────────────────────────────────────┘
```

## 📊 Performance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Performance Optimization Strategies                 │
└─────────────────────────────────────────────────────────────────┘

1. HNSW Indexing (150x faster)
   ┌──────────────────────────┐
   │ Brute-force: O(n)        │  ───┐
   │ 10,000 vectors = ~500ms  │     │ 150x
   └──────────────────────────┘     │ faster
   ┌──────────────────────────┐     │
   │ HNSW: O(log n)           │  ───┘
   │ 10,000 vectors = ~3ms    │
   └──────────────────────────┘

2. Multi-layer Caching
   ┌─────────────────────────────────────┐
   │ L1: In-memory (LRU, 1000 items)     │ <1ms
   └─────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │ L2: Redis (5min TTL for issues)     │ ~5ms
   └─────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │ L3: AgentDB (persistent)            │ ~50ms
   └─────────────────────────────────────┘

3. MoE Routing (75% cost reduction)
   ┌─────────────────────────────────────┐
   │ Tier 1: Agent Booster               │ <1ms, $0
   │ • Simple transforms                 │
   │ • 352x faster than LLM              │
   └─────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │ Tier 2: Haiku                       │ ~500ms, $0.0002
   │ • Simple classification             │
   └─────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │ Tier 3: Sonnet/Opus                 │ 2-5s, $0.003-$0.015
   │ • Complex reasoning                 │
   └─────────────────────────────────────┘

4. Async Processing
   ┌─────────────────────────────────────┐
   │ Synchronous (API response)          │ <500ms
   │ • Input validation                  │
   │ • Event store write                 │
   │ • Return feedback ID                │
   └─────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │ Asynchronous (background)           │ 1-5s
   │ • Neural classification             │
   │ • Pattern detection                 │
   │ • Analytics projection              │
   └─────────────────────────────────────┘
```

## 🔐 GDPR Compliance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GDPR Compliance Flow                          │
└─────────────────────────────────────────────────────────────────┘

Data Collection
┌─────────────────────────────────────┐
│ 1. Explicit Consent Request         │
│    • Clear purpose description      │
│    • Granular per-purpose           │
│    • One-click reject (equal UI)    │
│    • GPC signal recognition         │
└─────────┬───────────────────────────┘
          │ User grants consent
          ▼
Data Processing
┌─────────────────────────────────────┐
│ 2. Data Minimization                │
│    • Only collect necessary fields  │
│    • Anonymize user IDs (SHA-256)   │
│    • Remove PII automatically       │
│    • Strip IP addresses             │
└─────────┬───────────────────────────┘
          │
          ▼
Data Storage
┌─────────────────────────────────────┐
│ 3. Secure Storage                   │
│    • AES-256 encryption at rest     │
│    • Access controls (claims-based) │
│    • Audit trail (tamper-proof)     │
│    • 24-month retention policy      │
└─────────┬───────────────────────────┘
          │
          ▼
Data Subject Rights
┌─────────────────────────────────────┐
│ 4. Rights APIs                      │
│    • Access: GET /privacy/export    │
│    • Deletion: DELETE /privacy/data │
│    • Portability: JSON export       │
│    • Rectification: PATCH endpoint  │
└─────────────────────────────────────┘
```

---

**Version**: 1.0
**Date**: 2026-01-30
**Status**: Ready for Review
