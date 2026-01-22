/**
 * Secrets Sanitizer - Remove sensitive data from exports
 *
 * Provides utilities for detecting and removing secrets from configuration
 * exports to ensure sensitive data is never shared accidentally.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Result of secrets sanitization
 */
export interface SanitizeResult {
  /** The sanitized configuration object */
  sanitized: unknown;
  /** List of secret keys that were found and sanitized */
  secretsFound: SecretReference[];
  /** Summary statistics */
  stats: SanitizeStats;
}

/**
 * Reference to a found secret
 */
export interface SecretReference {
  /** The path to the secret in the config (dot notation) */
  path: string;
  /** The key name that contained the secret */
  key: string;
  /** The type of secret detected */
  type: SecretType;
  /** Whether it was an environment variable reference */
  isEnvRef: boolean;
  /** The placeholder used in the sanitized output */
  placeholder: string;
}

/**
 * Types of secrets that can be detected
 */
export type SecretType =
  | 'api-key'
  | 'secret'
  | 'password'
  | 'token'
  | 'credential'
  | 'auth'
  | 'private-key'
  | 'connection-string'
  | 'unknown';

/**
 * Statistics from sanitization process
 */
export interface SanitizeStats {
  /** Total keys processed */
  totalKeys: number;
  /** Number of secrets found */
  secretsFound: number;
  /** Number of env references found */
  envRefsFound: number;
  /** Number of values redacted */
  valuesRedacted: number;
}

/**
 * Options for sanitization
 */
export interface SanitizeOptions {
  /** Additional patterns to detect as secrets */
  additionalPatterns?: RegExp[];
  /** Keys to always treat as secrets */
  additionalSecretKeys?: string[];
  /** Keys to never treat as secrets (whitelist) */
  safeKeys?: string[];
  /** Custom placeholder format (default: {{SECRET_NAME}}) */
  placeholderFormat?: (key: string) => string;
  /** Whether to detect values that look like secrets */
  detectSecretValues?: boolean;
}

// ============================================================================
// Secret Detection Patterns
// ============================================================================

/**
 * Patterns that indicate a key contains secrets
 */
const SECRET_KEY_PATTERNS: Array<{ pattern: RegExp; type: SecretType }> = [
  { pattern: /api[_-]?key/i, type: 'api-key' },
  { pattern: /apikey/i, type: 'api-key' },
  { pattern: /secret/i, type: 'secret' },
  { pattern: /password/i, type: 'password' },
  { pattern: /passwd/i, type: 'password' },
  { pattern: /pwd/i, type: 'password' },
  { pattern: /token/i, type: 'token' },
  { pattern: /bearer/i, type: 'token' },
  { pattern: /credential/i, type: 'credential' },
  { pattern: /auth[_-]?key/i, type: 'auth' },
  { pattern: /authorization/i, type: 'auth' },
  { pattern: /private[_-]?key/i, type: 'private-key' },
  { pattern: /priv[_-]?key/i, type: 'private-key' },
  { pattern: /connection[_-]?string/i, type: 'connection-string' },
  { pattern: /conn[_-]?str/i, type: 'connection-string' },
  { pattern: /database[_-]?url/i, type: 'connection-string' },
  { pattern: /db[_-]?url/i, type: 'connection-string' },
  { pattern: /signing[_-]?key/i, type: 'private-key' },
  { pattern: /encryption[_-]?key/i, type: 'private-key' },
  { pattern: /access[_-]?key/i, type: 'api-key' },
  { pattern: /client[_-]?secret/i, type: 'secret' },
  { pattern: /app[_-]?secret/i, type: 'secret' },
];

/**
 * Patterns that indicate a value is a secret (e.g., API key formats)
 */
