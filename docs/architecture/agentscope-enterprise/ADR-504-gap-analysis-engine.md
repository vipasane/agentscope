# ADR-504: Gap Analysis Engine (Desired vs Actual State)

## Status
Accepted

## Context

Enterprise platform teams need to measure **drift from standards** across hundreds of repositories. Key challenges:

1. **Defining "Golden Path"**: What is the ideal development environment configuration?
2. **Detecting Drift**: How far has each project deviated from the standard?
3. **Prioritizing Fixes**: Which gaps are most critical to remediate?
4. **Automation**: Can we automatically apply templates to non-compliant projects?

### User Story

> "As a Platform Engineering Lead, I want to define a standard development environment template (agent config + DevContainer + CI/CD), then see which of my 500 projects don't match it, prioritized by risk and effort to fix."

### Current Gap

- No standardization across projects
- Manual comparison (weeks of work)
- No automated remediation
- Teams reinvent the wheel (duplicate effort)

## Decision

We will implement a **Gap Analysis Engine** with:

### 1. Golden Path Templates

```yaml
# golden-path-template.yaml
apiVersion: agentscope-enterprise/v1
kind: GoldenPathTemplate
metadata:
  name: full-stack-development
  version: "2.0"
  description: Standard full-stack development environment
  tags: [nodejs, typescript, react]

spec:
  # Agent configuration baseline
  agent:
    claudeMd:
      maxInstructionLength: 5000
      requiredSections: [instructions, rules, examples]
      forbiddenPatterns:
        - "eval("
        - "exec("
        - "--no-verify"
        - "sudo"

    settings:
      permissions:
        defaultMode: ask
        allow:
          - "Read:**"
          - "Write:src/**"
          - "Edit:src/**,tests/**"
        deny:
          - "Bash:rm -rf /"
          - "Bash:sudo *"

      mcpServers:
        mode: allowlist
        allowed:
          - "@modelcontextprotocol/server-filesystem"
          - "@modelcontextprotocol/server-git"
          - "@modelcontextprotocol/server-github"
        requireAuth: true
        maxServers: 5

  # DevContainer baseline
  devcontainer:
    baseImage:
      registry: "mcr.microsoft.com"
      repository: "devcontainers/typescript-node"
      tag: "20"
      allowCustom: false

    security:
      privileged: false
      runAsRoot: false
      remoteUser: vscode
      capabilities:
        drop: [ALL]
        add: [NET_BIND_SERVICE]

    mounts:
      allowedTypes: [bind]
      forbiddenSources:
        - "/"
        - "/root"
        - "/etc"
        - "/var"

    features:
      required:
        - ghcr.io/devcontainers/features/docker-in-docker:2
      optional:
        - ghcr.io/devcontainers/features/aws-cli:1

  # CI/CD baseline
  cicd:
    githubActions:
      required:
        - name: codeql
          uses: github/codeql-action/analyze@v2
        - name: dependabot
          schedule: weekly
        - name: test
          on: [push, pull_request]

      secrets:
        storage: github-secrets
        allowHardcoded: false
        requireVault: false

      permissions:
        default: read
        explicit:
          contents: read
          pull-requests: write

  # Compliance requirements
  compliance:
    soc2:
      - control: CC6.1
        evidence: Agent permissions, MCP allowlist
      - control: CC7.1
        evidence: CodeQL, Dependabot

    iso27001:
      - control: A.9.4.1
        evidence: DevContainer security, no privileged mode

  # Enforcement
  enforcement:
    strictness: warn # block | warn | audit
    autoApply: false # Auto-create PR with template
    exceptions:
      allowTeamOverrides: true
      requireApproval: true
```

### 2. Gap Detection Algorithm

