# AgentScope-GitHub Monetization Architecture

**Product**: AgentScope-GitHub
**Version**: 2.0 (GitHub App with Paid Tiers)
**Date**: 2026-01-26
**Status**: Planned for v2.0 (Future)

---

## Executive Summary

AgentScope-GitHub v2.0 introduces a **freemium GitHub App** with tiered pricing to monetize advanced features while maintaining a generous free tier for individuals and open source projects.

### Revenue Targets

| Timeline | Metric | Target |
|----------|--------|--------|
| **Month 6** | Paying customers | 50 |
| **Month 12** | Paying customers | 250 |
| **Month 12** | Monthly Recurring Revenue (MRR) | $14,000 |
| **Year 1** | Annual Recurring Revenue (ARR) | $168,000 |
| **Year 2** | Annual Recurring Revenue (ARR) | $711,000 |

### Break-Even Analysis

- **Monthly Costs**: ~$3,500 (infrastructure + support)
- **Break-Even**: 50 Team customers OR 18 Enterprise customers
- **Target Timeline**: Month 9 (conservative), Month 6 (optimistic)

---

## Pricing Tiers

### Free Tier

**Price**: $0/month

**Target**: Individual developers, open source projects

**Features**:
- ✅ 10 repositories
- ✅ 100 scans/month
- ✅ Basic rule set (10 core rules)
- ✅ SARIF upload to Code Scanning
- ✅ PR comments (inline)
- ✅ Community support (GitHub Discussions)
- ❌ Custom rules
- ❌ Organization dashboard
- ❌ Historical trends
- ❌ Priority support

**Constraints**:
- Repository limit enforced via GitHub API
- Scan quota tracked in Redis (rolling 30-day window)
- Rate limit: 5,000 GitHub API requests/hour

**Free Tier Conversion Funnel**:
```
5,000 Free Users
    ↓ 10% activate (set up workflow)
500 Active Users
    ↓ 20% engaged (>5 scans/month)
100 Engaged Users
    ↓ 10% convert to paid
10 Paying Customers/month
```

**Monthly Acquisition Target**: 417 new free users (5,000/year)

---

### Team Tier

**Price**: $49/month (billed monthly or annually)

**Target**: Startups, small teams (5-20 developers)

**Features**:
- ✅ **Unlimited repositories**
- ✅ **Unlimited scans**
- ✅ Full rule set (25+ rules)
- ✅ Custom rule editor (beta)
- ✅ Organization dashboard
- ✅ Historical trends (90 days)
- ✅ Slack/Teams integrations
- ✅ Email support (24-hour SLA)
- ❌ SSO/SAML
- ❌ Audit logs
- ❌ Compliance reports
- ❌ Dedicated support

**Value Proposition**:
- **vs. Free**: Unlimited scale, custom rules, visibility
- **vs. Competitors**: $49/mo flat (not per-developer) → 10x cheaper for 10-dev team
  - GitHub Advanced Security: $49/dev/mo × 10 = $490/mo
  - Snyk Code: $25/dev/mo × 10 = $250/mo
  - **AgentScope**: $49/mo flat 🎉

**Conversion Triggers**:
- Hit 10-repository limit
- Exceed 100 scans/month
- Request custom rules
- Need org-wide visibility

**Upsell Path**: Free → Team (30-day trial available)

---

### Enterprise Tier

**Price**: $199/month (billed annually only)

**Target**: Large organizations (50+ developers)

**Features**:
- ✅ Everything in Team
- ✅ **SSO/SAML integration** (Okta, Azure AD)
- ✅ **Audit logs** (90-day retention)
- ✅ **Compliance reports** (SOC 2, ISO 27001, HIPAA)
- ✅ **Priority GitHub App rate limits** (15,000 req/hr)
- ✅ **Advanced analytics** (MTTR, coverage, trends)
- ✅ **Dedicated support** (4-hour SLA)
- ✅ **Uptime SLA** (99.9%)
- ✅ **Custom contract** (annual commitment)