const SECRET_VALUE_PATTERNS: Array<{ pattern: RegExp; type: SecretType }> = [
  // Anthropic API keys
  { pattern: /^sk-ant-[a-zA-Z0-9_-]+$/i, type: 'api-key' },
  // OpenAI API keys
  { pattern: /^sk-[a-zA-Z0-9_-]{20,}$/i, type: 'api-key' },
  // Generic long API keys
  { pattern: /^[a-zA-Z0-9_-]{32,}$/i, type: 'api-key' },
  // Bearer tokens
  { pattern: /^Bearer\s+[a-zA-Z0-9._-]+$/i, type: 'token' },
  // Basic auth
  { pattern: /^Basic\s+[a-zA-Z0-9+/=]+$/i, type: 'auth' },
  // JWT tokens
  { pattern: /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/i, type: 'token' },
  // AWS keys
  { pattern: /^AKIA[0-9A-Z]{16}$/i, type: 'api-key' },
  // GitHub tokens
  { pattern: /^gh[ps]_[a-zA-Z0-9]{36}$/i, type: 'token' },
  { pattern: /^github_pat_[a-zA-Z0-9_]{22,}$/i, type: 'token' },
  // Private keys
  { pattern: /^-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i, type: 'private-key' },
  // Connection strings with credentials
  { pattern: /^(mongodb|mysql|postgres|redis):\/\/[^:]+:[^@]+@/i, type: 'connection-string' },
];

/**
 * Pattern for environment variable references
 */
const ENV_REF_PATTERNS = [
  /^\$\{([A-Z_][A-Z0-9_]*)\}$/i,  // ${VAR_NAME}
  /^\$([A-Z_][A-Z0-9_]*)$/i,      // $VAR_NAME
  /^%([A-Z_][A-Z0-9_]*)%$/i,      // %VAR_NAME% (Windows)
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Sanitizes a configuration object by removing secret values
 *
 * @param config - The configuration object to sanitize
 * @param options - Optional sanitization options
 * @returns Sanitization result with sanitized config and found secrets
 *
 * @example
 * ```typescript
 * const result = sanitizeSecrets({
 *   name: 'my-app',
 *   apiKey: 'sk-ant-xxx',
 *   env: { DATABASE_URL: 'postgres://user:pass@localhost/db' }
 * });
 *
 * // result.sanitized = {
 * //   name: 'my-app',
 * //   apiKey: '{{API_KEY}}',
 * //   env: { DATABASE_URL: '{{DATABASE_URL}}' }
 * // }
 * // result.secretsFound = [{ key: 'apiKey', type: 'api-key', ... }, ...]
 * ```
 */
export function sanitizeSecrets(
  config: unknown,
  options: SanitizeOptions = {}
): SanitizeResult {
  const {
    additionalPatterns = [],
    additionalSecretKeys = [],
    safeKeys = [],
    placeholderFormat = defaultPlaceholderFormat,
    detectSecretValues = true,
  } = options;

  const secretsFound: SecretReference[] = [];
  const stats: SanitizeStats = {
    totalKeys: 0,
    secretsFound: 0,
    envRefsFound: 0,
    valuesRedacted: 0,
  };

  // Combine patterns
  const allKeyPatterns = [
    ...SECRET_KEY_PATTERNS,
    ...additionalPatterns.map(p => ({ pattern: p, type: 'unknown' as SecretType })),
  ];

  const safeKeySet = new Set(safeKeys.map(k => k.toLowerCase()));
  const additionalSecretKeySet = new Set(additionalSecretKeys.map(k => k.toLowerCase()));

  // Recursive sanitization function
  function sanitizeValue(value: unknown, path: string, key: string): unknown {
    stats.totalKeys++;

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        sanitizeValue(item, `${path}[${index}]`, key)
      );
    }

    // Handle objects
    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        const newPath = path ? `${path}.${k}` : k;
        result[k] = sanitizeValue(v, newPath, k);
      }
      return result;
    }

    // Handle string values
    if (typeof value === 'string') {
      const lowerKey = key.toLowerCase();

      // Check if key is in safe list
      if (safeKeySet.has(lowerKey)) {
        return value;
      }

      // Check for environment variable reference
      const envRef = detectEnvReference(value);
      if (envRef) {
        stats.envRefsFound++;
        const placeholder = placeholderFormat(envRef);
        secretsFound.push({
          path,
          key,
          type: detectSecretTypeFromKey(key, allKeyPatterns, additionalSecretKeySet) || 'unknown',
          isEnvRef: true,
          placeholder,
        });
        stats.valuesRedacted++;
        return placeholder;
      }

      // Check if key indicates a secret
      const secretType = detectSecretTypeFromKey(key, allKeyPatterns, additionalSecretKeySet);
      if (secretType) {
        stats.secretsFound++;
        const placeholder = placeholderFormat(keyToPlaceholderName(key));
        secretsFound.push({
          path,
          key,
          type: secretType,
          isEnvRef: false,
          placeholder,
        });
        stats.valuesRedacted++;
        return placeholder;
      }

      // Check if value looks like a secret
      if (detectSecretValues && value.length > 10) {
        const valueSecretType = detectSecretTypeFromValue(value);
        if (valueSecretType) {
          stats.secretsFound++;
          const placeholder = placeholderFormat(keyToPlaceholderName(key));
          secretsFound.push({
            path,
            key,
            type: valueSecretType,
            isEnvRef: false,
            placeholder,
          });
          stats.valuesRedacted++;
          return placeholder;
        }
      }

      return value;
    }

    // Return other types as-is (number, boolean, etc.)
    return value;
  }

  const sanitized = sanitizeValue(config, '', '');

  return {
    sanitized,
    secretsFound,
    stats,
  };
}

