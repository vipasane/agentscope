/**
 * Output Formatter Domain - Output Module
 * Exports all output formatting utilities
 */

export { DocumentBuilder } from './document-builder.js';
export {
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
} from './navigation.js';
export {
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
} from './legend.js';
export {
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
} from './relationship-summary.js';

// Section formatters for all 7 entity types
export {
  // Hook formatters
  formatHooksSection,
  // Command formatters
  formatCommandsSection,
  // Plugin formatters
  formatPluginsSection,
  // Permission formatters
  formatPermissionsSection,
  // Agent formatters (enhanced)
  formatAgentsComparisonTable,
  formatAgentsCapabilitiesMatrix,
  // MCP Server formatters (enhanced)
  formatMcpServersSection,
  // Skills formatters (enhanced)
  formatSkillsSection,
  // Quick stats formatter
  formatQuickStats,
  // Utility exports
  sanitize,
  truncate,
  escapeTableCell,
  getStatusIcon,
  formatTimeout,
  toAnchorId,
  // Types
  type FormatterOptions,
  type HookDisplayInfo,
  type QuickStatsInput,
} from './section-formatters.js';
