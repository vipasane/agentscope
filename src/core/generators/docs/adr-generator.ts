/**
 * ADR (Architecture Decision Record) Generator
 * Generates ADR templates following MADR 3.0 format
 * Phase 3 Implementation: Tasks 3.4-3.5
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

/**
 * Simple frontmatter parser (replaces gray-matter dependency)
 */
function parseFrontmatter(content: string): { data: Record<string, any>; content: string } {
  const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(fmRegex);

  if (!match) {
    return { data: {}, content };
  }

  try {
    const data = yaml.load(match[1]) as Record<string, any>;
    return { data, content: match[2] };
  } catch {
    return { data: {}, content };
  }
}

// ============================================================================
// ADR Types
// ============================================================================

export interface ADR {
  number: string;
  title: string;
  status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';
  date: string;
  deciders?: string[];
  technicalStory?: string;
  contextAndProblem?: string;
  consideredOptions?: string[];
  decisionOutcome?: string;
  filePath: string;
  category?: string;
}

export interface ADRIndex {
  adrs: ADR[];
  categories: Map<string, ADR[]>;
  lastNumber: number;
}

export interface ADRGeneratorOptions {
  /** Root directory to scan for ADRs */
  projectRoot: string;
  /** Additional ADR directories to scan */
  adrDirs?: string[];
  /** Output directory for ADR index */
  outputDir?: string;
}

// ============================================================================
// Task 3.4: ADR Index Generator
// ============================================================================

/**
 * Scan directories for ADRs and generate index
 *
 * Task 3.4: ADR Index Generator (~80 lines)
 * - Scans both ADR directories
 * - Parses ADR frontmatter (title, status, date)
 * - Categorizes ADRs (Architecture, Output, Quality, Implementation)
 * - Generates ADR index table
 */
export function generateADRIndex(options: ADRGeneratorOptions): ADRIndex {
  const { projectRoot, adrDirs = [] } = options;

  // Default ADR directories
  const defaultDirs = [
    path.join(projectRoot, 'docs', 'adr'),
    path.join(projectRoot, 'docs', 'architecture', 'decisions'),
  ];

  const scanDirs = [...defaultDirs, ...adrDirs];
  const adrs: ADR[] = [];

  // Scan each directory for ADR files
  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');

    for (const file of files) {
      const filePath = path.join(dir, file);
      const adr = parseADRFile(filePath);
      if (adr) {
        adrs.push(adr);
      }
    }
  }

  // Sort by number
  adrs.sort((a, b) => {
    const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  // Get last ADR number
  const lastNumber = adrs.length > 0
    ? Math.max(...adrs.map(a => parseInt(a.number.replace(/\D/g, '')) || 0))
    : 0;

  // Categorize ADRs
  const categories = categorizeADRs(adrs);

  return { adrs, categories, lastNumber };
}

/**
 * Parse an ADR file and extract metadata
 */
function parseADRFile(filePath: string): ADR | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = parseFrontmatter(content);

    // Extract ADR number from filename (e.g., ADR-001-title.md)
    const filename = path.basename(filePath);
    const numberMatch = filename.match(/ADR[-_]?(\d+)/i);
    const number = numberMatch ? `ADR-${numberMatch[1].padStart(3, '0')}` : 'ADR-000';

    // Extract title from frontmatter or first heading
    let title = data.title || '';
    if (!title) {
      const titleMatch = body.match(/^#\s+(.+)$/m);
      title = titleMatch ? titleMatch[1].replace(/^ADR[-_]?\d+:?\s*/i, '').trim() : 'Untitled';
    }

    // Determine category
    const category = determineCategory(title, body);

    return {
      number,
      title,
      status: data.status || 'Proposed',
      date: data.date || extractDateFromFile(filePath),
      deciders: data.deciders,
      technicalStory: data.technicalStory,
      contextAndProblem: data.context,
      consideredOptions: data.options,
      decisionOutcome: data.decision,
      filePath,
      category,
    };
  } catch (error) {
    console.warn(`Failed to parse ADR file ${filePath}:`, error);
    return null;
  }
}

