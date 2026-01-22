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