// ============================================================================
// Documentation Generation
// ============================================================================

/**
 * Generates a SECRETS.md template documenting required secrets
 *
 * @param secretsFound - Array of secret references found during sanitization
 * @param projectName - Optional project name for the header
 * @returns Markdown content for SECRETS.md
 *
 * @example
 * ```typescript
 * const secretsDoc = generateSecretsDoc(result.secretsFound, 'My Project');
 * // Returns markdown with instructions for setting up secrets
 * ```
 */
export function generateSecretsDoc(
  secretsFound: SecretReference[],
  projectName?: string
): string {
  const title = projectName
    ? `# ${projectName} - Required Secrets`
    : '# Required Secrets';

  // Group secrets by type
  const byType = new Map<SecretType, SecretReference[]>();
  for (const secret of secretsFound) {
    const existing = byType.get(secret.type) || [];
    existing.push(secret);
    byType.set(secret.type, existing);
  }

  // Deduplicate by placeholder
  const uniqueSecrets = new Map<string, SecretReference>();
  for (const secret of secretsFound) {
    if (!uniqueSecrets.has(secret.placeholder)) {
      uniqueSecrets.set(secret.placeholder, secret);
    }
  }

  const lines: string[] = [
    title,
    '',
    'This document lists the secrets required to run this configuration.',
    'These secrets were removed during export to protect sensitive data.',
    '',
    '## Setup Instructions',
    '',
    '1. Copy this file to `.env` or your secrets manager',
    '2. Replace placeholders with actual values',
    '3. Never commit actual secrets to version control',
    '',
    '## Required Secrets',
    '',
  ];

  // Add table header
  lines.push('| Placeholder | Type | Location | Description |');
  lines.push('|-------------|------|----------|-------------|');

  // Add each unique secret
  for (const [placeholder, secret] of Array.from(uniqueSecrets.entries())) {
    const typeLabel = formatSecretType(secret.type);
    const location = secret.isEnvRef ? 'Environment Variable' : `Config: \`${secret.path}\``;
    const description = getSecretDescription(secret.type);
    lines.push(`| \`${placeholder}\` | ${typeLabel} | ${location} | ${description} |`);
  }

  lines.push('');
  lines.push('## Environment Variable Template');
  lines.push('');
  lines.push('```bash');
  lines.push('# Copy to .env file');

  for (const [placeholder, secret] of Array.from(uniqueSecrets.entries())) {
    const envName = placeholder.replace(/^\{\{|\}\}$/g, '');
    const comment = getSecretDescription(secret.type);
    lines.push(`# ${comment}`);
    lines.push(`${envName}=`);
    lines.push('');
  }

  lines.push('```');
  lines.push('');
  lines.push('## Security Notes');
  lines.push('');
  lines.push('- Never commit `.env` files or secret values to Git');
  lines.push('- Use a secrets manager for production environments');
  lines.push('- Rotate secrets regularly');
  lines.push('- Use environment-specific secrets (dev/staging/prod)');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// Detection Utilities
// ============================================================================

/**
 * Detects if a value is an environment variable reference
 *
 * @param value - The string value to check
 * @returns The env var name if it's a reference, null otherwise
 */
export function detectEnvReference(value: string): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  for (const pattern of ENV_REF_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Detects the type of secret from a key name
 *
 * @param key - The key name to analyze
 * @param patterns - Patterns to match against
 * @param additionalKeys - Additional keys to treat as secrets
 * @returns The detected secret type or null
 */
export function detectSecretTypeFromKey(
  key: string,
  patterns: Array<{ pattern: RegExp; type: SecretType }> = SECRET_KEY_PATTERNS,
  additionalKeys: Set<string> = new Set()
): SecretType | null {
  if (!key || typeof key !== 'string') {
    return null;
  }

  const lowerKey = key.toLowerCase();

  // Check additional keys first
  if (additionalKeys.has(lowerKey)) {
    return 'unknown';
  }

  // Check patterns
  for (const { pattern, type } of patterns) {
    if (pattern.test(key)) {
      return type;
    }
  }

  return null;
}

/**
 * Detects the type of secret from a value
 *
 * @param value - The value to analyze
 * @returns The detected secret type or null
 */
export function detectSecretTypeFromValue(value: string): SecretType | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  for (const { pattern, type } of SECRET_VALUE_PATTERNS) {
    if (pattern.test(value)) {
      return type;
    }
  }

  return null;
}

/**
 * Checks if a key is likely a secret key
 *
 * @param key - The key name to check
 * @returns True if the key likely contains a secret
 */
export function isSecretKey(key: string): boolean {
  return detectSecretTypeFromKey(key) !== null;
}

/**
 * Checks if a value looks like a secret
 *
 * @param value - The value to check
 * @returns True if the value looks like a secret
 */
export function isSecretValue(value: string): boolean {
  return detectSecretTypeFromValue(value) !== null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Default placeholder format
 */
function defaultPlaceholderFormat(name: string): string {
  return `{{${name}}}`;
}

/**
 * Converts a key name to a placeholder name (SCREAMING_SNAKE_CASE)
 */
function keyToPlaceholderName(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase to snake_case
    .replace(/[-\s]/g, '_') // dashes and spaces to underscores
    .toUpperCase();
}

/**
 * Formats a secret type for display
 */
function formatSecretType(type: SecretType): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gets a description for a secret type
 */
function getSecretDescription(type: SecretType): string {
  const descriptions: Record<SecretType, string> = {
    'api-key': 'API key for service authentication',
    'secret': 'Secret value',
    'password': 'Password credential',
    'token': 'Authentication token',
    'credential': 'Credential for authentication',
    'auth': 'Authentication value',
    'private-key': 'Private key for encryption/signing',
    'connection-string': 'Database/service connection string',
    'unknown': 'Sensitive value',
  };

  return descriptions[type] || 'Sensitive value';
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that a sanitized config has no remaining secrets
 *
 * @param config - The sanitized configuration to validate
 * @returns True if no secrets are found, array of found secrets otherwise
 */
export function validateNoSecrets(
  config: unknown
): true | SecretReference[] {
  const result = sanitizeSecrets(config, { detectSecretValues: true });

  // Filter out placeholder values (these are expected)
  const actualSecrets = result.secretsFound.filter(
    secret => !secret.placeholder.startsWith('{{') || !secret.placeholder.endsWith('}}')
  );

  if (actualSecrets.length === 0) {
    return true;
  }

  return actualSecrets;
}

/**
 * Gets all secret patterns for external use
 *
 * @returns Object containing key and value patterns
 */
export function getSecretPatterns(): {
  keyPatterns: Array<{ pattern: RegExp; type: SecretType }>;
  valuePatterns: Array<{ pattern: RegExp; type: SecretType }>;
} {
  return {
    keyPatterns: [...SECRET_KEY_PATTERNS],
    valuePatterns: [...SECRET_VALUE_PATTERNS],
  };
}
