# ADR-502: Unified Dashboard Design for 1,000+ Repositories

## Status
Accepted

## Context

Enterprise customers need a **single-pane-of-glass view** of development environment health across potentially 1,000+ repositories. Current challenges:

1. **Data Overload**: 1,000 repos × (5 agents + 3 DevContainers + 10 CI/CD workflows) = 18,000 components to visualize
2. **Performance**: Dashboard must load in <2 seconds with this scale
3. **Filtering**: Users need to drill down from org → team → project → component
4. **Real-time Updates**: Policy violations must appear immediately (not after refresh)
5. **Multi-Persona UX**: CISOs want compliance view, platform engineers want technical details

### User Personas and Needs

**Emma (Platform Lead)**:
- "Show me which teams are lagging in compliance"
- Needs: Team comparison, trend analysis, health scores

**Alex (CISO)**:
- "Prove we're SOC 2 compliant for auditors"
- Needs: Compliance dashboard, audit evidence, risk heat map

**Sam (DevOps Lead)**:
- "Which CI/CD workflows have security issues?"
- Needs: Technical drill-down, remediation queue, automation status

**Jordan (Compliance Officer)**:
- "Generate quarterly compliance report"
- Needs: Automated reporting, evidence collection, exception tracking

## Decision

We will implement a **hierarchical dashboard architecture** with the following design:

### 1. Information Architecture

```
┌────────────────────────────────────────┐
│         Executive Overview             │  ← CISO, Platform Lead
│  (Org-wide health, compliance status)  │
└─────────────┬──────────────────────────┘
              │
    ┌─────────┼─────────┬────────────┐
    │         │         │            │
┌───▼───┐ ┌──▼───┐ ┌───▼───┐ ┌─────▼─────┐
│ Teams │ │ Risk │ │ Policy│ │Compliance │  ← Team Leads, Security
└───┬───┘ └──┬───┘ └───┬───┘ └─────┬─────┘
    │        │         │            │
┌───▼────────▼─────────▼────────────▼────┐
│         Project Explorer               │  ← Engineers
│   (Filterable, searchable repo list)   │
└────────────┬───────────────────────────┘
             │
     ┌───────┼───────┬─────────┐
     │       │       │         │
 ┌───▼──┐ ┌─▼──┐ ┌──▼───┐ ┌───▼────┐
 │Agent │ │Dev │ │CI/CD │ │History │  ← Deep dive
 │Config│ │Cont│ │Flows │ │Trends  │
 └──────┘ └────┘ └──────┘ └────────┘
```

### 2. Dashboard Pages

#### 2.1 Executive Overview (Landing Page)

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  🏢 AgentScope Enterprise - Acme Corp                    │
│  ────────────────────────────────────────────────────    │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Health      │  │  Compliance  │  │  Active      │     │
│  │   Score      │  │   Status     │  │  Issues      │     │
│  │    87/100    │  │   ✅ Pass    │  │     12       │     │
│  │   ↑ +5       │  │   SOC2       │  │  🔴 3 crit   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Compliance Breakdown                              │ │
│  │  ████████████████░░░░  95% SOC 2 (CC6.1)          │ │
│  │  ████████████░░░░░░░░  80% ISO 27001 (A.9.4.1)    │ │
│  │  ██████████████████░░  92% PCI-DSS (Req 8)        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Team Health Comparison                            │ │
│  │  Backend Team    ████████████░░  85  ↑            │ │
│  │  Frontend Team   ██████████████░  90  ↑            │ │
│  │  Mobile Team     ████████░░░░░░  72  ↓            │ │
│  │  Platform Team   ████████████░░  98  →            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │  Risk Heat Map     │  │  Recent Activity         │   │
│  │  🟥🟨🟨🟩🟩        │  │  • Policy updated        │   │
│  │  🟥🟨🟩🟩🟩        │  │  • 3 repos scanned       │   │
│  │  🟨🟩🟩🟩🟩        │  │  • Auto-fix PR merged    │   │
│  └────────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Data Requirements**:
- Aggregate health score (computed from all projects)
- Compliance status (percentage per control)
- Team-level metrics (avg health score per team)
- Risk distribution (count by severity)

**Performance Optimization**:
- Cache aggregated metrics (Redis, TTL: 5 minutes)
- Pre-compute health scores (background job)
- Lazy-load charts (only when scrolled into view)