**Value Proposition**:
- **vs. Team**: Enterprise compliance, SSO, dedicated support
- **vs. Building In-House**: $199/mo vs. $15K+/mo engineering cost

**Conversion Triggers**:
- Compliance requirement (SOC 2, ISO 27001)
- SSO mandate (IT policy)
- Need for SLA guarantees
- >50 repositories in org

**Upsell Path**: Team → Enterprise (sales-assisted)

---

## Revenue Model Breakdown

### Year 1 Projections

**Assumptions**:
- 5% free-to-paid conversion rate
- 80% Team tier, 20% Enterprise tier
- 5% monthly churn

**Monthly Growth**:
| Month | Free Users | Paying Customers | MRR | ARR |
|-------|-----------|------------------|-----|-----|
| 1 | 417 | 2 | $98 | $1,176 |
| 3 | 1,250 | 10 | $588 | $7,056 |
| 6 | 2,500 | 50 | $2,940 | $35,280 |
| 9 | 3,750 | 125 | $7,350 | $88,200 |
| 12 | 5,000 | 250 | $14,000 | $168,000 |

**Breakdown at Month 12**:
- **Team customers**: 200 × $49/mo = $9,800/mo
- **Enterprise customers**: 50 × $199/mo = $9,950/mo
- **Total MRR**: $19,750/mo (conservative)
- **Churn-adjusted MRR**: $14,000/mo (with 5% churn)

### Year 2 Projections

**Assumptions**:
- 3x customer growth (750 paying customers)
- Increased Enterprise mix (30% Enterprise, 70% Team)
- Churn reduced to 3% (improved product)

**Year 2 ARR**: $711,000

---

## Technical Implementation

### 1. Billing System

**Payment Processor**: Stripe

**Integration**:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Create customer
async function createCustomer(
  installation: Installation
): Promise<string> {
  const customer = await stripe.customers.create({
    email: installation.account.email,
    name: installation.account.login,
    metadata: {
      installationId: installation.id,
      githubAccountId: installation.account.id
    }
  });

  await db.installations.update(installation.id, {
    stripeCustomerId: customer.id
  });

  return customer.id;
}

// Create subscription
async function createSubscription(
  customerId: string,
  tier: 'team' | 'enterprise'
): Promise<void> {
  const priceId = tier === 'team'
    ? process.env.STRIPE_PRICE_TEAM
    : process.env.STRIPE_PRICE_ENTERPRISE;

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 30, // 30-day free trial
    metadata: {
      tier
    }
  });

  await db.installations.update(installation.id, {
    subscriptionId: subscription.id,
    tier,
    trialEndsAt: new Date(subscription.trial_end * 1000)
  });
}
```

**Webhook Handling**:
```typescript
app.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
  }

  res.json({ received: true });
});
```

### 2. Feature Gating

**Implementation**:
```typescript
export class FeatureGate {
  constructor(private installation: Installation) {}

  canAccessFeature(feature: Feature): boolean {
    const tierFeatures = this.getTierFeatures(this.installation.tier);
    return tierFeatures.includes(feature);
  }

  canScan(): boolean {
    if (this.installation.tier === 'free') {
      // Check repository limit
      if (this.installation.repositories.length > 10) {
        return false;
      }

      // Check scan quota (100/month)
      const scansThisMonth = this.getScansThisMonth();
      if (scansThisMonth >= 100) {
        return false;
      }
    }

    return true;
  }

  private getTierFeatures(tier: Tier): Feature[] {
    const features = {
      free: [
        Feature.BasicRules,
        Feature.SARIFUpload,
        Feature.PRComments,
        Feature.CommunitySupport
      ],
      team: [
        Feature.BasicRules,
        Feature.FullRules,
        Feature.CustomRules,
        Feature.Dashboard,
        Feature.Trends,
        Feature.Integrations,
        Feature.EmailSupport,
        Feature.SARIFUpload,
        Feature.PRComments
      ],
      enterprise: [
        Feature.BasicRules,
        Feature.FullRules,
        Feature.CustomRules,
        Feature.Dashboard,
        Feature.Trends,
        Feature.Integrations,
        Feature.SSO,
        Feature.AuditLogs,
        Feature.ComplianceReports,
        Feature.DedicatedSupport,
        Feature.SLA,
        Feature.SARIFUpload,
        Feature.PRComments
      ]
    };

    return features[tier];
  }
}

