# ADR-405: GitHub App Architecture (v2.0)

## Status
Proposed (Future - v2.0)

## Context

While GitHub Actions provide an excellent entry point for AgentScope-GitHub (v1.0), a **GitHub App** offers significant advantages for larger organizations and commercial deployment:

### GitHub Actions Limitations

**Current Challenges (v1.0)**:
1. **Setup Friction**: Users must manually add workflow files to each repository
2. **No Centralized Config**: Each repo manages its own `.agentscope.json`
3. **Lower Rate Limits**: 5,000 requests/hour (may be insufficient for large orgs)
4. **No Webhooks**: Actions only trigger on push/PR (no real-time scanning)
5. **Limited Visibility**: No org-wide dashboard showing scan status

### GitHub App Benefits

**Advantages**:
1. **One-Click Install**: Install app → Select repos → Start scanning (no workflow files)
2. **Webhook-Driven**: Real-time scanning on every push (not just Actions triggers)
3. **Higher Rate Limits**: 15,000 requests/hour (3x increase)
4. **Centralized Management**: Organization-level settings and dashboards
5. **Marketplace Revenue**: Listed in GitHub Marketplace with paid tiers
6. **Better UX**: Native app experience vs. manual workflow setup

### Target Use Cases

**When to use GitHub App** (vs. Actions):
- Organizations with 10+ repositories
- Teams wanting zero-configuration setup
- Enterprises requiring centralized security policies
- Users seeking higher API rate limits
- Organizations willing to pay for premium features

## Decision

We will implement a **webhook-driven GitHub App** with the following architecture:

### 1. GitHub App Server

**Component**: `agentscope-github-app-server`

**Tech Stack**:
- **Runtime**: Node.js 20+ (TypeScript)
- **Framework**: Express.js (webhook handling)
- **Queue**: Redis + BullMQ (job queue)
- **Database**: PostgreSQL (scan history, config)
- **Cache**: Redis (rate limit tracking, scan results)
- **Deployment**: Kubernetes (auto-scaling)

**Responsibilities**:
- Receive webhook events from GitHub
- Queue scan jobs with priority
- Manage app installations
- Store scan history and trends
- Serve organization dashboards

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              GitHub Platform                        │
│  ┌──────────────────────────────────────────────┐  │
│  │ Webhook Events:                              │  │
│  │ - push, pull_request, installation           │  │
│  │ - code_scanning_alert, check_suite           │  │
│  └───────────────────┬──────────────────────────┘  │
└────────────────────────┼───────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│          AgentScope GitHub App Server               │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Webhook Handler (Express.js)                 │ │
│  │  - Validate signatures (HMAC-SHA256)          │ │
│  │  - Route events to handlers                   │ │
│  │  - Queue scan jobs                            │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                                │
│  ┌─────────────────▼─────────────────────────────┐ │
│  │  Job Queue (Redis + BullMQ)                   │ │
│  │  - Scan jobs (priority: critical PRs first)  │ │
│  │  - Retry failed jobs (exponential backoff)   │ │
│  │  - Rate limiting (respect GitHub API limits) │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                                │
│  ┌─────────────────▼─────────────────────────────┐ │
│  │  Scan Worker Pool (Kubernetes Pods)          │ │
│  │  ┌──────────────────────────────────────────┐│ │
│  │  │ 1. Pull job from queue                   ││ │
│  │  │ 2. Clone repo (GitHub App token)         ││ │
│  │  │ 3. Run AgentScope scan                   ││ │
│  │  │ 4. Generate SARIF                        ││ │
│  │  │ 5. Post results via GitHub API           ││ │
│  │  └──────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                          │ │
│  │  - Installation metadata                      │ │
│  │  - Scan history                               │ │
│  │  - Organization config                        │ │
│  │  - Usage metrics (for billing)               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Dashboard API (REST)                         │ │
│  │  - List repositories + scan status            │ │
│  │  - View findings trends                       │ │
│  │  - Manage org-wide settings                   │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2. Webhook Event Handling

**Supported Events**:
```typescript
interface WebhookEvents {
  'push': PushEvent;                   // Trigger scan on push
  'pull_request': PullRequestEvent;    // Trigger scan on PR
  'installation': InstallationEvent;   // App installed/uninstalled
  'installation_repositories': InstallationReposEvent; // Repos added/removed
  'check_suite': CheckSuiteEvent;      // Re-run checks
  'check_run': CheckRunEvent;          // Re-run specific check
}
```

