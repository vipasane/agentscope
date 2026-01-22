/**
 * Output Formatter Domain
 * Document building, navigation, legends, and relationship summaries
 *
 * Includes section formatters for all 7 entity types:
 * - Agents (comparison table, capabilities matrix)
 * - Skills (with category info)
 * - MCP Servers (with status and tools)
 * - Hooks (with matcher, type, and details)
 * - Commands (with tool permissions)
 * - Plugins (with marketplace and version)
 * - Permissions (with rule counts and details)
 */

// Core types
export type {
  DocumentContext,
  DocumentSection,
  LegendEntry,
  RelationshipSummary,
  NavigationItem,
  CategorizedAgents,
  DocumentBuilderOptions,
} from './types.js';

// Output utilities
export {
  // Document Builder
  DocumentBuilder,
  // Navigation utilities
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
  // Legend utilities
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
  // Relationship utilities
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
  // Section formatters for all 7 entity types
  formatHooksSection,
  formatCommandsSection,
  formatPluginsSection,
  formatPermissionsSection,
  formatAgentsComparisonTable,
  formatAgentsCapabilitiesMatrix,
  formatMcpServersSection,
  formatSkillsSection,
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
} from './output/index.js';