export enum Feature {
  BasicRules = 'basic_rules',
  FullRules = 'full_rules',
  CustomRules = 'custom_rules',
  Dashboard = 'dashboard',
  Trends = 'trends',
  Integrations = 'integrations',
  SSO = 'sso',
  AuditLogs = 'audit_logs',
  ComplianceReports = 'compliance_reports',
  EmailSupport = 'email_support',
  DedicatedSupport = 'dedicated_support',
  SLA = 'sla',
  SARIFUpload = 'sarif_upload',
  PRComments = 'pr_comments'
}
```

**Usage in Scan Worker**:
```typescript
const worker = new Worker('scan', async (job) => {
  const { repository } = job.data;
  const installation = await getInstallation(repository);

  const gate = new FeatureGate(installation);

  if (!gate.canScan()) {
    throw new Error(
      'Scan quota exceeded. Upgrade to Team tier for unlimited scans.'
    );
  }

  // Proceed with scan...
});
```

### 3. Usage Tracking

**Database Schema**:
```sql
CREATE TABLE scan_usage (
  id UUID PRIMARY KEY,
  installation_id UUID REFERENCES installations(id),
  repository_id BIGINT,
  scan_date DATE,
  scans_count INTEGER DEFAULT 0,
  findings_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(installation_id, repository_id, scan_date)
);

CREATE INDEX idx_scan_usage_installation_date
  ON scan_usage(installation_id, scan_date);
```

**Tracking Implementation**:
```typescript
async function trackScanUsage(
  installation: Installation,
  repository: string,
  findings: Finding[]
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await db.query(
    `INSERT INTO scan_usage (installation_id, repository_id, scan_date, scans_count, findings_count)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (installation_id, repository_id, scan_date)
     DO UPDATE SET
       scans_count = scan_usage.scans_count + 1,
       findings_count = scan_usage.findings_count + $4`,
    [installation.id, repository, today, findings.length]
  );
}
```

**Quota Enforcement**:
```typescript
async function getScansThisMonth(
  installation: Installation
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await db.query(
    `SELECT SUM(scans_count) as total
     FROM scan_usage
     WHERE installation_id = $1
       AND scan_date >= $2`,
    [installation.id, startOfMonth]
  );

  return result.rows[0].total || 0;
}
```

---

## Cost Structure

### Infrastructure Costs

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Kubernetes (EKS)** | 3 nodes (t3.medium) | $150 |
| **RDS PostgreSQL** | db.t3.medium | $80 |
| **ElastiCache Redis** | cache.t3.micro | $20 |
| **S3 Storage** | 100 GB (SARIF artifacts) | $2 |
| **CloudWatch Logs** | 50 GB/month | $25 |
| **Data Transfer** | 500 GB/month | $45 |
| **GitHub Actions** | N/A (user-paid) | $0 |
| **Total Infrastructure** | | **$322/mo** |

**Scaling Costs** (at 1,000 customers):
- Additional Kubernetes nodes: +$300/mo
- Larger RDS instance: +$200/mo
- **Total at 1K customers**: ~$822/mo

### Operational Costs

| Category | Monthly Cost |
|----------|--------------|
| **Support Staff** (0.5 FTE) | $2,500 |
| **Stripe Fees** (2.9% + $0.30) | ~$400 |
| **Domain/SSL** | $10 |
| **Monitoring (Datadog)** | $100 |
| **Total Operational** | **$3,010/mo** |

**Total Monthly Costs**: $3,332/mo

**Break-Even**:
- At $49/mo (Team): 68 customers
- At $199/mo (Enterprise): 17 customers
- **Mixed (80% Team, 20% Enterprise)**: ~50 customers

---

## Go-to-Market Strategy

### Customer Acquisition

**Channels**:
1. **GitHub Marketplace** (primary)
   - Featured listing in Security category
   - SEO-optimized listing (keywords: "AI agent security", "LLM scanning")
   - 5-star reviews from beta users

2. **Product Hunt**
   - Launch day (aim for #1 Product of the Day)
   - Prepared hunter, demo video, landing page

3. **Content Marketing**
   - Blog posts (2/week): security tips, case studies
   - Guest posts: HackerNoon, DEV.to, Medium

4. **Community**
   - Discord server (support + community)
   - GitHub Discussions (Q&A)
   - Reddit (r/MachineLearning, r/github)

5. **Partnerships**
   - LangChain, AutoGPT, CrewAI integrations
   - Cross-promotion with AI agent frameworks

### Conversion Funnel

```
10,000 Marketplace Visitors/month
    ↓ 30% read listing
