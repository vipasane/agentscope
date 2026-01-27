/**
 * Security module exports
 *
 * @module security
 */

export { CommandSecurityMiddleware } from './SecurityMiddleware.js';
export { SecurityError } from './types.js';
export { DEFAULT_SECURITY_CONFIG } from './SecurityConfig.js';

export type { SecurityConfig } from './SecurityConfig.js';
export type {
  SecurityMiddleware,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ThreatDetection,
} from './types.js';
