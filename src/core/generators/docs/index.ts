/**
 * Documentation Generators Export Index
 * Phase 3 Implementation
 */

// ADR Generator
export {
  generateADRIndex,
  formatADRIndex,
  generateADRTemplate,
  type ADR,
  type ADRIndex,
  type ADRGeneratorOptions,
} from './adr-generator.js';

// CONTEXT.md Generator
export {
  generateContextMd,
  type ContextOptions,
} from './context-generator.js';

// Template System
export {
  loadTemplate,
  substituteVariables,
  saveCustomTemplate,
  listTemplates,
  initializeTemplates,
  validateTemplate,
  type Template,
  type TemplateType,
  type TemplateVariable,
  type TemplateOptions,
} from './template-system.js';

// Markdown Generator (existing)
export * from './markdown.js';
