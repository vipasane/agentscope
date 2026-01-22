/**
 * Output Formatter Domain - Core Types
 * Interfaces for document building, navigation, and formatting
 */

import type { AgentScopeConfig } from '../model/types.js';

/**
 * Document context for formatting operations
 */
export interface DocumentContext {
  /** Full agent scope configuration */
  config: AgentScopeConfig;
  /** Output directory for generated files */
  outputDir: string;
  /** Current file being generated */
  currentFile: string;
  /** Related files with their paths (for cross-references) */
  relatedFiles: Map<string, string>;
}

/**
 * A section in a generated document
 */
export interface DocumentSection {
  /** Unique section identifier */
  id: string;
  /** Section title (displayed as heading) */
  title: string;
  /** Section content (markdown) */
  content: string;
  /** Optional anchor for linking */
  anchor?: string;
  /** Section level (1-6, maps to h1-h6) */
  level?: number;
}

/**
 * Legend entry for diagram symbols
 */
export interface LegendEntry {
  /** Symbol character(s) used in diagram */
  symbol: string;
  /** Human-readable meaning */
  meaning: string;
  /** Category for grouping */
  category: 'agent' | 'server' | 'connection' | 'other';
}

/**
 * Summary of relationships in the configuration
 */
export interface RelationshipSummary {
  /** Agent delegation relationships */
  delegations: {
    count: number;
    example: string;
  };
  /** Tool usage relationships */
  toolUsages: {
    count: number;
    example: string;
  };
  /** Skill usage relationships */
  skillUsages: {
    count: number;
    example: string;
  };
}

/**
 * Navigation item for table of contents
 */
export interface NavigationItem {
  /** Display label */
  label: string;
  /** Anchor link (without #) */
  anchor: string;
  /** Nesting level (0 = top level) */
  level: number;
  /** Optional sub-items */
  children?: NavigationItem[];
}

/**
 * Categorized agents for category navigation
 */
export interface CategorizedAgents {
  /** Category name */
  category: string;
  /** Agent count in this category */
  count: number;
  /** Link to category section */
  sectionLink: string;
  /** Link to detailed page */
  detailsLink?: string;
}

/**
 * Options for document building
 */
export interface DocumentBuilderOptions {
  /** Include navigation links */
  includeNavigation?: boolean;
  /** Include timestamps */
  includeTimestamp?: boolean;
  /** Custom CSS classes for markdown */
  cssClasses?: Record<string, string>;
}