#### 2.2 Project Explorer

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  Projects (1,243 total)                                   │
│  ────────────────────────────────────────────────────    │
│  🔍 Search: [___________]  📁 Team: [All ▼]  🏷️ Tag: [All ▼] │
│  Health: [All ▼]  Risk: [All ▼]  Status: [All ▼]         │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Name              Team    Health  Risk   Last Scan │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 📦 api-gateway    Backend   92   🟢 Low  2h ago    │ │
│  │ 📦 user-service   Backend   87   🟡 Med  1h ago    │ │
│  │ 📦 web-app        Frontend  78   🔴 High 30m ago   │ │
│  │ 📦 mobile-ios     Mobile    65   🔴 High 5h ago    │ │
│  │ ... (1,239 more)                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Showing 1-50 of 1,243  [Prev] [Next]                    │
└──────────────────────────────────────────────────────────┘
```

**Features**:
- **Search**: Full-text search across project names, descriptions
- **Filters**: Multi-select filters (team, health, risk, tags)
- **Sorting**: Click column headers to sort
- **Pagination**: 50 projects per page (virtual scrolling for performance)
- **Bulk Actions**: Select multiple → "Scan Now", "Apply Policy"

**Performance Optimization**:
- Virtual scrolling (only render visible rows)
- Debounced search (300ms delay)
- Indexed queries (PostgreSQL indexes on team_id, health_score, risk_level)

#### 2.3 Project Detail View

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  📦 api-gateway                                    ⚙️ Edit  │
│  Backend Team • github.com/acme/api-gateway              │
│  ────────────────────────────────────────────────────    │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Health      │  │  Violations  │  │  Last Scan   │     │
│  │    92/100    │  │      3       │  │   2h ago     │     │
│  │   ↑ +8       │  │  🟡 2 med    │  │   ✅ Pass     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                           │
│  📋 [Overview] [Agent Configs] [DevContainers] [CI/CD]   │
│  ────────────────────────────────────────────────────    │
│                                                           │
│  ⚠️ Policy Violations (3)                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🟡 MEDIUM - Hardcoded secret in .github/workflows │ │
│  │    File: .github/workflows/deploy.yml:42          │ │
│  │    Remediation: Move to GitHub Secrets            │ │
│  │    [Auto-Fix] [Ignore] [Details]                  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🟡 MEDIUM - DevContainer runs as root             │ │
│  │    File: .devcontainer/devcontainer.json           │ │
│  │    Remediation: Add "remoteUser": "vscode"        │ │
│  │    [Auto-Fix] [Ignore] [Details]                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  📊 Trend Analysis (Last 30 days)                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Health Score  ──────────────────────────────────  │ │
│  │  100 │                                   ╱──       │ │
│  │   90 │                           ╱──────╱          │ │
│  │   80 │                   ╱──────╱                  │ │
│  │   70 │           ╱──────╱                          │ │
│  │   60 │   ╱──────╱                                  │ │
│  │      └────────────────────────────────────────     │ │
│  │      Jan 1        Jan 15        Jan 30            │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Tabs**:
1. **Overview**: Health score, violations, trend chart
2. **Agent Configs**: List of CLAUDE.md, settings.json with risk analysis
3. **DevContainers**: Container configs, security issues
4. **CI/CD**: GitHub Actions workflows, secrets usage

#### 2.4 Compliance Dashboard

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  Compliance Status - SOC 2 Type II                       │
│  ────────────────────────────────────────────────────    │
│                                                           │
│  Overall: ✅ 95% Compliant  (Last audit: 2026-01-15)     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Control             Status    Coverage   Issues   │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ CC6.1 - Access       ✅ Pass      100%       0     │ │
│  │ CC6.2 - Encryption   ✅ Pass      100%       0     │ │
│  │ CC7.1 - Detection    ⚠️ Partial    92%       8     │ │
│  │ CC8.1 - Monitoring   ✅ Pass      100%       0     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ⚠️ Outstanding Issues (8)                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │ • 3 projects missing audit logging                 │ │
│  │ • 5 projects with overly permissive agent configs  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  [📥 Download Report] [📧 Email to Auditor] [⚙️ Settings] │
└──────────────────────────────────────────────────────────┘
```

**Features**:
- Control-level status (pass/fail/partial)
- Drill-down to projects violating each control
- Automated report generation (PDF, DOCX)
- Evidence export (scan results, policy configs, audit logs)

### 3. Technical Implementation

#### 3.1 Frontend Architecture

```typescript
// Next.js App Router structure
app/
├── (dashboard)/
│   ├── layout.tsx              # Shared layout (sidebar, header)
│   ├── page.tsx                # Executive overview
│   ├── projects/
│   │   ├── page.tsx            # Project explorer
│   │   └── [id]/
│   │       └── page.tsx        # Project detail
│   ├── compliance/
│   │   └── page.tsx            # Compliance dashboard
│   ├── policies/
│   │   └── page.tsx            # Policy management
│   └── settings/
│       └── page.tsx            # Organization settings
├── api/
│   ├── projects/route.ts       # API routes (Next.js API routes)
│   ├── compliance/route.ts
│   └── policies/route.ts
└── components/
    ├── dashboard/
    │   ├── HealthScore.tsx     # Reusable components
    │   ├── RiskHeatMap.tsx
    │   ├── TrendChart.tsx
    │   └── ProjectTable.tsx
    └── ui/                     # shadcn/ui components
```

