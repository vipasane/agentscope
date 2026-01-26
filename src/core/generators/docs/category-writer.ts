/**
 * Category File Writer (Task 2.5)
 * Writes category files to docs/agent-architecture/categories/ directory
 * Updates main README with category links
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Agent } from '../../model/types.js';
import { categorizeAgents, type CategorizedAgents, type AgentCategory } from '../diagrams/categories.js';
import { generateCategoryDiagram } from '../diagrams/category-diagram.js';
import { formatCategoryDocument } from '../../formatters/output/category-formatter.js';

export interface CategoryWriterOptions {
  /** Output directory for category files (default: docs/agent-architecture) */
  outputDir: string;
  /** All agents from the scan */
  agents: Agent[];
  /** Relative path from category files to root (default: ..) */
  relativePathToRoot?: string;
}

export interface CategoryWriteResult {
  /** Number of category files written */
  filesWritten: number;
  /** Category file paths */
  filePaths: string[];
  /** Category summary for README inclusion */
  categorySummary: string;
}

/**
 * Write category files and return summary for README
 */
export async function writeCategoryFiles(options: CategoryWriterOptions): Promise<CategoryWriteResult> {
  const {
    outputDir,
    agents,
    relativePathToRoot = '..',
  } = options;

  // Categorize all agents
  const categorized = categorizeAgents(agents);

  // Create categories directory
  const categoriesDir = join(outputDir, 'categories');
  await mkdir(categoriesDir, { recursive: true });

  const filePaths: string[] = [];

  // Write a file for each category
  for (const categoryGroup of categorized) {
    const { category, agents: categoryAgents } = categoryGroup;

    // Generate category diagram
    const diagram = generateCategoryDiagram({
      category,
      categoryAgents,
      allAgents: agents,
      showCrossCategoryDeps: true,
    });

    // Format category document
    const markdown = formatCategoryDocument({
      category,
      categoryAgents,
      allAgents: agents,
      categoryDiagram: diagram,
      relativePathToRoot,
    });

    // Write to file
    const fileName = `${category}.md`;
    const filePath = join(categoriesDir, fileName);
    await writeFile(filePath, markdown, 'utf-8');
    filePaths.push(filePath);
  }

  // Generate category summary for README
  const categorySummary = generateCategorySummary(categorized, relativePathToRoot);

  return {
    filesWritten: filePaths.length,
    filePaths,
    categorySummary,
  };
}

/**
 * Generate category summary table for inclusion in main README
 */
function generateCategorySummary(
  categorized: CategorizedAgents[],
  relativePathToRoot: string
): string {
  const lines = [
    '## 📂 Drill Into Categories',
    '',
    '| Category | Agents | Coordinators | Workers | Link |',
    '|----------|-------:|-------------:|--------:|------|',
  ];

  for (const group of categorized) {
    const { category, label, icon, agents } = group;
    const coordinators = agents.filter(a => a.type === 'coordinator').length;
    const workers = agents.filter(a => a.type === 'worker' || !a.type).length;

    lines.push(
      `| ${icon} ${label} | ${agents.length} | ${coordinators} | ${workers} | [→ ${category}.md](./categories/${category}.md) |`
    );
  }

  return lines.join('\n');
}

/**
 * Generate category navigation index
 * Returns markdown table linking to all category files
 */
export function generateCategoryNavigation(
  categorized: CategorizedAgents[],
  relativePathToRoot: string = '.'
): string {
  const lines = [
    '## Category Navigation',
    '',
    '| Category | Total | Link |',
    '|----------|------:|------|',
  ];

  for (const group of categorized) {
    const { category, label, icon, agents } = group;
    lines.push(
      `| ${icon} ${label} | ${agents.length} | [→ categories/${category}.md](${relativePathToRoot}/categories/${category}.md) |`
    );
  }

  return lines.join('\n');
}
