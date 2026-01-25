/**
 * DevContainer Security Sanitizers
 *
 * Sanitization and remediation functions for DevContainer configurations.
 * Part of v1.2 DevContainer scanning security implementation.
 *
 * References:
 * - DESIGN-001: Security hooks integration
 * - ADR-009: Security model
 * - devcontainer-validators.ts: Validation layer
 */

import type { DevContainerConfig } from './devcontainer-validators.js';
import { sanitizeNodeLabel, sanitizePath } from './sanitizers.js';

/**
 * Sanitization result with applied fixes
 */
export interface SanitizationResult {
  sanitized: DevContainerConfig;
  changes: Array<{
    path: string;
    original: any;
    sanitized: any;
    reason: string;
  }>;
  removals: Array<{
    path: string;
    value: any;
    reason: string;
  }>;
}

/**
 * Redacts secrets from environment variables
 */
export function redactSecrets(config: DevContainerConfig): SanitizationResult {
  const changes: SanitizationResult['changes'] = [];
  const sanitized = { ...config };

  if (sanitized.containerEnv) {
    const newEnv: Record<string, string> = {};

    for (const [key, value] of Object.entries(sanitized.containerEnv)) {
      // Redact values that look like secrets
      if (value.length > 20 && /[a-zA-Z0-9+/=_-]{20,}/.test(value)) {
        newEnv[key] = '[REDACTED]';
        changes.push({
          path: `containerEnv.${key}`,
          original: value.slice(0, 10) + '...',
          sanitized: '[REDACTED]',
          reason: 'Potential secret detected'
        });
      } else {
        newEnv[key] = value;
      }
    }

    sanitized.containerEnv = newEnv;
  }

  return {
    sanitized,
    changes,
    removals: []
  };
}

/**
 * Removes dangerous runArgs flags
 */
export function removeDangerousRunArgs(config: DevContainerConfig): SanitizationResult {
  const removals: SanitizationResult['removals'] = [];
  const sanitized = { ...config };

  if (sanitized.runArgs) {
    const safeArgs: string[] = [];

    for (const arg of sanitized.runArgs) {
      // Block dangerous flags
      if (arg.includes('--privileged')) {
        removals.push({
          path: 'runArgs',
          value: arg,
          reason: 'Privileged mode is not allowed'
        });
        continue;
      }

      if (arg.includes('--cap-add=SYS_ADMIN')) {
        removals.push({
          path: 'runArgs',
          value: arg,
          reason: 'SYS_ADMIN capability is not allowed'
        });
        continue;
      }

      if (arg.includes('--security-opt') && arg.includes('unconfined')) {
        removals.push({
          path: 'runArgs',
          value: arg,
          reason: 'Unconfined security options are not allowed'
        });
        continue;
      }

      if (arg.includes('--pid=host') || arg.includes('--ipc=host') || arg.includes('--network=host')) {
        removals.push({
          path: 'runArgs',
          value: arg,
          reason: 'Host namespace access is not allowed'
        });
        continue;
      }

      safeArgs.push(arg);
    }

    sanitized.runArgs = safeArgs.length > 0 ? safeArgs : undefined;
  }

  return {
    sanitized,
    changes: [],
    removals
  };
}

/**
 * Validates and sanitizes mount paths
 */
export function sanitizeMounts(config: DevContainerConfig, allowedDirs: string[]): SanitizationResult {
  const removals: SanitizationResult['removals'] = [];
  const changes: SanitizationResult['changes'] = [];
  const sanitized = { ...config };

  if (sanitized.mounts) {
    const safeMounts = sanitized.mounts.filter((mount) => {
      // Block sensitive system paths
      const sensitivePaths = ['/etc', '/sys', '/proc', '/dev', '/var/run/docker.sock', '/root'];
      if (sensitivePaths.some(path => mount.source.startsWith(path))) {
        removals.push({
          path: 'mounts',
          value: mount,
          reason: `Mount source ${mount.source} targets sensitive system directory`
        });
        return false;
      }

      // Validate path
      const sanitizedPath = sanitizePath(mount.source, allowedDirs);
      if (!sanitizedPath) {
        removals.push({
          path: 'mounts',
          value: mount,
          reason: `Mount source ${mount.source} contains path traversal or is outside allowed directories`
        });
        return false;
      }

      // Update if sanitized path differs
      if (sanitizedPath !== mount.source) {
        changes.push({
          path: 'mounts',
          original: mount.source,
          sanitized: sanitizedPath,
          reason: 'Path normalized'
        });
        mount.source = sanitizedPath;
      }

      return true;
    });

    sanitized.mounts = safeMounts.length > 0 ? safeMounts : undefined;
  }

  return {
    sanitized,
    changes,
    removals
  };
}

/**
 * Sanitizes lifecycle commands
 */
