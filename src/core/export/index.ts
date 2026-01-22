/**
 * Export Module Index
 *
 * Re-exports all export-related functionality for configuration portability.
 */

// Path Transformer
export {
  // Types
  type PathType,
  type TransformResult,
  type PathTransformOptions,
  // Core functions
  detectPathType,
  toPortablePath,
  toPortablePathWithInfo,
  fromPortablePath,
  fromPortablePathWithInfo,
  // Batch operations
  toPortablePaths,
  fromPortablePaths,
  // Object transformation
  transformObjectPaths,
  restoreObjectPaths,
  // Utilities
  normalizeSeparators,
  isPathUnder,
  isPathKey,
  getPlatform,
  isValidPortablePath,
} from './path-transformer.js';

// Secrets Sanitizer
export {
  // Types
  type SanitizeResult,
  type SecretReference,
  type SecretType,
  type SanitizeStats,
  type SanitizeOptions,
  // Core functions
  sanitizeSecrets,
  generateSecretsDoc,
  // Detection utilities
  detectEnvReference,
  detectSecretTypeFromKey,
  detectSecretTypeFromValue,
  isSecretKey,
  isSecretValue,
  // Validation
  validateNoSecrets,
  getSecretPatterns,
} from './secrets-sanitizer.js';

// Exporter
export {
  // Types
  type ExportOptions,
  type ExportManifest,
  type EntityCounts,
  type ExportedFile,
  type McpBundle,
  type McpServerBundle,
  type ExportResult,
  // Core functions
  exportConfig,
  // Validation
  validateForExport,
  previewExport,
} from './exporter.js';