```typescript
// Deep comparison between template and actual project
class GapAnalysisEngine {
  async analyzeProject(
    project: Project,
    template: GoldenPathTemplate
  ): Promise<GapAnalysisReport> {
    // Fetch actual project configuration
    const actual = await this.fetchProjectConfig(project);

    // Compare each section
    const agentGaps = this.compareAgentConfig(
      template.spec.agent,
      actual.agentConfig
    );

    const devcontainerGaps = this.compareDevContainer(
      template.spec.devcontainer,
      actual.devcontainer
    );

    const cicdGaps = this.compareCICD(
      template.spec.cicd,
      actual.cicd
    );

    // Calculate priority scores
    const gaps = [...agentGaps, ...devcontainerGaps, ...cicdGaps];
    const prioritized = this.prioritizeGaps(gaps);

    return {
      projectId: project.id,
      templateId: template.metadata.name,
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critical').length,
      complianceScore: this.calculateComplianceScore(gaps, template),
      gaps: prioritized,
      estimatedRemediationTime: this.estimateRemediationTime(gaps),
      autoRemediationAvailable: gaps.filter(g => g.autoFixAvailable).length
    };
  }

  private compareAgentConfig(
    template: AgentConfigTemplate,
    actual: AgentConfig
  ): Gap[] {
    const gaps: Gap[] = [];

    // Check for hardcoded secrets
    if (template.claudeMd.forbiddenPatterns) {
      for (const pattern of template.claudeMd.forbiddenPatterns) {
        if (actual.claudeMd?.content.includes(pattern)) {
          gaps.push({
            type: 'forbidden-pattern',
            severity: 'critical',
            component: 'agent.claudeMd',
            field: 'content',
            expected: `No "${pattern}"`,
            actual: `Contains "${pattern}"`,
            remediation: `Remove or replace ${pattern} in CLAUDE.md`,
            autoFixAvailable: true,
            riskScore: 95,
            effortHours: 0.5
          });
        }
      }
    }

    // Check MCP server allowlist
    if (template.settings.mcpServers.mode === 'allowlist') {
      const allowed = new Set(template.settings.mcpServers.allowed);
      const actualServers = Object.keys(actual.settings?.mcpServers || {});

      for (const server of actualServers) {
        if (!allowed.has(server)) {
          gaps.push({
            type: 'unapproved-mcp-server',
            severity: 'high',
            component: 'agent.settings.mcpServers',
            field: server,
            expected: `One of: ${template.settings.mcpServers.allowed.join(', ')}`,
            actual: server,
            remediation: `Remove ${server} or get approval to add to allowlist`,
            autoFixAvailable: false,
            riskScore: 75,
            effortHours: 1
          });
        }
      }
    }

    // Check permissions
    if (template.settings.permissions.deny) {
      for (const deniedPattern of template.settings.permissions.deny) {
        const actualAllowed = actual.settings?.permissions?.allow || [];
        if (actualAllowed.some(p => this.matchesPattern(p, deniedPattern))) {
          gaps.push({
            type: 'forbidden-permission',
            severity: 'critical',
            component: 'agent.settings.permissions',
            field: 'allow',
            expected: `No permission matching "${deniedPattern}"`,
            actual: `Has permission matching "${deniedPattern}"`,
            remediation: `Remove dangerous permission from settings.json`,
            autoFixAvailable: true,
            riskScore: 90,
            effortHours: 0.25
          });
        }
      }
    }

    return gaps;
  }

  private compareDevContainer(
    template: DevContainerTemplate,
    actual: DevContainerConfig
  ): Gap[] {
    const gaps: Gap[] = [];

    // Check base image
    if (template.baseImage && !template.baseImage.allowCustom) {
      const expectedImage = `${template.baseImage.registry}/${template.baseImage.repository}:${template.baseImage.tag}`;
      const actualImage = actual.image;

      if (actualImage !== expectedImage) {
        gaps.push({
          type: 'wrong-base-image',
          severity: 'medium',
          component: 'devcontainer',
          field: 'image',
          expected: expectedImage,
          actual: actualImage,
          remediation: `Update .devcontainer.json to use approved base image`,
          autoFixAvailable: true,
          riskScore: 50,
          effortHours: 2
        });
      }
    }

    // Check privileged mode
    if (template.security.privileged === false && actual.privileged === true) {
      gaps.push({
        type: 'privileged-container',
        severity: 'critical',
        component: 'devcontainer',
        field: 'privileged',
        expected: 'false',
        actual: 'true',
        remediation: `Remove "privileged": true from .devcontainer.json`,
        autoFixAvailable: true,
        riskScore: 98,
        effortHours: 0.1
      });
    }

    // Check for forbidden mounts
    if (template.mounts.forbiddenSources && actual.mounts) {
      for (const mount of actual.mounts) {
        if (template.mounts.forbiddenSources.includes(mount.source)) {
          gaps.push({
            type: 'forbidden-mount',
            severity: 'high',
            component: 'devcontainer.mounts',
            field: mount.source,
            expected: `Not ${mount.source}`,
            actual: mount.source,
            remediation: `Remove mount of ${mount.source} from .devcontainer.json`,
            autoFixAvailable: true,
            riskScore: 85,
            effortHours: 0.5
          });
        }
      }
    }

    return gaps;
  }

  private prioritizeGaps(gaps: Gap[]): Gap[] {
    // Priority = (Risk Score / Effort Hours)
    // Higher score = should fix first
    return gaps
      .map(gap => ({
        ...gap,
        priority: gap.riskScore / gap.effortHours
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  private calculateComplianceScore(
    gaps: Gap[],
    template: GoldenPathTemplate
  ): number {
    // Score = 100 - (sum of gap risk scores / total possible risk)
    const totalRisk = gaps.reduce((sum, g) => sum + g.riskScore, 0);
    const maxRisk = 100 * gaps.length;
    return Math.max(0, 100 - (totalRisk / maxRisk) * 100);
  }

  private estimateRemediationTime(gaps: Gap[]): number {
    return gaps.reduce((total, gap) => total + gap.effortHours, 0);
  }
}
```

