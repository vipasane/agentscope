# ADR-003: Security and Privacy Architecture

## Status
Proposed

## Context

The feedback system must be secure against attacks and compliant with GDPR 2026 regulations.

## Decision

Implement **defense-in-depth** security with GDPR-first design.

### Security Layers

#### 1. Input Validation (@claude-flow/security)

```typescript
import { InputValidator, PathValidator, SafeExecutor } from '@claude-flow/security';

class FeedbackSecurityService {
  validateInput(content: string): SanitizedContent {
    // Prevent XSS, SQL injection, script injection
    const sanitized = InputValidator.sanitize(content, {
      allowedTags: [], // Strip all HTML
      maxLength: 10000
    });

    // Detect and remove PII
    if (this.piiDetector.hasPII(sanitized)) {
      return this.piiDetector.removePII(sanitized);
    }

    return sanitized;
  }

  validatePath(filePath: string): void {
    // Prevent path traversal
    PathValidator.validate(filePath);
  }

  safeExecute(command: string): void {
    // Prevent command injection
    SafeExecutor.execute(command, {
      allowedCommands: ['git', 'npm'],
      timeout: 5000
    });
  }
}
```

#### 2. Authentication & Authorization

```typescript
// Claims-based (ADR-010 pattern)
interface FeedbackClaims {
  canSubmit: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canDeleteData: boolean;
}

class AuthorizationService {
  async checkClaim(userId: string, claim: keyof FeedbackClaims): Promise<boolean> {
    const claims = await this.claimsRepo.get(userId);
    return claims[claim] === true;
  }
}

// GitHub OAuth + API tokens
class AuthenticationService {
  async authenticateGitHub(code: string): Promise<User> {
    const token = await this.exchangeCode(code);
    const user = await this.github.getUser(token);
    return this.createSession(user);
  }
}
```

#### 3. Rate Limiting

```typescript
class RateLimiter {
  private limits = {
    perUser: { requests: 100, window: 60_000 }, // 100/min
    global: { requests: 1000, window: 60_000 }   // 1000/min
  };

  async checkLimit(userId: string): Promise<boolean> {
    const userCount = await this.redis.incr(`rate:${userId}`);
    const globalCount = await this.redis.incr('rate:global');

    return userCount <= this.limits.perUser.requests &&
           globalCount <= this.limits.global.requests;
  }
}
```

#### 4. Data Encryption

```typescript
class EncryptionService {
  // At-rest: AES-256-GCM
  encrypt(data: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { encrypted, iv, tag };
  }

  // In-transit: TLS 1.3 (configured in nginx/load balancer)
}
```

### GDPR Compliance (2026 Requirements)

#### 1. Consent Management

```typescript
class ConsentManager {
  async requestConsent(userId: string): Promise<ConsentRequest> {
    // Explicit opt-in with clear purpose
    return {
      purposes: [
        { id: 'feedback-collection', description: 'Collect product feedback' },
        { id: 'analytics', description: 'Analyze usage patterns' },
        { id: 'communication', description: 'Send product updates' }
      ],
      // Global Privacy Control (GPC) signal recognition
      gpcSignal: this.detectGPC(request),
      // One-click reject with equal prominence
      rejectButton: { prominence: 'equal', position: 'left' }
    };
  }

  async giveConsent(userId: string, purposes: string[]): Promise<void> {
    const consent = new ConsentRecord(userId, purposes, {
      givenAt: new Date(),
      expiresAt: addYears(new Date(), 2), // 24-month retention
      method: 'explicit-opt-in'
    });

    await this.consentRepo.save(consent);
    await this.eventBus.publish(new ConsentGiven(consent));
  }
}
```

#### 2. Data Subject Rights

