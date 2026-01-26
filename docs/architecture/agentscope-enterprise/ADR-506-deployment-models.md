# ADR-506: Deployment Models (SaaS vs Self-Hosted vs Hybrid)

## Status
Accepted

## Context

Enterprise customers have different deployment requirements based on:
- Data residency regulations
- Security posture
- Operational capabilities
- Budget

## Decision

Support **3 deployment models**:

### 1. SaaS (Multi-Tenant)

**Target**: Startups, mid-market companies
**Pricing**: $99/mo (Pro), $2.5K-$25K/year (Enterprise)

```
┌─────────────────────────────────────┐
│         AWS Cloud (US/EU)           │
│  ┌──────────────────────────────┐  │
│  │  Multi-Tenant SaaS Platform   │  │
│  │  - Org A (isolated via RLS)   │  │
│  │  - Org B (isolated via RLS)   │  │
│  │  - Org N...                   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Shared Infrastructure       │  │
│  │  - PostgreSQL (RLS)          │  │
│  │  - AgentDB (tenant-isolated) │  │
│  │  - Redis                     │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Benefits**:
- Fast onboarding (<10 minutes)
- Automatic updates
- 99.9% uptime SLA
- Lower cost (shared infra)

### 2. Self-Hosted (Single-Tenant)

**Target**: Large enterprises, regulated industries
**Pricing**: $10K-$50K/year license + $5K-$15K/year support

```
┌─────────────────────────────────────┐
│    Customer Kubernetes Cluster      │
│  ┌──────────────────────────────┐  │
│  │  AgentScope-Enterprise        │  │
│  │  - API (Deployment)           │  │
│  │  - Workers (Deployment)       │  │
│  │  - Dashboard (Deployment)     │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Customer-Managed Data        │  │
│  │  - PostgreSQL (StatefulSet)  │  │
│  │  - Redis (StatefulSet)       │  │
│  │  - S3-compatible storage     │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Installation**:
```bash
# Helm chart deployment
helm repo add agentscope https://charts.agentscope.io
helm install agentscope-enterprise agentscope/enterprise \
  --set license.key=<LICENSE_KEY> \
  --set database.host=<PG_HOST> \
  --set redis.host=<REDIS_HOST>
```

**Benefits**:
- Full data control (on-premise)
- Compliance with data residency
- Custom integrations
- Air-gapped deployment support

### 3. Hybrid (SaaS Control Plane + Self-Hosted Scanners)

**Target**: Companies with sensitive code but want cloud benefits
**Pricing**: Custom

```
┌─────────────────────────────────────┐
│        Cloud (Control Plane)        │
│  - Dashboard (Next.js)              │
│  - API (REST/GraphQL)               │
│  - Policy Management                │
│  - Reporting                        │
└────────────┬────────────────────────┘
             │ Encrypted channel
┌────────────▼────────────────────────┐
│    Customer Network (Scanners)      │
│  - AgentScope Core Scanner          │
│  - DevContainer Scanner             │
│  - CI/CD Scanner                    │
│  - Encrypted upload to cloud        │
└─────────────────────────────────────┘
```

**Benefits**:
- Code stays on-premise
- Cloud dashboard (automatic updates)
- Lower operational burden
- Compliance-friendly

## Comparison Matrix

| Feature | SaaS | Self-Hosted | Hybrid |
|---------|------|-------------|--------|
| Time to deploy | <10 min | 2-4 hours | 1-2 hours |
| Data residency | US/EU regions | Full control | Code on-prem |
| Updates | Automatic | Manual | Dashboard auto |
| Cost | $99/mo-$25K/yr | $10K-$50K/yr | Custom |
| Uptime SLA | 99.9% | Customer | 99.5% |
| Air-gapped | No | Yes | No |

## Consequences

### Positive
- Flexibility (customers choose deployment)
- Broader market coverage
- Higher revenue (self-hosted premium)

### Negative
- Support complexity (3 deployment modes)
- Testing overhead
- Documentation burden

## References
- Kubernetes Helm Charts
- PostgreSQL Row-Level Security
- AWS/Azure/GCP deployment guides

---

**Decision Date**: 2026-01-26