### 3. Automated Template Application

```typescript
// Auto-generate PR to apply template
class TemplateApplicator {
  async applyTemplate(
    project: Project,
    template: GoldenPathTemplate,
    gaps: Gap[]
  ): Promise<PullRequest> {
    // Create branch
    const branch = `agentscope-enterprise/apply-template-${template.metadata.name}`;
    await this.createBranch(project, branch);

    // Generate fixes for auto-remediable gaps
    const fixes: FileFix[] = [];

    for (const gap of gaps.filter(g => g.autoFixAvailable)) {
      const fix = await this.generateFix(gap, template);
      if (fix) fixes.push(fix);
    }

    // Commit fixes
    for (const fix of fixes) {
      await this.commitFile(project, branch, fix.path, fix.content, fix.message);
    }

    // Create PR
    const prBody = this.generatePRDescription(template, gaps, fixes);
    const pr = await this.createPullRequest(project, {
      title: `Apply ${template.metadata.name} template`,
      head: branch,
      base: project.defaultBranch,
      body: prBody
    });

    return pr;
  }

  private async generateFix(
    gap: Gap,
    template: GoldenPathTemplate
  ): Promise<FileFix | null> {
    switch (gap.type) {
      case 'privileged-container':
        return {
          path: '.devcontainer/devcontainer.json',
          content: this.removePrivileged(gap),
          message: 'fix: remove privileged mode from DevContainer'
        };

      case 'forbidden-pattern':
        return {
          path: 'CLAUDE.md',
          content: this.removeForbiddenPattern(gap),
          message: 'fix: remove forbidden pattern from CLAUDE.md'
        };

      case 'wrong-base-image':
        return {
          path: '.devcontainer/devcontainer.json',
          content: this.updateBaseImage(gap, template),
          message: 'fix: update to approved base image'
        };

      default:
        return null; // Not auto-fixable
    }
  }

  private generatePRDescription(
    template: GoldenPathTemplate,
    gaps: Gap[],
    fixes: FileFix[]
  ): string {
    return `
