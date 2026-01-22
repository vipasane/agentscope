/**
 * Output Formatter Domain
 * Document building, navigation, legends, and relationship summaries
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
  DocumentBuilder,
  generateNavLinks,
  generateCategoryTable,
  generateTableOfContents,
  buildNavigationFromAgents,
  generateBreadcrumbs,
  standardLegend,
  mermaidLegend,
  generateLegendTable,
  generateCompactLegend,
  filterLegendByCategory,
  getLegendForDiagram,
  calculateRelationships,
  generateRelationshipTable,
  getDelegationChains,
  generateDelegationChainList,
  getToolUsageByType,
  generateToolUsageSummary,
  findCircularDelegations,
} from './output/index.js';
