/**
 * Source Code Analysis Context - Repository interface
 */

import { PackageName } from '../shared/value-objects.js';
import { SourceAnalysis, SourceAnalysisId } from './entities.js';

/**
 * Repository interface for source analysis persistence
 */
export interface SourceAnalysisRepository {
  /**
   * Save a source analysis
   */
  save(analysis: SourceAnalysis): Promise<void>;

  /**
   * Find by ID
   */
  findById(id: SourceAnalysisId): Promise<SourceAnalysis | null>;

  /**
   * Find all analyses for a package
   */
  findByPackage(packageName: PackageName): Promise<SourceAnalysis[]>;

  /**
   * Delete a source analysis
   */
  delete(id: SourceAnalysisId): Promise<void>;

  /**
   * Find all analyses
   */
  findAll(): Promise<SourceAnalysis[]>;
}