**Event Handler**:
```typescript
import express from 'express';
import { createNodeMiddleware, createProbot } from 'probot';

const probot = createProbot();

probot.on('push', async (context) => {
  const { repository, ref, after } = context.payload;

  // Queue scan job
  await scanQueue.add('scan', {
    repository: repository.full_name,
    ref,
    sha: after,
    priority: 'normal'
  });
});

probot.on('pull_request.opened', async (context) => {
  const { pull_request, repository } = context.payload;

  // Queue high-priority PR scan
  await scanQueue.add('scan', {
    repository: repository.full_name,
    ref: pull_request.head.ref,
    sha: pull_request.head.sha,
    prNumber: pull_request.number,
    priority: 'high' // PRs scanned first
  });
});

probot.on('installation.created', async (context) => {
  const { installation, repositories } = context.payload;

  // Store installation metadata
  await db.installations.create({
    id: installation.id,
    accountId: installation.account.id,
    accountType: installation.account.type,
    tier: 'free', // Default tier
    repositories: repositories.map(r => r.id)
  });

  // Queue initial scans for all repositories
  for (const repo of repositories) {
    await scanQueue.add('scan', {
      repository: repo.full_name,
      priority: 'low' // Initial scans run in background
    });
  }
});

const app = express();
app.use(createNodeMiddleware(probot));
app.listen(3000);
```

### 3. Scan Worker Pool

**Worker Implementation**:
```typescript
import { Worker } from 'bullmq';
import { Octokit } from '@octokit/rest';

const worker = new Worker('scan', async (job) => {
  const { repository, sha, prNumber, priority } = job.data;

  // 1. Get installation token for this repository
  const installationId = await getInstallationId(repository);
  const octokit = await getOctokitForInstallation(installationId);

  // 2. Clone repository
  const repoPath = await cloneRepository(octokit, repository, sha);

  // 3. Load configuration (org-level or repo-level)
  const config = await loadConfig(repository);

  // 4. Run AgentScope scan
  const findings = await runAgentScopeScan(repoPath, config);

  // 5. Generate SARIF
  const sarif = await generateSARIF(findings);

  // 6. Upload SARIF to GitHub
  await uploadSARIF(octokit, repository, sha, sarif);

  // 7. Post PR comments if applicable
  if (prNumber) {
    await postPRComments(octokit, repository, prNumber, findings);
  }

  // 8. Create check run
  await createCheckRun(octokit, repository, sha, findings);

  // 9. Store scan results in database
  await db.scans.create({
    repository,
    sha,
    prNumber,
    findingsCount: findings.length,
    criticalCount: findings.filter(f => f.severity === 'critical').length,
    timestamp: new Date()
  });

  return { success: true, findings: findings.length };
}, {
  connection: redisConnection,
  concurrency: 10 // 10 concurrent scan workers
});
```

### 4. Installation Flow

**Step-by-Step**:

1. **User clicks "Install" in GitHub Marketplace**
   - Redirected to GitHub's app installation page

2. **User grants permissions**:
   ```
   Permissions requested by AgentScope:
   ✅ Read access to code
   ✅ Read and write access to checks
   ✅ Read and write access to pull requests
   ✅ Read and write access to security events
   ```

3. **User selects repositories**:
   - All repositories (recommended)
   - Only select repositories

4. **User redirected to configuration page** (`https://app.agentscope.dev/setup`):
   ```
   Welcome to AgentScope!

   Organization: acme-corp
   Repositories: 42 selected

   Configuration:
   [ ] Severity threshold: [High ▼]
   [ ] Fail on: [Critical ▼]
   [ ] Notification preferences: [Email + Slack ▼]

   [Save & Start Scanning]
   ```

5. **App queues initial scans**:
   - All selected repositories scanned in background
   - Summary report sent to organization admins

6. **Ongoing scanning**:
   - Webhook-driven scans on every push/PR
   - Weekly full audits (scheduled)

### 5. Organization Dashboard

