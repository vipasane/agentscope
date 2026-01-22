# Documentation Frameworks Deep Analysis

> Architecture-level documentation standards, artifacts, formats, and visualization approaches

---

## Executive Summary

This research examines documentation frameworks at the **architecture abstraction level** - not code-level artifacts like API docs or class diagrams. The focus is on:

1. **Frameworks** - Structured approaches to architecture documentation
2. **Artifacts** - The documents these frameworks produce
3. **Formats** - File formats and their interchangeability
4. **Visualization** - Diagram standards for architecture communication
5. **Tools** - Paid and free tools that implement these standards

---

## 1. Documentation Frameworks

### 1.1 Framework Comparison Matrix

| Framework | Origin | Focus | Artifacts | Adoption |
|-----------|--------|-------|-----------|----------|
| **arc42** | Germany (Gernot Starke) | Pragmatic software architecture | 12 sections | Very high in Europe |
| **C4 Model** | UK (Simon Brown) | Hierarchical diagrams | 4 diagram levels | Very high globally |
| **TOGAF ADM** | The Open Group | Enterprise architecture | 40+ artifacts | High in enterprise |
| **4+1 View Model** | Philippe Kruchten | Multi-viewpoint | 5 views | Academic/legacy |
| **ISO/IEC/IEEE 42010** | IEEE/ISO | Architecture description | AD framework | Formal/compliance |
| **Diátaxis** | Daniele Procida | Documentation structure | 4 quadrants | Growing (Python community) |
| **Rozanski & Woods** | Authors | Software systems | 7 viewpoints | Academic |

### 1.2 arc42 (12 Sections)

**Origin:** Created by Dr. Gernot Starke and Peter Hruschka in Germany.

**Philosophy:** "Pragmatic, lean, and template-based" - focuses on what matters, not bureaucratic overhead.

**The 12 Sections:**

| # | Section | Purpose | Key Content |
|---|---------|---------|-------------|
| 1 | Introduction & Goals | Why this system exists | Requirements overview, quality goals, stakeholders |
| 2 | Constraints | Limitations on design | Technical, organizational, conventions |
| 3 | Context & Scope | System boundaries | Business context, technical context |
| 4 | Solution Strategy | Fundamental decisions | Technology choices, architecture patterns |
| 5 | Building Block View | Static decomposition | Whitebox/blackbox descriptions at multiple levels |
| 6 | Runtime View | Dynamic behavior | Scenarios, interactions, workflows |
| 7 | Deployment View | Infrastructure mapping | Hardware, environments, topology |
| 8 | Crosscutting Concepts | Recurring patterns | Security, logging, error handling approaches |
| 9 | Architecture Decisions | ADRs | Key decisions with rationale |
| 10 | Quality Requirements | Quality scenarios | Quality tree, quality attributes |
| 11 | Risks & Technical Debt | Known issues | Risk register, debt backlog |
| 12 | Glossary | Terminology | Domain terms, abbreviations |

**Strengths:**
- Template available in Markdown, AsciiDoc, LaTeX, Word
- Actively maintained (updated 2024)
- Works with any technology stack
- Can be scaled up/down based on project needs

**Tools:** arc42.org provides free templates; compatible with any documentation tool.

### 1.3 C4 Model (4 Levels)

**Origin:** Created by Simon Brown (author of "Software Architecture for Developers").

**Philosophy:** "Maps for code" - zoom in/out like Google Maps.

**The 4 Levels:**

| Level | Name | Audience | Shows |
|-------|------|----------|-------|
| 1 | **System Context** | Non-technical stakeholders | System + users + external systems |
| 2 | **Container** | Technical stakeholders | Applications, data stores, microservices |
| 3 | **Component** | Developers | Internal modules, services |
| 4 | **Code** | Developers (optional) | Classes, interfaces (often auto-generated) |

**Supplementary Diagrams:**
- **System Landscape** - Multiple systems overview
- **Dynamic** - Runtime interactions (sequence-like)
- **Deployment** - Infrastructure mapping

