/**
 * Template Customization System
 * Allows users to customize documentation templates
 * Phase 3 Implementation: Task 3.6
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Template Types
// ============================================================================

export type TemplateType =
  | 'adr'
  | 'context'
  | 'readme'
  | 'component-map'
  | 'hierarchy'
  | 'dataflow'
  | 'category';

export interface Template {
  type: TemplateType;
  name: string;
  description: string;
  content: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface TemplateOptions {
  /** Custom template directory */
  templateDir?: string;
  /** Variables to substitute in template */
  variables?: Record<string, string>;
  /** Whether to use custom template if available */
  useCustom?: boolean;
}

// ============================================================================
// Template Registry
// ============================================================================

const DEFAULT_TEMPLATES: Record<TemplateType, string> = {
  adr: 'ADR-{number}: {title}',
  context: '# Architecture Context (arc42)',
  readme: '# {projectName}',
  'component-map': '# Component Map',
  hierarchy: '# Agent Hierarchy',
  dataflow: '# System Data Flow',
  category: '# {category} Category',
};

const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  adr: 'Architecture Decision Record (MADR 3.0 format)',
  context: 'Architecture context documentation (arc42)',
  readme: 'Main documentation README',
  'component-map': 'Component relationship diagram',
  hierarchy: 'Agent delegation hierarchy',
  dataflow: 'System dataflow diagram',
  category: 'Category-specific documentation',
};

// ============================================================================
// Template Loading & Customization
// ============================================================================

/**
 * Load a template with optional customization
 */
export function loadTemplate(
  type: TemplateType,
  options: TemplateOptions = {}
): Template {
  const { templateDir, useCustom = true } = options;

  // Try to load custom template if enabled
  if (useCustom && templateDir) {
    const customTemplate = loadCustomTemplate(type, templateDir);
    if (customTemplate) {
      return customTemplate;
    }
  }

  // Fall back to default template
  return {
    type,
    name: type,
    description: TEMPLATE_DESCRIPTIONS[type],
    content: DEFAULT_TEMPLATES[type],
    variables: getTemplateVariables(type),
  };
}

/**
 * Load custom template from user directory
 */
function loadCustomTemplate(
  type: TemplateType,
  templateDir: string
): Template | null {
  const templatePath = path.join(templateDir, `${type}.template.md`);

  if (!fs.existsSync(templatePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(templatePath, 'utf-8');
    const variables = extractTemplateVariables(content);

    return {
      type,
      name: `${type} (custom)`,
      description: `Custom ${TEMPLATE_DESCRIPTIONS[type]}`,
      content,
      variables,
    };
  } catch (error) {
    console.warn(`Failed to load custom template ${templatePath}:`, error);
    return null;
  }
}

/**
 * Extract template variables from content
 */
function extractTemplateVariables(content: string): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const varPattern = /\{([a-zA-Z0-9_]+)(?::([^}]+))?\}/g;
  const seen = new Set<string>();

  let match;
  while ((match = varPattern.exec(content)) !== null) {
    const [, name, description] = match;

    if (!seen.has(name)) {
      variables.push({
        name,
        description: description || `Variable ${name}`,
        required: true,
      });
      seen.add(name);
    }
  }

  return variables;
}

/**
 * Get default variables for a template type
 */
function getTemplateVariables(type: TemplateType): TemplateVariable[] {
  switch (type) {
    case 'adr':
      return [
        { name: 'number', description: 'ADR number (e.g., ADR-001)', required: true },
        { name: 'title', description: 'Decision title', required: true },
        { name: 'status', description: 'Decision status', required: false, defaultValue: 'Proposed' },
        { name: 'date', description: 'Decision date', required: false, defaultValue: new Date().toISOString().split('T')[0] },
      ];

    case 'context':
      return [
        { name: 'projectName', description: 'Project name', required: true },
        { name: 'projectDescription', description: 'Project description', required: false },
      ];

    case 'readme':
      return [
        { name: 'projectName', description: 'Project name', required: true },
        { name: 'agentCount', description: 'Number of agents', required: false },
      ];

    case 'category':
      return [
        { name: 'category', description: 'Category name', required: true },
        { name: 'icon', description: 'Category icon', required: false },
      ];

    default:
      return [];
  }
}

/**
 * Substitute variables in template content
 */
export function substituteVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key}(?::[^}]+)?\\}`, 'g');
    result = result.replace(pattern, value);
  }

  // Remove unsubstituted optional variables
  result = result.replace(/\{[a-zA-Z0-9_]+:([^}]+)\}/g, '$1');

  return result;
}

/**
 * Save template to custom directory
 */
export function saveCustomTemplate(
  template: Template,
  templateDir: string
): void {
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  const templatePath = path.join(templateDir, `${template.type}.template.md`);
  fs.writeFileSync(templatePath, template.content, 'utf-8');
}

/**
 * List all available templates
 */
export function listTemplates(templateDir?: string): Template[] {
  const templates: Template[] = [];

  // Add default templates
  for (const type of Object.keys(DEFAULT_TEMPLATES) as TemplateType[]) {
    templates.push(loadTemplate(type, { templateDir, useCustom: false }));
  }

  // Add custom templates if directory exists
  if (templateDir && fs.existsSync(templateDir)) {
    const files = fs.readdirSync(templateDir);

    for (const file of files) {
      if (file.endsWith('.template.md')) {
        const type = file.replace('.template.md', '') as TemplateType;
        const custom = loadCustomTemplate(type, templateDir);
        if (custom) {
          templates.push(custom);
        }
      }
    }
  }

  return templates;
}

/**
 * Initialize template directory with default templates
 */
export function initializeTemplates(templateDir: string): void {
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // Create README
  const readmePath = path.join(templateDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readme = [
      '# AgentScope Custom Templates',
      '',
      'This directory contains custom templates for documentation generation.',
      '',
      '## Available Templates',
      '',
      '| Template | Description | Variables |',
      '|----------|-------------|-----------|',
    ];

    for (const type of Object.keys(DEFAULT_TEMPLATES) as TemplateType[]) {
      const variables = getTemplateVariables(type);
      const varList = variables.map(v => `{${v.name}}`).join(', ');
      readme.push(`| ${type} | ${TEMPLATE_DESCRIPTIONS[type]} | ${varList} |`);
    }

    readme.push('');
    readme.push('## Creating Custom Templates');
    readme.push('');
    readme.push('1. Create a file named `{template-type}.template.md`');
    readme.push('2. Use `{variableName}` syntax for substitution variables');
    readme.push('3. Run `agentscope scan` to use your custom template');
    readme.push('');
    readme.push('## Example');
    readme.push('');
    readme.push('File: `adr.template.md`');
    readme.push('');
    readme.push('```markdown');
    readme.push('# {number}: {title}');
    readme.push('');
    readme.push('**Status**: {status}');
    readme.push('**Date**: {date}');
    readme.push('');
    readme.push('## Context');
    readme.push('');
    readme.push('<!-- Your custom ADR template -->');
    readme.push('```');

    fs.writeFileSync(readmePath, readme.join('\n'), 'utf-8');
  }

  // Create example templates
  for (const type of ['adr', 'context'] as TemplateType[]) {
    const examplePath = path.join(templateDir, `${type}.template.example.md`);
    if (!fs.existsSync(examplePath)) {
      const template = loadTemplate(type, { useCustom: false });
      fs.writeFileSync(examplePath, template.content, 'utf-8');
    }
  }
}

/**
 * Validate template variables
 */
export function validateTemplate(
  template: Template,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const variable of template.variables) {
    if (variable.required && !variables[variable.name]) {
      missing.push(variable.name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
