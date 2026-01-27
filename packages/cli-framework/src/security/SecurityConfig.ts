/**
 * Security configuration for CLI framework
 *
 * Provides configuration options for security middleware including input validation,
 * path security, secret detection, and AI-based threat detection.
 *
 * @module security/SecurityConfig
 */

/**
 * Security configuration options
 *
 * @example
 * ```typescript
 * const config: SecurityConfig = {
 *   inputValidation: {
 *     enabled: true,
 *     strictMode: true
 *   },
 *   pathValidation: {
 *     enabled: true,
 *     allowedPaths: [process.cwd(), '~/.claude'],
 *     deniedPaths: ['/etc', '/sys', '/usr']
 *   },
 *   secretDetection: {
 *     enabled: true,
 *     entropyThreshold: 4.5,
 *     patterns: []
 *   },
 *   aidefence: {
 *     enabled: false
 *   },
 *   errorHandling: {
 *     throwOnFailure: true,
 *     logLevel: 'warn'
 *   }
 * };
 * ```
 */
export interface SecurityConfig {
  /**
   * Input validation settings
   */
  inputValidation: {
    /** Enable input validation (default: true) */
    enabled: boolean;
    /** Use strict allowlist validation (default: true) */
    strictMode: boolean;
  };

  /**
   * Path validation settings
   */
  pathValidation: {
    /** Enable path validation (default: true) */
    enabled: boolean;
    /** Allowed base paths (default: [process.cwd(), '~/.claude']) */
    allowedPaths: string[];
    /** Denied paths (default: ['/etc', '/sys', '/usr']) */
    deniedPaths: string[];
  };

  /**
   * Secret detection settings
   */
  secretDetection: {
    /** Enable secret detection (default: true) */
    enabled: boolean;
    /** Shannon entropy threshold (default: 4.5) */
    entropyThreshold: number;
    /** Custom regex patterns for secret detection */
    patterns: string[];
  };

  /**
   * AIDefence integration settings
   */
  aidefence: {
    /** Enable AIDefence scanning (default: false) */
    enabled: boolean;
    /** AIDefence API endpoint */
    endpoint?: string;
    /** AIDefence API key */
    apiKey?: string;
  };

  /**
   * Error handling settings
   */
  errorHandling: {
    /** Throw error on validation failure (default: true) */
    throwOnFailure: boolean;
    /** Log level for security events (default: 'warn') */
    logLevel: 'error' | 'warn' | 'info';
  };
}

/**
 * Default security configuration (secure-by-default)
 *
 * Following review decision Q7: Secure-by-default with strict validation
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  inputValidation: {
    enabled: true,
    strictMode: true,
  },
  pathValidation: {
    enabled: true,
    allowedPaths: [process.cwd(), '~/.claude'],
    deniedPaths: ['/etc', '/sys', '/usr', '/bin', '/sbin', '/boot'],
  },
  secretDetection: {
    enabled: true,
    entropyThreshold: 4.5, // Industry standard (review Q4)
    patterns: [],
  },
  aidefence: {
    enabled: false, // Off by default (review Q5)
  },
  errorHandling: {
    throwOnFailure: true, // Secure-by-default (review Q6)
    logLevel: 'warn',
  },
};