/**
 * Determine ADR category based on title and content
 */
function determineCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  if (text.match(/architecture|design|pattern|structure|ddd|domain/)) {
    return 'Architecture & Design';
  }
  if (text.match(/output|documentation|format|template|generation/)) {
    return 'Output & Documentation';
  }
  if (text.match(/quality|test|coverage|validation|verification/)) {
    return 'Quality Assurance';
  }
  if (text.match(/implementation|code|refactor|migration|feature/)) {
    return 'Implementation';
  }
  if (text.match(/performance|optimization|benchmark|speed/)) {
    return 'Performance';
  }
  if (text.match(/security|auth|permission|access/)) {
    return 'Security';
  }

  return 'General';
}

/**
 * Extract date from file metadata
 */
function extractDateFromFile(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Categorize ADRs into groups
 */
function categorizeADRs(adrs: ADR[]): Map<string, ADR[]> {
  const categories = new Map<string, ADR[]>();

  for (const adr of adrs) {
    const category = adr.category || 'General';
    const existing = categories.get(category) || [];
    existing.push(adr);
    categories.set(category, existing);
  }

  return categories;
}

// ============================================================================
// Task 3.5: ADR Index Formatter
// ============================================================================

/**
 * Format ADR index as README.md
 *
 * Task 3.5: ADR Index Formatter (~60 lines)
 * - Generate ADR index README.md
 * - List all ADRs by category
 * - Link to individual ADR files
 */
export function formatADRIndex(index: ADRIndex): string {
  const lines: string[] = [
    '# Architecture Decision Records (ADRs)',
    '',
    '> Architecture decisions made in this project, following the [MADR 3.0 template](https://adr.github.io/madr/).',
    '',
    '---',
    '',
    '## Quick Stats',
    '',
    `- **Total ADRs**: ${index.adrs.length}`,
    `- **Last ADR**: ${index.lastNumber > 0 ? `ADR-${index.lastNumber.toString().padStart(3, '0')}` : 'None'}`,
    `- **Categories**: ${index.categories.size}`,
    '',
    '---',
    '',
    '## ADRs by Status',
    '',
  ];

  // Group by status
  const byStatus = new Map<string, ADR[]>();
  for (const adr of index.adrs) {
    const status = adr.status;
    const existing = byStatus.get(status) || [];
    existing.push(adr);
    byStatus.set(status, existing);
  }

  // Show status counts
  lines.push('| Status | Count |');
  lines.push('|--------|-------|');
  for (const status of ['Accepted', 'Proposed', 'Deprecated', 'Superseded']) {
    const count = byStatus.get(status)?.length || 0;
    const icon = getStatusIcon(status as ADR['status']);
    lines.push(`| ${icon} ${status} | ${count} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## ADRs by Category');
  lines.push('');

  // List by category
  for (const [category, categoryADRs] of Array.from(index.categories.entries()).sort()) {
    lines.push(`### ${category}`);
    lines.push('');
    lines.push('| Number | Title | Status | Date |');
    lines.push('|--------|-------|--------|------|');

    for (const adr of categoryADRs) {
      const statusIcon = getStatusIcon(adr.status);
      const relPath = path.relative(path.dirname(adr.filePath), adr.filePath);
      lines.push(`| [${adr.number}](./${path.basename(adr.filePath)}) | ${adr.title} | ${statusIcon} ${adr.status} | ${adr.date} |`);
    }

    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## All ADRs (Chronological)');
  lines.push('');
  lines.push('| Number | Title | Category | Status | Date |');
  lines.push('|--------|-------|----------|--------|------|');

  for (const adr of index.adrs) {
    const statusIcon = getStatusIcon(adr.status);
    lines.push(`| [${adr.number}](./${path.basename(adr.filePath)}) | ${adr.title} | ${adr.category} | ${statusIcon} ${adr.status} | ${adr.date} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Creating a New ADR');
  lines.push('');
  lines.push('To create a new ADR:');
  lines.push('');
  lines.push('```bash');
  const nextNumber = (index.lastNumber + 1).toString().padStart(3, '0');
  lines.push(`# Generate ADR-${nextNumber} template`);
  lines.push(`agentscope generate adr --title "Your Decision Title"`);
  lines.push('```');
  lines.push('');
  lines.push('Or manually create a file following the [MADR 3.0 template](https://adr.github.io/madr/).');
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\.\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Generate a new ADR template following MADR 3.0 format
 */
export function generateADRTemplate(
  title: string,
  number: string,
  options: {
    status?: ADR['status'];
    date?: string;
    deciders?: string[];
  } = {}
): string {
  const {
    status = 'Proposed',
    date = new Date().toISOString().split('T')[0],
    deciders = [],
  } = options;

  const lines: string[] = [
    '---',
    `title: ${title}`,
    `status: ${status}`,
    `date: ${date}`,
  ];

  if (deciders.length > 0) {
    lines.push(`deciders: ${deciders.join(', ')}`);
  }

  lines.push('---');
  lines.push('');
  lines.push(`# ${number}: ${title}`);
  lines.push('');
  lines.push('## Context and Problem Statement');
  lines.push('');
  lines.push('<!-- Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question. -->');
  lines.push('');
  lines.push('## Decision Drivers');
  lines.push('');
  lines.push('<!-- List the decision drivers (forces) that influenced the decision. -->');
  lines.push('');
  lines.push('* [driver 1]');
  lines.push('* [driver 2]');
  lines.push('* [driver 3]');
  lines.push('');
  lines.push('## Considered Options');
  lines.push('');
  lines.push('<!-- List the options that were considered. -->');
  lines.push('');
  lines.push('* [option 1]');
  lines.push('* [option 2]');
  lines.push('* [option 3]');
  lines.push('');
  lines.push('## Decision Outcome');
  lines.push('');
  lines.push('Chosen option: "[option 1]", because [justification. e.g., only option which meets all decision drivers].');
  lines.push('');
  lines.push('### Positive Consequences');
  lines.push('');
  lines.push('<!-- List the positive consequences of the decision. -->');
  lines.push('');
  lines.push('* [e.g., improvement of quality attribute satisfaction, follow-up decisions required, …]');
  lines.push('');
  lines.push('### Negative Consequences');
  lines.push('');
  lines.push('<!-- List the negative consequences of the decision. -->');
  lines.push('');
  lines.push('* [e.g., compromising quality attribute, follow-up decisions required, …]');
  lines.push('');
  lines.push('## Pros and Cons of the Options');
  lines.push('');
  lines.push('### [option 1]');
  lines.push('');
  lines.push('<!-- [example | description | pointer to more information | …] -->');
  lines.push('');
  lines.push('* Good, because [argument a]');
  lines.push('* Good, because [argument b]');
  lines.push('* Bad, because [argument c]');
  lines.push('');
  lines.push('### [option 2]');
  lines.push('');
  lines.push('* Good, because [argument a]');
  lines.push('* Bad, because [argument b]');
  lines.push('');
  lines.push('## Links');
  lines.push('');
  lines.push('<!-- List any related ADRs or documentation. -->');
  lines.push('');
  lines.push('* [Link type] [Link to ADR] <!-- example: Refined by [ADR-0005](0005-example.md) -->');

  return lines.join('\n');
}

/**
 * Get status icon
 */
function getStatusIcon(status: ADR['status']): string {
  switch (status) {
    case 'Accepted': return '✅';
    case 'Proposed': return '📝';
    case 'Deprecated': return '⚠️';
    case 'Superseded': return '🔄';
    default: return '❓';
  }
}