**Key Principle:** Each level answers different questions:
- L1: "What does our system do and who uses it?"
- L2: "What are the major technical building blocks?"
- L3: "How is each container implemented?"
- L4: "How does the code work?" (usually skip this)

**Tools:**
- **Structurizr** (Simon Brown's tool) - DSL-based, diagram-as-code
- **PlantUML** - C4 extension available
- **Mermaid** - C4 plugin
- **draw.io** - C4 shapes library

### 1.4 TOGAF ADM (Architecture Development Method)

**Origin:** The Open Group Architecture Framework (enterprise standard).

**Focus:** Enterprise architecture at massive scale.

**Phases:**
1. **Preliminary** - Framework and principles
2. **A: Architecture Vision** - Scope, stakeholders, vision
3. **B: Business Architecture** - Business strategy, governance
4. **C: Information Systems Architecture** - Data and application
5. **D: Technology Architecture** - Technical infrastructure
6. **E: Opportunities & Solutions** - Implementation planning
7. **F: Migration Planning** - Transition roadmap
8. **G: Implementation Governance** - Oversight
9. **H: Architecture Change Management** - Evolution

**Artifacts (40+):**
- Architecture Principles Catalog
- Stakeholder Map Matrix
- Solution Concept Diagram
- Value Chain Diagram
- Business Capability Map
- Application Portfolio Catalog
- Technology Standards Catalog
- Architecture Requirements Specification
- Transition Architecture State Diagrams

**Relevance for AgentScope:** TOGAF is overkill for most software projects but the artifact patterns (catalogs, matrices, diagrams) are reusable.

### 1.5 4+1 View Model (Kruchten)

**Origin:** Philippe Kruchten (1995), used in Rational Unified Process.

**The 5 Views:**

| View | Concerns | Stakeholders |
|------|----------|--------------|
| **Logical** | Functionality | End users, analysts |
| **Development** | Software management | Programmers |
| **Process** | Performance, scalability | System integrators |
| **Physical** | Deployment, topology | System engineers |
| **+1 Scenarios** | Use cases that tie views | All |

**Legacy Status:** Largely superseded by C4 and arc42, but concepts remain influential.

### 1.6 ISO/IEC/IEEE 42010

**Purpose:** International standard for architecture description.

**Key Concepts:**
- **Architecture Description (AD)** - The documentation artifact
- **Stakeholders** - Those with concerns
- **Concerns** - Areas of interest
- **Viewpoints** - Conventions for constructing views
- **Views** - Representations addressing concerns
- **Models** - Elements of views

**When Required:** Government contracts, aerospace, defense, safety-critical systems.

### 1.7 Diátaxis Framework

**Origin:** Daniele Procida, adopted by Django, Python, NumPy.

**Philosophy:** Four distinct documentation types serving different user needs.

**The Four Quadrants:**

|  | Study | Work |
|--|-------|------|
| **Acquisition** | **Tutorials** (learning-oriented) | **How-to Guides** (goal-oriented) |
| **Application** | **Explanation** (understanding-oriented) | **Reference** (information-oriented) |

**Application:**
- **Tutorials:** "Learn by doing" - guided lessons
- **How-to Guides:** "Solve a problem" - practical steps
- **Explanation:** "Understand why" - conceptual discussion
- **Reference:** "Look up facts" - technical specifications

**Relevance:** Diátaxis focuses on user documentation, not architecture documentation, but the quadrant model influences how AgentScope should organize its generated docs.

---

## 2. Document Artifacts

### 2.1 Architecture Decision Records (ADRs)

**Purpose:** Capture significant architectural decisions with context and consequences.

**Popular Formats:**

| Format | Origin | Structure | Tool Support |
|--------|--------|-----------|--------------|
| **Nygard** | Michael Nygard | Title, Context, Decision, Status, Consequences | adr-tools |
| **MADR** | Oliver Kopp | More detailed template | adr-manager, Log4brains |
| **Y-Statements** | Google | "In context C, facing F, we decided D to achieve Q, accepting T" | Manual |
| **Lightweight** | ThoughtWorks | Minimal: Why, What, Consequences | Manual |

**MADR Template (Markdown Any Decision Records):**
```markdown
# ADR-001: Use PostgreSQL for primary data store

## Status
Accepted

## Context
We need a relational database that supports...

## Decision
We will use PostgreSQL 15+

## Consequences
### Positive
- ACID compliance
- JSON support
### Negative
- Requires DBA expertise
### Risks
- License changes (BSD-like, unlikely)
```

**Tools:**
- **adr-tools** (CLI, shell scripts) - Nygard format
- **Log4brains** (Node.js) - MADR format, generates static site
- **ADR Manager** (VS Code extension) - MADR format
- **Backstage ADR plugin** - Integrates with developer portal

### 2.2 Software Design Documents (SDDs)

**Purpose:** Detailed design specification before implementation.

**IEEE 1016 Standard Structure:**
1. Introduction
2. References
3. Glossary
4. Design Description Information Content
5. Design Viewpoints
6. Design Views
7. Design Overlays
8. Design Rationale

**Practical SDD Structure (Modern):**
1. Overview & Goals
2. Background & Context
3. High-Level Design
4. Detailed Design
5. Alternatives Considered
6. Security Considerations
7. Privacy Considerations
8. Testing Strategy
9. Deployment Strategy
10. Open Questions

### 2.3 Google Design Docs

**Origin:** Google's internal design review process.

**Structure:**
1. **Context/Background** - Why this doc exists
2. **Goals & Non-Goals** - Scope definition
3. **Overview** - High-level solution
4. **Detailed Design** - Technical specifics
5. **Cross-cutting Concerns** - Security, privacy, monitoring
6. **Alternatives Considered** - Other approaches evaluated
7. **Open Questions** - Unresolved issues

**Key Feature:** Collaborative editing with inline comments for design review.

### 2.4 Amazon 6-Pager & PR-FAQ

**6-Pager:**
- Maximum 6 pages of prose (no slides)
- Narrative format, read silently in meetings
- Forces rigorous thinking

**PR-FAQ (Press Release/FAQ):**
- **Press Release** - Announces the feature as if launched
- **FAQ** - Internal questions (how does it work?)
- **FAQ** - External questions (customer perspective)

**Working Backwards Process:**
1. Write the press release first
2. Define customer benefit
3. Then build to achieve that vision

### 2.5 RFCs (Request for Comments)

**Origin:** IETF (Internet standards), adopted by companies.

**RFC Variants:**

| Org | Name | Focus |
|-----|------|-------|
| IETF | RFC | Internet standards |
| Python | PEP | Python enhancements |
| TC39 | Proposal | JavaScript/ECMAScript |
| Rust | RFC | Language evolution |
| React | RFC | Library features |
| Kubernetes | KEP | Enhancements |
| Ember | RFC | Framework changes |

**Typical Structure:**
1. Metadata (author, status, date)
2. Abstract/Summary
3. Motivation
4. Detailed Design
5. Drawbacks
6. Alternatives
7. Unresolved Questions

### 2.6 Runbooks & Operational Docs

**Purpose:** Operational procedures for running systems.

**Types:**
- **Runbooks** - Step-by-step incident response
- **Playbooks** - Situational guidance
- **SOPs** - Standard Operating Procedures
- **Post-mortems** - Incident analysis

**Runbook Structure:**
1. Alert/Trigger
2. Impact Assessment
3. Diagnostic Steps
4. Remediation Procedures
5. Escalation Path
6. Post-resolution Tasks

---

## 3. Formats & Interchangeability

### 3.1 Document Formats

| Format | Extensions | Tooling | Interchangeability |
|--------|------------|---------|-------------------|
| **Markdown** | .md | Universal | High (Pandoc) |
| **AsciiDoc** | .adoc | Asciidoctor | High (Pandoc) |
| **reStructuredText** | .rst | Sphinx | Medium |
| **DocBook** | .xml | XSLT tools | High (formal) |
| **DITA** | .dita | DITA-OT | High (enterprise) |
| **LaTeX** | .tex | TeX engines | Medium |
| **Confluence** | .xhtml | Atlassian | Low (proprietary) |
| **Notion** | .md export | Notion | Medium |

### 3.2 Conversion Matrix (Pandoc)

```
┌──────────────┐
│   Pandoc     │
│ (Universal   │
│  Converter)  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ Input:  md, adoc, rst, docx, html, latex    │
│ Output: md, adoc, rst, docx, html, pdf,     │
│         epub, confluence, mediawiki         │
└─────────────────────────────────────────────┘
```

**Pandoc Capabilities:**
- Converts between 40+ formats
- Preserves structure (headings, lists, tables)
- Supports custom templates
- Filters for custom transformations

### 3.3 Diagram Formats

| Format | Type | Tools | Export To |
|--------|------|-------|-----------|
| **PlantUML** | Text DSL | PlantUML, Kroki | SVG, PNG, PDF |
| **Mermaid** | Text DSL | GitHub, GitLab, VS Code | SVG, PNG |
| **Structurizr DSL** | Text DSL | Structurizr | SVG, PNG, PlantUML |
| **draw.io XML** | XML | draw.io/diagrams.net | SVG, PNG, PDF, Visio |
| **Visio** | Binary/XML | MS Visio | SVG, PNG, PDF |
| **Archimate** | XML | Archi, Sparx EA | SVG, PNG, Open Exchange |
| **XMI** | XML | UML tools | Interchange format |

### 3.4 Architecture Description Languages (ADLs)

| ADL | Purpose | Tooling |
|-----|---------|---------|
| **Structurizr DSL** | C4 model as code | Structurizr CLI |
| **ACME** | Academic ADL | AcmeStudio |
| **ArchiMate** | Enterprise architecture | Archi, EA |
| **SysML** | Systems engineering | Various UML tools |
| **Alloy** | Formal specification | Alloy Analyzer |

---

## 4. Visualization Standards

### 4.1 Architecture Diagram Types

| Diagram Type | Shows | When to Use | Standard |
|--------------|-------|-------------|----------|
| **Context Diagram** | System + external actors | Always (overview) | C4 L1 |
| **Container Diagram** | Technical building blocks | Technical docs | C4 L2 |
| **Component Diagram** | Internal structure | Detailed design | C4 L3, UML |
| **Deployment Diagram** | Infrastructure mapping | Operations | UML, C4 |
| **Sequence Diagram** | Interactions over time | Workflows | UML |
| **Data Flow Diagram** | Data movement | Security review | DFD |
| **Business Capability Map** | Business functions | Strategy | TOGAF |
| **Value Stream Map** | Workflow optimization | Lean/DevOps | Lean |

### 4.2 C4 Diagram Standard

**Elements:**
- **Person** - Human user
- **Software System** - Highest abstraction
- **Container** - Deployable unit (app, service, DB)
- **Component** - Module within container

**Relationships:**
- Directed arrows with labels
- Technology annotations

**Layout Principles:**
- Top-to-bottom or left-to-right flow
- External systems at edges
- Group related elements

### 4.3 ArchiMate Standard

**Origin:** The Open Group (same as TOGAF).

**Layers:**
1. **Business** - Actors, roles, processes, services
2. **Application** - Components, interfaces, data
3. **Technology** - Nodes, devices, networks

**Element Types (50+):**
- Active structure (actors, components)
- Behavior (processes, services)
- Passive structure (data objects)
- Motivation (goals, requirements)

**When to Use:** Enterprise architecture, large organizations, TOGAF alignment.

### 4.4 UML Architecture Diagrams

**Relevant Diagrams (not class/sequence):**

| Diagram | Purpose |
|---------|---------|
| **Deployment** | Nodes, artifacts, infrastructure |
| **Package** | Module organization |
| **Component** | Interfaces, dependencies |
| **Composite Structure** | Internal structure |

### 4.5 Informal Box-and-Arrow

**Reality:** Most architecture diagrams are informal "boxes and arrows."

**Problems:**
- No consistent semantics
- Arrows mean different things
- Boxes represent different abstractions
- No clear legend

**C4's Value:** Provides semantic consistency to box-and-arrow diagrams.

---

## 5. Tools Comparison

### 5.1 Free/Open Source Tools

| Tool | Focus | Format | Diagrams | Export |
|------|-------|--------|----------|--------|
| **Structurizr Lite** | C4 as code | DSL | C4 all levels | SVG, PNG, PlantUML |
| **PlantUML** | Diagrams as code | DSL | UML, C4, many | SVG, PNG, PDF |
| **Mermaid** | Diagrams in Markdown | DSL | Flowchart, sequence, C4 | SVG, PNG |
| **draw.io** | General diagramming | XML | Any | SVG, PNG, PDF, Visio |
| **Archi** | ArchiMate modeling | XML | ArchiMate | SVG, PNG, HTML |
| **MkDocs** | Documentation site | Markdown | Via plugins | HTML, PDF |
| **Docusaurus** | Documentation site | MDX | Via plugins | HTML |
| **Sphinx** | Documentation | RST | Via extensions | HTML, PDF, EPUB |
| **AsciiDoctor** | Documentation | AsciiDoc | Via extensions | HTML, PDF, EPUB |
| **Backstage** | Developer portal | YAML + MDX | Embedded | HTML |

### 5.2 Paid/Commercial Tools

| Tool | Focus | Price Range | Strengths |
|------|-------|-------------|-----------|
| **Structurizr Cloud** | C4 diagramming | $5-50/mo | Best C4 support |
| **IcePanel** | C4 + collaboration | $10-20/user/mo | Interactive diagrams |
| **Ilograph** | Architecture diagrams | $10-20/user/mo | 3D visualizations |
| **LucidChart** | General diagramming | $10-15/user/mo | Collaboration, templates |
| **Miro** | Whiteboarding | $10-20/user/mo | Workshops, collaboration |
| **Confluence** | Documentation | $6-15/user/mo | Atlassian integration |
| **GitBook** | Documentation | Free-$8/user/mo | Developer-friendly |
| **Notion** | All-in-one | Free-$10/user/mo | Flexibility |
| **Enterprise Architect** | Full UML/ArchiMate | $229-699 one-time | Completeness |
| **Sparx Systems EA** | Enterprise modeling | $229-699 one-time | Standards compliance |

### 5.3 Tool Selection Matrix

| Need | Best Free | Best Paid |
|------|-----------|-----------|
| C4 diagrams | Structurizr Lite | IcePanel |
| Enterprise architecture | Archi | Enterprise Architect |
| Quick diagrams | draw.io | LucidChart |
| Documentation site | MkDocs/Docusaurus | GitBook |
| Developer portal | Backstage | Port, Cortex |
| Collaborative docs | HackMD | Notion, Confluence |
| Diagrams in Markdown | Mermaid | - |

---

## 6. Format Interchangeability

### 6.1 Document Format Conversion

**High Interchangeability:**
```
Markdown ←→ AsciiDoc ←→ HTML ←→ PDF
    ↑           ↑
    └─── Pandoc ───┘
```

**Medium Interchangeability:**
```
Confluence → Markdown (export)
Notion → Markdown (export)
Word → Markdown (Pandoc)
```

**Low Interchangeability:**
```
Proprietary tools → Manual recreation
```

### 6.2 Diagram Format Conversion

| From | To | Tool | Fidelity |
|------|-----|------|----------|
| PlantUML | SVG/PNG | PlantUML | High |
| Structurizr | PlantUML | Structurizr | High |
| Mermaid | SVG | Mermaid CLI | High |
| draw.io | Visio | draw.io | Medium |
| ArchiMate | Open Exchange | Archi | High |

### 6.3 The Diagrams-as-Code Movement

**Trend:** Store diagrams as text in version control.

**Benefits:**
- Diff-able
- Review-able in PRs
- Single source of truth
- Automation-friendly

**Tools:**
- Structurizr DSL
- PlantUML
- Mermaid
- D2 (new contender)
- Pikchr (SQLite team)

---

## 7. AgentScope Implications

### 7.1 Framework Alignment

**Recommendation:** Adopt **C4 Model** as primary framework.

**Reasons:**
1. Most widely adopted for software architecture
2. Clear abstraction levels match AgentScope's needs
3. Diagrams-as-code friendly (Structurizr DSL, Mermaid)
4. Can be extended with arc42 sections for documentation

### 7.2 Artifacts AgentScope Should Generate

| Artifact | Format | Framework Alignment |
|----------|--------|---------------------|
| System Context Diagram | Mermaid/SVG | C4 Level 1 |
| Agent Container Diagram | Mermaid/SVG | C4 Level 2 (Agents as containers) |
| Skill Component Diagram | Mermaid/SVG | C4 Level 3 (Skills as components) |
| Agent ADR Template | Markdown | MADR format |
| llms.txt | Plain text | Emerging standard |
| Architecture Overview | Markdown | arc42 Section 1-4 |

### 7.3 Recommended Abstraction Levels

**For Agent Systems:**

| Level | C4 Equivalent | AgentScope Mapping |
|-------|---------------|-------------------|
| L0 | System Landscape | Multi-project agent ecosystem |
| L1 | System Context | Project + external systems/users |
| L2 | Container | Agents, MCP servers, memory stores |
| L3 | Component | Skills, tools, hooks |
| L4 | Code | (Skip - use IDE for this) |

### 7.4 Output Formats

**Primary:** Markdown (universal)
**Diagrams:** Mermaid (GitHub/GitLab native rendering)
**Alternative:** Structurizr DSL for advanced C4

---

## 8. Summary: Standards Comparison

### 8.1 Quick Reference

| Category | Standard | Status | AgentScope? |
|----------|----------|--------|-------------|
| **Framework** | C4 Model | De facto | ✅ Yes |
| **Framework** | arc42 | Popular | ✅ Sections 1-4, 9 |
| **Framework** | TOGAF | Enterprise | ❌ Overkill |
| **Artifact** | ADR (MADR) | De facto | ✅ Template |
| **Artifact** | Design Doc | Common | ⚠️ Optional |
| **Format** | Markdown | Universal | ✅ Primary |
| **Format** | AsciiDoc | Technical | ⚠️ Alternative |
| **Diagram** | Mermaid | Growing | ✅ Primary |
| **Diagram** | PlantUML | Mature | ⚠️ Alternative |
| **Diagram** | ArchiMate | Enterprise | ❌ Overkill |

### 8.2 Tool Recommendations for AgentScope

| Purpose | Tool | Why |
|---------|------|-----|
| **Diagrams** | Mermaid | Native GitHub/GitLab rendering |
| **Advanced C4** | Structurizr DSL | Best C4 support |
| **Docs** | Markdown | Universal |
| **Static Site** | MkDocs or Docusaurus | Modern, extensible |
| **Conversion** | Pandoc | Format flexibility |

---

## Sources

### Frameworks
- [arc42](https://arc42.org/) - arc42.org
- [C4 Model](https://c4model.com/) - c4model.com
- [TOGAF](https://www.opengroup.org/togaf) - The Open Group
- [Diátaxis](https://diataxis.fr/) - diataxis.fr
- [ISO/IEC/IEEE 42010](https://www.iso.org/standard/74393.html) - ISO

### ADRs
- [ADR GitHub Org](https://adr.github.io/) - adr.github.io
- [MADR](https://adr.github.io/madr/) - Markdown Any Decision Records
- [Log4brains](https://github.com/thomvaill/log4brains) - ADR management

### Tools
- [Structurizr](https://structurizr.com/) - structurizr.com
- [Mermaid](https://mermaid.js.org/) - mermaid.js.org
- [PlantUML](https://plantuml.com/) - plantuml.com
- [draw.io](https://draw.io/) - diagrams.net
- [Archi](https://www.archimatetool.com/) - ArchiMate tool
- [Backstage](https://backstage.io/) - Developer portal

### Books
- "Software Architecture for Developers" - Simon Brown
- "Documenting Software Architectures" - Clements, Bachmann, et al.
- "arc42 by Example" - Gernot Starke

---

*Research Date: January 2026*