3,000 Engaged Visitors
    ↓ 20% install Free tier
600 Free Installs
    ↓ 10% activate (run first scan)
60 Active Users
    ↓ 5% convert to Team
3 New Team Customers/month

Total: 36 Team customers/year
```

**Optimization Tactics**:
- **Email drip campaign**: Onboarding, usage tips, upgrade prompts
- **In-app messaging**: Show upgrade CTA when hitting limits
- **Free trial**: 30-day trial of Team tier (no credit card required)

### Enterprise Sales

**Process**:
1. **Lead qualification**: Security teams at 100+ person companies
2. **Discovery call**: Understand compliance needs, SSO requirements
3. **Proof of value**: 30-day Enterprise trial
4. **Custom contract**: Annual commitment, volume discounts

**Sales Channels**:
- **Inbound**: Contact form on website
- **Outbound**: LinkedIn outreach (target titles: CISO, Head of Security)
- **Partnerships**: Resellers, consulting firms

**Sales Targets**:
- Year 1: 50 Enterprise customers
- Year 2: 150 Enterprise customers (3x growth)

---

## Success Metrics

### Product Metrics

| Metric | Target |
|--------|--------|
| **Free-to-Paid Conversion** | 5% (Month 12) |
| **Trial-to-Paid Conversion** | 30% |
| **Monthly Churn** | <5% |
| **NPS (Net Promoter Score)** | >40 |
| **Time to First Scan** | <10 minutes (self-serve) |

### Business Metrics

| Metric | Month 6 | Month 12 | Year 2 |
|--------|---------|----------|--------|
| **MRR** | $3K | $14K | $59K |
| **ARR** | $35K | $168K | $711K |
| **CAC (Customer Acquisition Cost)** | <$100 | <$75 | <$50 |
| **LTV (Lifetime Value)** | $1,200 | $1,500 | $2,000 |
| **LTV:CAC** | 12:1 | 20:1 | 40:1 |

---

## Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **GitHub builds competing feature** | Low | Critical | - Partner with GitHub (complementary)<br>- Move fast (first-mover advantage)<br>- Build community moat |
| **Low conversion rate** | Medium | High | - Generous free tier (reduce friction)<br>- 30-day trials<br>- In-app upgrade prompts |
| **High churn** | Medium | High | - Excellent product + support<br>- Regular feature releases<br>- Customer success outreach |
| **Infrastructure costs exceed revenue** | Low | Medium | - Auto-scaling (pay for what you use)<br>- Monitor costs closely<br>- Optimize early |

---

## Conclusion

AgentScope-GitHub v2.0 monetization strategy balances:

1. **Free Tier**: Generous limits attract users, build community
2. **Team Tier**: Affordable flat pricing ($49/mo) targets SMBs
3. **Enterprise Tier**: Compliance + support justifies $199/mo

**Revenue Potential**: $168K ARR (Year 1) → $711K ARR (Year 2)

**Break-Even**: Month 9 (50 customers at mixed tiers)

**Key Success Factors**:
- Product excellence (low churn)
- GitHub Marketplace visibility
- Strong onboarding (free-to-paid conversion)
- Enterprise sales motion (higher ACV)