**Dashboard Features**:
```
╔════════════════════════════════════════════════════════════╗
║          AgentScope - acme-corp Dashboard                  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📊 Overview                                               ║
║  ├─ Repositories: 42 (38 scanned, 4 pending)              ║
║  ├─ Total Findings: 127 (8 critical, 34 high)             ║
║  ├─ Avg Time to Fix: 2.3 days                             ║
║  └─ Coverage: 90% (38/42 repos)                           ║
║                                                            ║
║  🔥 High-Risk Repositories                                 ║
║  1. acme-corp/auth-service (5 critical, 12 high)          ║
║  2. acme-corp/payment-gateway (3 critical, 8 high)        ║
║  3. acme-corp/user-agent (1 critical, 15 high)            ║
║                                                            ║
║  📈 Trends (Last 30 Days)                                  ║
║  [Chart: Findings over time - downward trend]             ║
║                                                            ║
║  🔧 Most Common Issues                                     ║
║  1. Prompt Injection (23 instances)                       ║
║  2. Missing Input Validation (18 instances)               ║
║  3. Sensitive Data Exposure (12 instances)                ║
║                                                            ║
║  ⚙️ Settings                                               ║
║  [Manage Rules] [Notification Preferences] [Team Access]  ║
╚════════════════════════════════════════════════════════════╝
```

**API Endpoints**:
```typescript
// GET /api/org/:orgId/dashboard
interface DashboardData {
  overview: {
    totalRepos: number;
    scannedRepos: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    avgTimeToFix: number; // days
  };
  highRiskRepos: {
    name: string;
    criticalCount: number;
    highCount: number;
  }[];
  trends: {
    date: string;
    findings: number;
  }[];
  commonIssues: {
    ruleId: string;
    name: string;
    count: number;
  }[];
}
```

### 6. Pricing Tiers

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Free** | $0/mo | - 10 repositories<br>- 100 scans/month<br>- Basic rules<br>- Community support | Individuals, OSS projects |
| **Team** | $49/mo | - **Unlimited repositories**<br>- **Unlimited scans**<br>- Custom rules<br>- Organization dashboard<br>- Email support (24hr SLA) | Startups, small teams (5-20 devs) |
| **Enterprise** | $199/mo | - Everything in Team<br>- SSO/SAML integration<br>- Audit logs<br>- Compliance reports (SOC 2, ISO 27001)<br>- SLA (99.9% uptime)<br>- Dedicated support (4hr SLA) | Large organizations (50+ devs) |

**Billing Implementation**:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createSubscription(
  installation: Installation,
  tier: 'free' | 'team' | 'enterprise'
): Promise<void> {
  if (tier === 'free') {
    // No billing needed
    return;
  }

  const priceId = tier === 'team'
    ? 'price_team_49_monthly'
    : 'price_enterprise_199_monthly';

  await stripe.subscriptions.create({
    customer: installation.stripeCustomerId,
    items: [{ price: priceId }],
    metadata: {
      installationId: installation.id,
      tier
    }
  });

  await db.installations.update(installation.id, { tier });
}
```

## Consequences

### Positive

1. **Better UX**: One-click installation vs. manual workflow setup
2. **Real-Time Scanning**: Webhook-driven (not limited to Actions triggers)
3. **Centralized Management**: Org-wide settings and visibility
4. **Higher Rate Limits**: 15,000 req/hr (3x increase)
5. **Revenue Stream**: Marketplace listing with paid tiers ($50K+ MRR potential)
6. **Scalability**: Kubernetes-based workers auto-scale with load
7. **Enterprise Features**: SSO, audit logs, compliance reports

### Negative

1. **Infrastructure Costs**: Requires hosted server + database + queue
   - **Estimate**: $500-2,000/mo (AWS/GCP Kubernetes cluster)
   - **Mitigation**: Covered by Enterprise tier revenue
2. **Operational Complexity**: Deployment, monitoring, scaling
   - **Mitigation**: Use managed services (RDS, ElastiCache, EKS)
3. **Security Responsibility**: Must secure app credentials, user data
   - **Mitigation**: SOC 2 compliance, regular security audits
4. **Marketplace Approval**: GitHub reviews app before listing
   - **Timeline**: 2-4 weeks approval process

### Neutral

1. **Coexistence with Actions**: GitHub App and Actions can coexist (different use cases)
2. **Migration Path**: v1.0 (Actions) users can upgrade to v2.0 (App)
3. **Open Source**: Core scanning logic remains open source, app server proprietary

## Related Decisions

- ADR-401: Native GitHub Integration Architecture (v1.0)
- ADR-406: Rate Limiting Mitigation
- ADR-407: Monetization Strategy (future)

## References

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Probot Framework](https://probot.github.io/)
- [GitHub Marketplace](https://github.com/marketplace)
- [Stripe Billing](https://stripe.com/docs/billing)
- [BullMQ (Job Queue)](https://docs.bullmq.io/)