#### 3.2 State Management

```typescript
// Zustand store for dashboard state
import { create } from 'zustand';

interface DashboardStore {
  // Filters
  selectedTeams: string[];
  selectedRiskLevels: string[];
  searchQuery: string;

  // Data
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setFilter: (key: string, value: unknown) => void;
  fetchProjects: () => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
}

export const useDashboard = create<DashboardStore>((set, get) => ({
  selectedTeams: [],
  selectedRiskLevels: [],
  searchQuery: '',
  projects: [],
  isLoading: false,
  error: null,

  setFilter: (key, value) => set({ [key]: value }),

  fetchProjects: async () => {
    set({ isLoading: true });
    const { selectedTeams, selectedRiskLevels, searchQuery } = get();

    const response = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ teams: selectedTeams, risk: selectedRiskLevels, search: searchQuery })
    });

    const projects = await response.json();
    set({ projects, isLoading: false });
  },

  refreshProject: async (id) => {
    // Trigger scan and update project
  }
}));
```

#### 3.3 Real-Time Updates

```typescript
// WebSocket integration for real-time updates
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useRealtimeUpdates(orgId: string) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      auth: { orgId }
    });

    socket.on('project:updated', (project: Project) => {
      // Update Zustand store
      useDashboard.getState().updateProject(project);
    });

    socket.on('policy:violated', (violation: Violation) => {
      // Show toast notification
      toast.error(`Policy violation: ${violation.policy.name}`);
    });

    return () => socket.disconnect();
  }, [orgId]);
}
```

#### 3.4 Performance Optimization

**Virtualization for Large Lists**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function ProjectTable({ projects }: { projects: Project[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Row height
    overscan: 10 // Pre-render 10 rows above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <ProjectRow project={projects[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Lazy Loading Charts**:
```typescript
import dynamic from 'next/dynamic';

// Only load chart library when component is visible
const TrendChart = dynamic(() => import('./TrendChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false // Don't render on server
});

function ProjectDetail({ project }: { project: Project }) {
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setShowChart(true);
      }
    });

    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={chartContainerRef}>
        {showChart && <TrendChart data={project.history} />}
      </div>
    </div>
  );
}
```

### 4. Mobile Responsiveness

**Breakpoints**:
- Desktop: >1280px (full dashboard, all columns)
- Tablet: 768px-1279px (sidebar collapses, simplified charts)
- Mobile: <768px (single column, critical info only)

**Mobile-First Components**:
```typescript
// Responsive project card for mobile
function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border rounded-lg p-4 mb-2">
      <div className="flex justify-between">
        <h3 className="font-semibold">{project.name}</h3>
        <Badge variant={project.risk}>{project.risk}</Badge>
      </div>
      <div className="text-sm text-gray-600 mt-2">
        <span>Health: {project.healthScore}/100</span>
        <span className="ml-4">Team: {project.team}</span>
      </div>
    </div>
  );
}
```

## Consequences

### Positive

1. **Unified View**
   - Single dashboard for all environment components
   - Cross-tool correlation visible
   - Reduces context switching (no jumping between tools)

2. **Performance**
   - Virtual scrolling handles 1,000+ projects
   - Lazy loading reduces initial page load
   - Real-time updates without polling
   - <2s dashboard load time

3. **Multi-Persona Support**
   - Executive overview for leadership
   - Technical drill-down for engineers
   - Compliance view for auditors
   - Customizable dashboards per role

4. **Developer Experience**
   - Next.js App Router (fast, modern)
   - shadcn/ui (beautiful, accessible)
   - TypeScript (type-safe)
   - Hot reload (fast iteration)

### Negative

1. **Complexity**
   - Many views to maintain (5+ pages)
   - Complex state management (filters, pagination, real-time)
   - Performance optimization required (virtual scrolling, caching)

2. **Testing Challenge**
   - End-to-end tests slow with large datasets
   - Visual regression testing needed (many views)
   - Real-time features hard to test

3. **Mobile UX Compromises**
   - Some features don't translate well to mobile
   - Charts simplified on small screens
   - May need separate mobile app later

### Neutral

1. **Design System**
   - shadcn/ui provides consistency
   - But requires customization for brand
   - Need design review for all components

## Related Decisions

- ADR-501: Enterprise Architecture (overall platform design)
- ADR-503: Policy Orchestration (how policies are displayed)
- ADR-504: Gap Analysis Engine (powers comparison views)
- ADR-505: Compliance Reporting (powers compliance dashboard)

## References

- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Recharts](https://recharts.org)
- [Socket.io](https://socket.io)

---

**Decision Date**: 2026-01-26
**Reviewed By**: Product, Design, Frontend Engineering
**Next Review**: After design partner feedback (2027 Q2)