export function sanitizeLifecycleCommands(config: DevContainerConfig): SanitizationResult {
  const changes: SanitizationResult['changes'] = [];
  const removals: SanitizationResult['removals'] = [];
  const sanitized = { ...config };

  // Dangerous command patterns
  const dangerousPatterns = [
    { pattern: /\bsudo\b/g, replacement: '', reason: 'sudo removed (privilege escalation)' },
    { pattern: /\bsu\s+/g, replacement: '', reason: 'su removed (privilege escalation)' },
    { pattern: /\|\s*sh\s*$/g, replacement: '', reason: 'Pipe to shell removed' },
    { pattern: /\|\s*bash\s*$/g, replacement: '', reason: 'Pipe to bash removed' },
    { pattern: /`[^`]+`/g, replacement: '', reason: 'Backtick execution removed' },
    { pattern: /\$\([^)]+\)/g, replacement: '', reason: 'Command substitution removed' }
  ];

  // Sanitize postCreateCommand
  if (sanitized.postCreateCommand) {
    let sanitizedCmd = sanitized.postCreateCommand;
    let modified = false;

    for (const { pattern, replacement, reason } of dangerousPatterns) {
      if (pattern.test(sanitizedCmd)) {
        sanitizedCmd = sanitizedCmd.replace(pattern, replacement);
        modified = true;
        changes.push({
          path: 'postCreateCommand',
          original: sanitized.postCreateCommand,
          sanitized: sanitizedCmd,
          reason
        });
      }
    }

    // Remove if completely empty after sanitization
    if (sanitizedCmd.trim() === '') {
      removals.push({
        path: 'postCreateCommand',
        value: sanitized.postCreateCommand,
        reason: 'Command was entirely dangerous patterns'
      });
      sanitized.postCreateCommand = undefined;
    } else if (modified) {
      sanitized.postCreateCommand = sanitizedCmd.trim();
    }
  }

  // Sanitize postStartCommand
  if (sanitized.postStartCommand) {
    let sanitizedCmd = sanitized.postStartCommand;
    let modified = false;

    for (const { pattern, replacement, reason } of dangerousPatterns) {
      if (pattern.test(sanitizedCmd)) {
        sanitizedCmd = sanitizedCmd.replace(pattern, replacement);
        modified = true;
        changes.push({
          path: 'postStartCommand',
          original: sanitized.postStartCommand,
          sanitized: sanitizedCmd,
          reason
        });
      }
    }

    if (sanitizedCmd.trim() === '') {
      removals.push({
        path: 'postStartCommand',
        value: sanitized.postStartCommand,
        reason: 'Command was entirely dangerous patterns'
      });
      sanitized.postStartCommand = undefined;
    } else if (modified) {
      sanitized.postStartCommand = sanitizedCmd.trim();
    }
  }

  return {
    sanitized,
    changes,
    removals
  };
}

/**
 * Removes blocked features
 */
export function removeBlockedFeatures(config: DevContainerConfig): SanitizationResult {
  const removals: SanitizationResult['removals'] = [];
  const sanitized = { ...config };

  const blockedFeatures = [
    'docker-outside-of-docker',
    'docker-from-docker',
    'sshd',
    'kubectl-helm-minikube'
  ];

  if (sanitized.features) {
    const safeFeatures: typeof sanitized.features = {};

    for (const [feature, options] of Object.entries(sanitized.features)) {
      const isBlocked = blockedFeatures.some(blocked => feature.includes(blocked));

      if (isBlocked) {
        removals.push({
          path: 'features',
          value: { [feature]: options },
          reason: `Feature ${feature} is blocked for security`
        });
      } else {
        safeFeatures[feature] = options;
      }
    }

    sanitized.features = Object.keys(safeFeatures).length > 0 ? safeFeatures : undefined;
  }

  return {
    sanitized,
    changes: [],
    removals
  };
}

/**
 * Full sanitization pipeline for DevContainer configuration
 */
export function sanitizeDevContainer(
  config: DevContainerConfig,
  allowedDirs: string[]
): SanitizationResult {
  let sanitized = { ...config };
  const allChanges: SanitizationResult['changes'] = [];
  const allRemovals: SanitizationResult['removals'] = [];

  // Step 1: Redact secrets
  const secretResult = redactSecrets(sanitized);
  sanitized = secretResult.sanitized;
  allChanges.push(...secretResult.changes);
  allRemovals.push(...secretResult.removals);

  // Step 2: Remove dangerous runArgs
  const runArgsResult = removeDangerousRunArgs(sanitized);
  sanitized = runArgsResult.sanitized;
  allChanges.push(...runArgsResult.changes);
  allRemovals.push(...runArgsResult.removals);

  // Step 3: Sanitize mounts
  const mountsResult = sanitizeMounts(sanitized, allowedDirs);
  sanitized = mountsResult.sanitized;
  allChanges.push(...mountsResult.changes);
  allRemovals.push(...mountsResult.removals);

  // Step 4: Sanitize lifecycle commands
  const commandsResult = sanitizeLifecycleCommands(sanitized);
  sanitized = commandsResult.sanitized;
  allChanges.push(...commandsResult.changes);
  allRemovals.push(...commandsResult.removals);

  // Step 5: Remove blocked features
  const featuresResult = removeBlockedFeatures(sanitized);
  sanitized = featuresResult.sanitized;
  allChanges.push(...featuresResult.changes);
  allRemovals.push(...featuresResult.removals);

  return {
    sanitized,
    changes: allChanges,
    removals: allRemovals
  };
}

/**
 * Generates a security report for the sanitization
 */
export function generateSanitizationReport(result: SanitizationResult): string {
  const lines: string[] = [];

  lines.push('# DevContainer Security Sanitization Report');
  lines.push('');

  if (result.changes.length === 0 && result.removals.length === 0) {
    lines.push('✅ No security issues found. Configuration is safe.');
    return lines.join('\n');
  }

  if (result.changes.length > 0) {
    lines.push('## Modified Values');
    lines.push('');
    for (const change of result.changes) {
      lines.push(`- **${change.path}**`);
      lines.push(`  - Original: \`${change.original}\``);
      lines.push(`  - Sanitized: \`${change.sanitized}\``);
      lines.push(`  - Reason: ${change.reason}`);
      lines.push('');
    }
  }

  if (result.removals.length > 0) {
    lines.push('## Removed Items');
    lines.push('');
    for (const removal of result.removals) {
      lines.push(`- **${removal.path}**`);
      lines.push(`  - Value: \`${JSON.stringify(removal.value)}\``);
      lines.push(`  - Reason: ${removal.reason}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
