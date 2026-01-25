/**
 * Tests for Template Customization System
 * Phase 3 Implementation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadTemplate,
  substituteVariables,
  saveCustomTemplate,
  listTemplates,
  initializeTemplates,
  validateTemplate,
  type Template,
  type TemplateType,
} from '../../src/core/generators/docs/template-system.js';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentscope-test-'));
});

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// ============================================================================
// Template Loading Tests
// ============================================================================

describe('loadTemplate', () => {
  it('should load default template', () => {
    const template = loadTemplate('adr', { useCustom: false });

    expect(template.type).toBe('adr');
    expect(template.name).toBe('adr');
    expect(template.description).toBeDefined();
    expect(template.content).toBeDefined();
    expect(template.variables).toBeDefined();
  });

  it('should load custom template when available', () => {
    const templateDir = path.join(testDir, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });

    const customContent = '# {number}: {title}\n\nCustom template';
    fs.writeFileSync(
      path.join(templateDir, 'adr.template.md'),
      customContent,
      'utf-8'
    );

    const template = loadTemplate('adr', { templateDir, useCustom: true });

    expect(template.content).toBe(customContent);
    expect(template.name).toContain('custom');
  });

  it('should fall back to default when custom not found', () => {
    const templateDir = path.join(testDir, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });

    const template = loadTemplate('adr', { templateDir, useCustom: true });

    expect(template.type).toBe('adr');
    expect(template.name).toBe('adr');
  });

  it('should extract variables from template', () => {
    const template = loadTemplate('adr', { useCustom: false });

    expect(template.variables.length).toBeGreaterThan(0);

    const varNames = template.variables.map(v => v.name);
    expect(varNames).toContain('number');
    expect(varNames).toContain('title');
  });

  it('should load all template types', () => {
    const types: TemplateType[] = [
      'adr',
      'context',
      'readme',
      'component-map',
      'hierarchy',
      'dataflow',
      'category',
    ];

    for (const type of types) {
      const template = loadTemplate(type);
      expect(template.type).toBe(type);
    }
  });
});

// ============================================================================
// Variable Substitution Tests
// ============================================================================

describe('substituteVariables', () => {
  it('should substitute variables in content', () => {
    const content = 'Hello {name}, welcome to {place}';
    const variables = {
      name: 'Alice',
      place: 'Wonderland',
    };

    const result = substituteVariables(content, variables);

    expect(result).toBe('Hello Alice, welcome to Wonderland');
  });

  it('should handle multiple occurrences of same variable', () => {
    const content = '{name} said "{name}"';
    const variables = { name: 'Alice' };

    const result = substituteVariables(content, variables);

    expect(result).toBe('Alice said "Alice"');
  });

  it('should handle variables with descriptions', () => {
    const content = '{name:Your name} is {age:Your age}';
    const variables = {
      name: 'Alice',
      age: '25',
    };

    const result = substituteVariables(content, variables);

    expect(result).toBe('Alice is 25');
  });

  it('should remove unsubstituted optional variables', () => {
    const content = 'Required: {name}, Optional: {age:N/A}';
    const variables = { name: 'Alice' };

    const result = substituteVariables(content, variables);

    expect(result).toBe('Required: Alice, Optional: N/A');
  });

  it('should handle empty variable values', () => {
    const content = 'Name: {name}';
    const variables = { name: '' };

    const result = substituteVariables(content, variables);

    expect(result).toBe('Name: ');
  });
});

// ============================================================================
// Template Saving Tests
// ============================================================================

describe('saveCustomTemplate', () => {
  it('should save template to directory', () => {
    const templateDir = path.join(testDir, 'templates');
    const template: Template = {
      type: 'adr',
      name: 'Custom ADR',
      description: 'Custom template',
      content: '# Custom {title}',
      variables: [],
    };

    saveCustomTemplate(template, templateDir);

    const savedPath = path.join(templateDir, 'adr.template.md');
    expect(fs.existsSync(savedPath)).toBe(true);

    const saved = fs.readFileSync(savedPath, 'utf-8');
    expect(saved).toBe(template.content);
  });

  it('should create directory if not exists', () => {
    const templateDir = path.join(testDir, 'new', 'templates');
    const template: Template = {
      type: 'adr',
      name: 'ADR',
      description: 'Template',
      content: '# Test',
      variables: [],
    };

    saveCustomTemplate(template, templateDir);

    expect(fs.existsSync(templateDir)).toBe(true);
  });
});

// ============================================================================
// Template Listing Tests
// ============================================================================

describe('listTemplates', () => {
  it('should list default templates', () => {
    const templates = listTemplates();

    expect(templates.length).toBeGreaterThan(0);

    const types = templates.map(t => t.type);
    expect(types).toContain('adr');
    expect(types).toContain('context');
    expect(types).toContain('readme');
  });

  it('should list custom templates when available', () => {
    const templateDir = path.join(testDir, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });

    fs.writeFileSync(
      path.join(templateDir, 'adr.template.md'),
      '# Custom ADR',
      'utf-8'
    );

    const templates = listTemplates(templateDir);

    const customTemplates = templates.filter(t => t.name.includes('custom'));
    expect(customTemplates.length).toBeGreaterThan(0);
  });

  it('should handle non-existent template directory', () => {
    const templates = listTemplates('/non/existent/path');

    expect(templates.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Template Initialization Tests
// ============================================================================

describe('initializeTemplates', () => {
  it('should create template directory', () => {
    const templateDir = path.join(testDir, 'templates');

    initializeTemplates(templateDir);

    expect(fs.existsSync(templateDir)).toBe(true);
  });

  it('should create README.md', () => {
    const templateDir = path.join(testDir, 'templates');

    initializeTemplates(templateDir);

    const readmePath = path.join(templateDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readme = fs.readFileSync(readmePath, 'utf-8');
    expect(readme).toContain('# AgentScope Custom Templates');
  });

  it('should create example templates', () => {
    const templateDir = path.join(testDir, 'templates');

    initializeTemplates(templateDir);

    expect(fs.existsSync(path.join(templateDir, 'adr.template.example.md'))).toBe(true);
    expect(fs.existsSync(path.join(templateDir, 'context.template.example.md'))).toBe(true);
  });

  it('should not overwrite existing README', () => {
    const templateDir = path.join(testDir, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });

    const existingContent = '# Existing README';
    fs.writeFileSync(path.join(templateDir, 'README.md'), existingContent, 'utf-8');

    initializeTemplates(templateDir);

    const readme = fs.readFileSync(path.join(templateDir, 'README.md'), 'utf-8');
    expect(readme).toBe(existingContent);
  });
});

// ============================================================================
// Template Validation Tests
// ============================================================================

describe('validateTemplate', () => {
  it('should validate template with all required variables', () => {
    const template: Template = {
      type: 'adr',
      name: 'ADR',
      description: 'Template',
      content: '# {number}: {title}',
      variables: [
        { name: 'number', description: 'ADR number', required: true },
        { name: 'title', description: 'Title', required: true },
      ],
    };

    const variables = {
      number: 'ADR-001',
      title: 'Test Decision',
    };

    const result = validateTemplate(template, variables);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should fail validation with missing required variables', () => {
    const template: Template = {
      type: 'adr',
      name: 'ADR',
      description: 'Template',
      content: '# {number}: {title}',
      variables: [
        { name: 'number', description: 'ADR number', required: true },
        { name: 'title', description: 'Title', required: true },
      ],
    };

    const variables = {
      number: 'ADR-001',
    };

    const result = validateTemplate(template, variables);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('title');
  });

  it('should pass validation with missing optional variables', () => {
    const template: Template = {
      type: 'adr',
      name: 'ADR',
      description: 'Template',
      content: '# {number}: {title}',
      variables: [
        { name: 'number', description: 'ADR number', required: true },
        { name: 'title', description: 'Title', required: false },
      ],
    };

    const variables = {
      number: 'ADR-001',
    };

    const result = validateTemplate(template, variables);

    expect(result.valid).toBe(true);
  });

  it('should return all missing variables', () => {
    const template: Template = {
      type: 'adr',
      name: 'ADR',
      description: 'Template',
      content: '# {number}: {title} by {author}',
      variables: [
        { name: 'number', description: 'ADR number', required: true },
        { name: 'title', description: 'Title', required: true },
        { name: 'author', description: 'Author', required: true },
      ],
    };

    const variables = {
      number: 'ADR-001',
    };

    const result = validateTemplate(template, variables);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('title');
    expect(result.missing).toContain('author');
  });
});
