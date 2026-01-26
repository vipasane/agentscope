# ADR-505: Automated Compliance Reporting (SOC 2, ISO 27001, PCI-DSS)

## Status
Accepted

## Context

Enterprise customers need **automated compliance evidence** for audits. Manual compliance reporting costs $200K-$500K/year for large organizations.

### Requirements
- SOC 2 Type II (Trust Services Criteria)
- ISO 27001 (Annex A controls)
- PCI-DSS (Requirements 6, 8, 10)
- HIPAA (for healthcare customers)
- Automated quarterly reports
- Audit trail (immutable logs)

## Decision

Implement **automated compliance reporting engine** that:

1. **Maps policies to compliance controls**
2. **Collects evidence automatically**
3. **Generates audit-ready reports**
4. **Maintains immutable audit trail**

### Architecture

```typescript
interface ComplianceReport {
  framework: 'SOC2' | 'ISO27001' | 'PCI-DSS' | 'HIPAA';
  period: { start: Date; end: Date };
  controls: ControlStatus[];
  overallStatus: 'compliant' | 'partial' | 'non-compliant';
  complianceScore: number; // 0-100
  evidence: EvidencePackage[];
  auditTrail: AuditLogEntry[];
}

interface ControlStatus {
  id: string; // e.g., 'CC6.1', 'A.9.4.1'
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'partial';
  coverage: number; // % of projects compliant
  evidenceIds: string[];
  exceptions: Exception[];
  lastAssessed: Date;
}

interface EvidencePackage {
  controlId: string;
  type: 'policy-config' | 'scan-result' | 'audit-log' | 'exception-approval';
  timestamp: Date;
  data: unknown;
  hash: string; // SHA-256 for tamper detection
}
```

### SOC 2 Mapping

```yaml
# Mapping AgentScope policies to SOC 2 controls
soc2:
  CC6.1: # Logical and Physical Access Controls
    policies:
      - no-hardcoded-secrets
      - mcp-server-allowlist
      - agent-permission-restrictions
    evidence:
      - Agent config scans showing no secrets
      - MCP server allowlist configurations
      - Permission audit logs

  CC7.1: # Detection of Security Events
    policies:
      - require-codeql
      - require-dependabot
      - audit-logging-enabled
    evidence:
      - GitHub Actions CodeQL workflows
      - Dependabot configuration
      - Scan history logs

  CC8.1: # Monitoring Activities
    policies:
      - scheduled-scans
      - real-time-policy-enforcement
    evidence:
      - Scan schedules
      - Policy violation alerts
      - Remediation tracking
```

### Report Generation

```typescript
class ComplianceReportGenerator {
  async generateSOC2Report(
    orgId: string,
    period: DateRange
  ): Promise<ComplianceReport> {
    // Fetch all policies and scan results for period
    const policies = await this.fetchOrgPolicies(orgId);
    const scanResults = await this.fetchScanResults(orgId, period);
    const auditLogs = await this.fetchAuditLogs(orgId, period);

    // Map to SOC 2 controls
    const controls = SOC2_CONTROLS.map(control =>
      this.assessControl(control, policies, scanResults)
    );

    // Collect evidence
    const evidence = this.collectEvidence(controls, scanResults, auditLogs);

    // Calculate compliance score
    const complianceScore = this.calculateScore(controls);

    return {
      framework: 'SOC2',
      period,
      controls,
      overallStatus: complianceScore >= 95 ? 'compliant' : 'partial',
      complianceScore,
      evidence,
      auditTrail: auditLogs
    };
  }

  private assessControl(
    control: SOC2Control,
    policies: UnifiedPolicy[],
    scanResults: ScanResult[]
  ): ControlStatus {
    // Find policies mapped to this control
    const relevantPolicies = policies.filter(p =>
      p.compliance.controls.includes(control.id)
    );

    // Calculate coverage (% of projects passing all policies)
    const totalProjects = new Set(scanResults.map(r => r.projectId)).size;
    const compliantProjects = scanResults.filter(r =>
      this.isProjectCompliant(r, relevantPolicies)
    ).length;

    const coverage = (compliantProjects / totalProjects) * 100;

    return {
      id: control.id,
      name: control.name,
      description: control.description,
      status: coverage === 100 ? 'pass' : coverage >= 90 ? 'partial' : 'fail',
      coverage,
      evidenceIds: this.getEvidenceIds(control, scanResults),
      exceptions: this.getExceptions(control),
      lastAssessed: new Date()
    };
  }

  async exportToPDF(report: ComplianceReport): Promise<Buffer> {
    // Generate PDF with:
    // - Executive summary
    // - Control-by-control assessment
    // - Evidence attachments
    // - Audit trail
    return pdfGenerator.generate(report);
  }
}
```

## Consequences

### Positive
- 80% reduction in audit prep time (6 weeks → 1 week)
- Automated quarterly reports
- Continuous compliance (not point-in-time)
- Audit-ready evidence

### Negative
- Compliance mapping maintenance overhead
- False positives require exception workflow
- PDF generation complexity

## References
- SOC 2 Trust Services Criteria
- ISO/IEC 27001:2022
- PCI-DSS v4.0

---

**Decision Date**: 2026-01-26