```typescript
class DataRightsService {
  // Right to Access (Art. 15)
  async exportUserData(userId: string): Promise<UserDataExport> {
    const feedback = await this.feedbackRepo.findByUser(userId);
    const consents = await this.consentRepo.findByUser(userId);

    return {
      format: 'JSON', // Machine-readable format
      data: { feedback, consents },
      exportedAt: new Date(),
      retentionPeriod: '24 months'
    };
  }

  // Right to Erasure (Art. 17)
  async deleteUserData(userId: string): Promise<void> {
    // Soft delete with 30-day grace period
    await this.feedbackRepo.markForDeletion(userId, 30);
    await this.consentRepo.revokeAll(userId);

    // Schedule permanent deletion after grace period
    await this.scheduler.schedule(
      new PermanentDeletionJob(userId),
      { delay: 30 * 24 * 60 * 60 * 1000 }
    );
  }

  // Right to Rectification (Art. 16)
  async rectifyUserData(userId: string, corrections: Corrections): Promise<void> {
    await this.feedbackRepo.update(userId, corrections);
    await this.eventBus.publish(new DataRectified(userId));
  }

  // Right to Data Portability (Art. 20)
  async portUserData(userId: string, destination: string): Promise<void> {
    const data = await this.exportUserData(userId);
    await this.transferService.send(data, destination);
  }
}
```

#### 3. Privacy by Design

```typescript
class PrivacyByDesign {
  // Data minimization
  collectMinimalData(submission: FeedbackSubmission): Feedback {
    return {
      content: submission.content,
      category: submission.category,
      // NO: email, name, phone, address
      // YES: anonymized user ID
      userId: hash(submission.rawUserId),
      // NO: full IP address
      // YES: country code only
      location: this.ipToCountry(submission.ip)
    };
  }

  // Default to most restrictive settings
  getDefaultConsents(): ConsentRecord {
    return new ConsentRecord({
      feedbackCollection: false,
      analytics: false,
      communication: false,
      thirdPartySharing: false // Never share with third parties
    });
  }

  // Purpose limitation
  validatePurpose(data: Data, purpose: Purpose): boolean {
    return data.allowedPurposes.includes(purpose);
  }
}
```

#### 4. Audit Trail

```typescript
class AuditLogger {
  async logDataAccess(event: DataAccessEvent): Promise<void> {
    await this.auditRepo.save({
      timestamp: new Date(),
      userId: event.userId,
      action: event.action, // 'read', 'write', 'delete', 'export'
      resource: event.resource,
      purpose: event.purpose,
      ipAddress: this.anonymizeIP(event.ipAddress),
      userAgent: event.userAgent
    });
  }

  // Tamper-proof logging with cryptographic signatures
  async sign(entry: AuditEntry): Promise<SignedEntry> {
    const signature = crypto.sign('sha256', JSON.stringify(entry), this.privateKey);
    return { ...entry, signature };
  }
}
```

### Security Monitoring

```typescript
class SecurityMonitor {
  // Real-time threat detection
  async detectAnomalies(events: SecurityEvent[]): Promise<Threat[]> {
    const threats = [];

    // SQL injection attempts
    if (this.detectSQLInjection(events)) {
      threats.push({ type: 'sql-injection', severity: 'critical' });
    }

    // XSS attempts
    if (this.detectXSS(events)) {
      threats.push({ type: 'xss', severity: 'high' });
    }

    // Brute force
    if (this.detectBruteForce(events)) {
      threats.push({ type: 'brute-force', severity: 'high' });
    }

    // DDoS
    if (this.detectDDoS(events)) {
      threats.push({ type: 'ddos', severity: 'critical' });
    }

    return threats;
  }

  // Automated response
  async respondToThreat(threat: Threat): Promise<void> {
    switch (threat.severity) {
      case 'critical':
        await this.blockIP(threat.source);
        await this.alertSecurityTeam(threat);
        break;
      case 'high':
        await this.rateLimit(threat.source);
        await this.logThreat(threat);
        break;
    }
  }
}
```

## Consequences

### Positive
- Defense-in-depth prevents multiple attack vectors
- GDPR-compliant by design reduces legal risk
- Automated compliance reduces manual effort
- Real-time threat detection prevents breaches

### Negative
- Security layers add latency (~50-100ms)
- Compliance features increase complexity
- Regular security audits required

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data breach | Encryption, access controls, audit logging |
| GDPR violation | Automated compliance checks, legal review |
| DDoS attack | Rate limiting, CDN, auto-scaling |
| Injection attacks | Input validation, parameterized queries |
| PII exposure | Automated PII detection and anonymization |

## References

- [GDPR Compliance 2026](https://secureprivacy.ai/blog/gdpr-compliance-2026)
- [Data Privacy Trends 2026](https://secureprivacy.ai/blog/data-privacy-trends-2026)
- [OWASP Top 10 2026](https://owasp.org/www-project-top-ten/)

---

**Version**: 1.0 | **Date**: 2026-01-30