## Apply Golden Path Template: ${template.metadata.name}

This PR applies the organization's standard development environment template.

### Summary
- **Total Gaps Found**: ${gaps.length}
- **Auto-Fixed**: ${fixes.length}
- **Requires Manual Fix**: ${gaps.length - fixes.length}

### Changes Made
${fixes.map(f => `- ${f.message}`).join('\n')}

### Remaining Manual Fixes
${gaps.filter(g => !g.autoFixAvailable).map(g => `
- **${g.type}** (${g.severity})
  - Component: ${g.component}
  - Expected: ${g.expected}
  - Actual: ${g.actual}
  - Remediation: ${g.remediation}
`).join('\n')}

### Compliance Impact
After merging, this project will be ${Math.round((fixes.length / gaps.length) * 100)}% compliant with the template.

---
Generated by AgentScope-Enterprise
    `.trim();
  }
}
```

### 4. Dashboard Integration

```typescript
// Gap analysis view in dashboard
function GapAnalysisDashboard({ projectId }: { projectId: string }) {
  const { data: report } = useQuery({
    queryKey: ['gap-analysis', projectId],
    queryFn: () => fetchGapAnalysis(projectId)
  });

  if (!report) return <Loading />;

  return (
    <div className="gap-analysis">
      <div className="metrics">
        <MetricCard
          title="Compliance Score"
          value={`${report.complianceScore}/100`}
          trend={report.trend}
        />
        <MetricCard
          title="Total Gaps"
          value={report.totalGaps}
          subtitle={`${report.criticalGaps} critical`}
        />
        <MetricCard
          title="Est. Remediation Time"
          value={`${report.estimatedRemediationTime}h`}
        />
      </div>

      <div className="gap-list">
        <h3>Prioritized Gaps</h3>
        {report.gaps.map(gap => (
          <GapCard key={gap.id} gap={gap} />
        ))}
      </div>

      <div className="actions">
        <Button onClick={() => applyTemplate(projectId)}>
          Auto-Apply Template ({report.autoRemediationAvailable} fixes)
        </Button>
        <Button variant="secondary" onClick={() => exportReport(projectId)}>
          Export Report
        </Button>
      </div>
    </div>
  );
}
```

## Consequences

### Positive

1. **Standardization**
   - Golden Path templates enforce consistency
   - Reduce team-to-team variation
   - Best practices codified

2. **Visibility**
   - Clear gap reports (expected vs actual)
   - Prioritization (risk / effort)
   - Trend analysis (improving/degrading)

3. **Automation**
   - Auto-generate remediation PRs
   - Reduce manual work (weeks → hours)
   - Continuous compliance (not point-in-time)

4. **Compliance**
   - Map templates to SOC 2, ISO 27001 controls
   - Automated evidence collection
   - Audit-ready reporting

### Negative

1. **Template Maintenance**
   - Templates must stay current
   - Breaking changes in scanners require template updates
   - Versioning complexity

2. **False Positives**
   - Some gaps may be intentional (legitimate exceptions)
   - Need exception approval workflow
   - Balance strictness vs flexibility

3. **Auto-Fix Risks**
   - Automated PRs may break projects
   - Need testing before merge
   - Rollback mechanism required

## Related Decisions

- ADR-501: Enterprise Architecture
- ADR-503: Policy Orchestration (policies vs templates)
- ADR-505: Compliance Reporting (uses gap analysis for evidence)

## References

- [PRD: AgentScope-Enterprise](/workspaces/agentscope/docs/PRD-AgentScope-Enterprise.md)
- [Golden Path Pattern](https://engineering.atspotify.com/2020/08/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem/)

---

**Decision Date**: 2026-01-26
**Next Review**: After design partner feedback (2027 Q2)
