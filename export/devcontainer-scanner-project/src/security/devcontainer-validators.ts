/**
 * DevContainer Security Validators
 *
 * Zod schemas and validation functions for DevContainer configuration security.
 * Part of v1.2 DevContainer scanning security implementation.
 *
 * Security layers:
 * 1. Input validation (Zod schemas)
 * 2. DREAD risk analysis
 * 3. Secrets detection
 * 4. Path traversal prevention
 * 5. Container escape vulnerability checks
 *
 * References:
 * - DESIGN-001: Security hooks integration
 * - ADR-009: Security model
 * - @claude-flow/security: Input validation
 */

import { z } from 'zod';
import { detectInjectionPatterns, sanitizePath } from './sanitizers.js';

/**
 * Maximum allowed values for resource limits
 */
const MAX_PORTS = 20;
const MAX_FEATURES = 15;
const MAX_EXTENSIONS = 30;
const MAX_ENV_VARS = 50;
const MAX_MOUNTS = 10;

/**
 * Allowed base images (allowlist approach)
 * Only official Microsoft DevContainer images
 */
const ALLOWED_BASE_IMAGES = [
  /^mcr\.microsoft\.com\/devcontainers\/base:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/typescript-node:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/javascript-node:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/python:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/go:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/rust:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/java:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/dotnet:.+$/,
  /^mcr\.microsoft\.com\/devcontainers\/universal:.+$/
] as const;

/**
 * Blocked features that pose security risks
 */
const BLOCKED_FEATURES = [
  'docker-outside-of-docker', // Host Docker access
  'docker-from-docker',       // Host Docker access
  'sshd',                     // SSH daemon
  'kubectl-helm-minikube'     // Kubernetes access
] as const;

/**
 * Zod schema for DevContainer features
 */
const FeatureSchema = z.record(
  z.string().regex(/^ghcr\.io\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+:\d+$/),
  z.record(z.union([z.string(), z.boolean(), z.number()]))
);

/**
 * Zod schema for environment variables (strict validation)
 */
const EnvVarSchema = z.record(
  z.string()
    .min(1)
    .max(100)
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Environment variable names must be uppercase with underscores'),
  z.string()
    .max(1000)
    .refine(
      (val) => !detectInjectionPatterns(val),
      { message: 'Environment variable contains injection patterns' }
    )
    .refine(
      (val) => !containsSecrets(val),
      { message: 'Environment variable contains potential secrets' }
    )
);

/**
 * Zod schema for port forwarding
 */
const PortSchema = z.union([
  z.number().int().min(1).max(65535),
  z.array(z.number().int().min(1).max(65535)).max(MAX_PORTS)
]);

/**
 * Zod schema for mounts (path traversal prevention)
 */
const MountSchema = z.object({
  source: z.string()
    .refine(
      (path) => !path.includes('..'),
      { message: 'Mount source contains path traversal' }
    )
    .refine(
      (path) => !path.startsWith('/etc') && !path.startsWith('/sys') && !path.startsWith('/proc'),
      { message: 'Mount source targets sensitive system directories' }
    ),
  target: z.string(),
  type: z.enum(['bind', 'volume']).optional()
});

/**
 * Zod schema for runArgs (container runtime arguments)
 */
const RunArgsSchema = z.array(
  z.string()
    .refine(
      (arg) => !arg.includes('--privileged'),
      { message: 'Privileged containers are not allowed' }
    )
    .refine(
      (arg) => !arg.includes('--cap-add=SYS_ADMIN'),
      { message: 'SYS_ADMIN capability is not allowed' }
    )
    .refine(
      (arg) => !arg.includes('--security-opt=apparmor=unconfined'),
      { message: 'Unconfined AppArmor is not allowed' }
    )
    .refine(
      (arg) => !arg.includes('--security-opt=seccomp=unconfined'),
      { message: 'Unconfined seccomp is not allowed' }
    )
);

/**
 * Main DevContainer configuration schema
 */
export const DevContainerSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .refine(
      (name) => !detectInjectionPatterns(name),
      { message: 'Container name contains injection patterns' }
    ),

  image: z.string()
    .refine(
      (img) => ALLOWED_BASE_IMAGES.some(pattern => pattern.test(img)),
      { message: 'Image is not from allowed base images list' }
    )
    .optional(),

  dockerFile: z.string()
    .refine(
      (path) => !path.includes('..'),
      { message: 'Dockerfile path contains path traversal' }
    )
    .optional(),

  features: FeatureSchema
    .refine(
      (features) => Object.keys(features).length <= MAX_FEATURES,
      { message: `Maximum ${MAX_FEATURES} features allowed` }
    )
    .refine(
      (features) => !Object.keys(features).some(f => BLOCKED_FEATURES.some(blocked => f.includes(blocked))),
      { message: 'Configuration contains blocked features' }
    )
    .optional(),

  customizations: z.object({
    vscode: z.object({
      extensions: z.array(z.string()).max(MAX_EXTENSIONS).optional(),
      settings: z.record(z.any()).optional()
    }).optional()
  }).optional(),

  forwardPorts: PortSchema.optional(),

  containerEnv: EnvVarSchema
    .refine(
      (env) => Object.keys(env).length <= MAX_ENV_VARS,
      { message: `Maximum ${MAX_ENV_VARS} environment variables allowed` }
    )
    .optional(),

  mounts: z.array(MountSchema)
    .max(MAX_MOUNTS)
    .optional(),

  runArgs: RunArgsSchema.optional(),

  postCreateCommand: z.string()
    .max(500)
    .refine(
      (cmd) => !containsDangerousCommands(cmd),
      { message: 'Post-create command contains dangerous patterns' }
    )
    .optional(),

  postStartCommand: z.string()
    .max(500)
    .refine(
      (cmd) => !containsDangerousCommands(cmd),
      { message: 'Post-start command contains dangerous patterns' }
    )
    .optional()
}).strict();

/**
 * Type inferred from schema
 */
export type DevContainerConfig = z.infer<typeof DevContainerSchema>;

/**
 * DREAD risk scores
 */
export interface DREADScore {
  damage: number;          // 0-10: How bad is the impact?
  reproducibility: number; // 0-10: How easy to reproduce?
  exploitability: number;  // 0-10: How easy to exploit?
  affectedUsers: number;   // 0-10: How many users affected?
  discoverability: number; // 0-10: How easy to discover?
  totalRisk: number;       // Average score
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Container escape vulnerability indicators
 */
export interface ContainerEscapeRisk {
  privileged: boolean;           // --privileged flag
  hostNetworking: boolean;       // --network=host
  hostPID: boolean;              // --pid=host
  hostIPC: boolean;              // --ipc=host
  capabilitiesAdded: string[];   // Added capabilities
  securityOptDisabled: string[]; // Disabled security options
  sensitiveMounts: string[];     // Mounts to sensitive paths
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilities: string[];
}

/**
 * Secret detection patterns
 */
const SECRET_PATTERNS = [
  // API Keys
  /sk-[a-zA-Z0-9]{32,}/g,                    // OpenAI
  /ghp_[a-zA-Z0-9]{36}/g,                    // GitHub PAT
  /gho_[a-zA-Z0-9]{36}/g,                    // GitHub OAuth
  /github_pat_[a-zA-Z0-9_]{82}/g,            // GitHub fine-grained
  /glpat-[a-zA-Z0-9_-]{20,}/g,               // GitLab

  // AWS
  /AKIA[0-9A-Z]{16}/g,                       // AWS Access Key
  /[A-Za-z0-9/+=]{40}/g,                     // AWS Secret Key (generic)

  // Generic patterns
  /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/gi,
  /access[_-]?token["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/gi,
  /secret[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/gi,
  /password["\s]*[:=]["\s]*[^\s"]{8,}/gi,

  // Connection strings
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi,
  /postgres:\/\/[^:]+:[^@]+@/gi,
  /mysql:\/\/[^:]+:[^@]+@/gi,

  // Private keys
  /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /-----BEGIN PGP PRIVATE KEY BLOCK-----/
] as const;

/**
 * Dangerous command patterns
 */
const DANGEROUS_COMMANDS = [
  // Code execution
  /\beval\s*\(/,
  /\$\([^)]+\)/,                             // Command substitution
  /`[^`]+`/,                                 // Backtick execution

  // Privilege escalation
  /\bsudo\b/,
  /\bsu\s+/,
  /chmod\s+[+]?[sx]/,                        // Setuid/setgid

  // Network access
  /\bcurl\s+.*\|\s*sh/,                      // Pipe to shell
  /\bwget\s+.*\|\s*sh/,
  /\bnc\s+.*\s+-e/,                          // Netcat shell

  // System modification
  /rm\s+-rf\s+\/(?!workspace|home)/,         // Dangerous rm
  /dd\s+if=/,                                 // Disk operations
  /mkfs\./,                                   // Format filesystem

  // Container escape attempts
  /docker\s+run.*--privileged/,
  /docker\s+run.*-v\s+\/:/,                  // Mount host root
  /nsenter/,
  /unshare/
] as const;

/**
 * Detects secrets in configuration values
 */
export function containsSecrets(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return SECRET_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Detects dangerous commands in lifecycle hooks
 */
export function containsDangerousCommands(command: string): boolean {
  if (!command || typeof command !== 'string') {
    return false;
  }

  return DANGEROUS_COMMANDS.some(pattern => pattern.test(command));
}

/**
 * Validates DevContainer configuration with detailed error messages
 */
export function validateDevContainer(config: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: DevContainerConfig;
} {
  const result = DevContainerSchema.safeParse(config);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      data: result.data
    };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return {
    valid: false,
    errors,
    warnings: []
  };
}

/**
 * Performs DREAD risk analysis on DevContainer configuration
 */
export function calculateDREADScore(config: DevContainerConfig): DREADScore {
  let damage = 0;
  let reproducibility = 10;       // Always reproducible
  let exploitability = 0;
  let affectedUsers = 5;          // Baseline: affects developer
  let discoverability = 0;

  // Assess damage potential
  if (config.mounts && config.mounts.length > 0) {
    damage += 3;
    config.mounts.forEach(mount => {
      if (mount.source.startsWith('/home') || mount.source.includes('workspace')) {
        damage += 1;
      }
    });
  }

  if (config.runArgs) {
    damage += 2;
    exploitability += 3;
  }

  if (config.features) {
    const featureCount = Object.keys(config.features).length;
    damage += Math.min(featureCount / 5, 2);
    exploitability += Math.min(featureCount / 10, 2);
  }

  // Assess exploitability
  if (config.postCreateCommand || config.postStartCommand) {
    exploitability += 2;
    discoverability += 3;
  }

  if (config.containerEnv) {
    const envCount = Object.keys(config.containerEnv).length;
    exploitability += Math.min(envCount / 10, 2);
    discoverability += Math.min(envCount / 10, 1);
  }

  // Assess discoverability
  if (config.forwardPorts) {
    discoverability += 2;
  }

  // Calculate total risk
  const totalRisk = (damage + reproducibility + exploitability + affectedUsers + discoverability) / 5;

  // Determine priority
  let priority: DREADScore['priority'];
  if (totalRisk >= 8) priority = 'critical';
  else if (totalRisk >= 6) priority = 'high';
  else if (totalRisk >= 4) priority = 'medium';
  else priority = 'low';

  return {
    damage,
    reproducibility,
    exploitability,
    affectedUsers,
    discoverability,
    totalRisk: parseFloat(totalRisk.toFixed(2)),
    priority
  };
}

/**
 * Analyzes container escape vulnerability risks
 */
export function analyzeContainerEscapeRisk(config: DevContainerConfig): ContainerEscapeRisk {
  const risk: ContainerEscapeRisk = {
    privileged: false,
    hostNetworking: false,
    hostPID: false,
    hostIPC: false,
    capabilitiesAdded: [],
    securityOptDisabled: [],
    sensitiveMounts: [],
    riskLevel: 'low',
    vulnerabilities: []
  };

  // Check runArgs for dangerous flags
  if (config.runArgs) {
    for (const arg of config.runArgs) {
      if (arg.includes('--privileged')) {
        risk.privileged = true;
        risk.vulnerabilities.push('Privileged mode grants full host access');
      }
      if (arg.includes('--network=host')) {
        risk.hostNetworking = true;
        risk.vulnerabilities.push('Host networking bypasses container isolation');
      }
      if (arg.includes('--pid=host')) {
        risk.hostPID = true;
        risk.vulnerabilities.push('Host PID namespace access enables process inspection');
      }
      if (arg.includes('--ipc=host')) {
        risk.hostIPC = true;
        risk.vulnerabilities.push('Host IPC namespace enables shared memory access');
      }
      if (arg.includes('--cap-add')) {
        const cap = arg.split('=')[1];
        risk.capabilitiesAdded.push(cap);
        risk.vulnerabilities.push(`Added capability: ${cap}`);
      }
      if (arg.includes('--security-opt') && arg.includes('unconfined')) {
        risk.securityOptDisabled.push(arg);
        risk.vulnerabilities.push('Security profile disabled');
      }
    }
  }

  // Check mounts for sensitive paths
  if (config.mounts) {
    const sensitivePaths = ['/etc', '/sys', '/proc', '/dev', '/var/run/docker.sock', '/root'];
    for (const mount of config.mounts) {
      if (sensitivePaths.some(path => mount.source.startsWith(path))) {
        risk.sensitiveMounts.push(mount.source);
        risk.vulnerabilities.push(`Sensitive mount: ${mount.source}`);
      }
    }
  }

  // Calculate risk level
  if (risk.privileged || risk.hostPID || risk.sensitiveMounts.includes('/var/run/docker.sock')) {
    risk.riskLevel = 'critical';
  } else if (risk.hostNetworking || risk.hostIPC || risk.capabilitiesAdded.length > 0) {
    risk.riskLevel = 'high';
  } else if (risk.sensitiveMounts.length > 0 || risk.securityOptDisabled.length > 0) {
    risk.riskLevel = 'medium';
  } else {
    risk.riskLevel = 'low';
  }

  return risk;
}

/**
 * Scans entire DevContainer configuration for secrets
 */
export function scanForSecrets(config: DevContainerConfig): {
  found: boolean;
  locations: Array<{ path: string; pattern: string }>;
} {
  const locations: Array<{ path: string; pattern: string }> = [];

  // Scan environment variables
  if (config.containerEnv) {
    for (const [key, value] of Object.entries(config.containerEnv)) {
      if (containsSecrets(value)) {
        locations.push({ path: `containerEnv.${key}`, pattern: 'Secret pattern detected' });
      }
    }
  }

  // Scan lifecycle commands
  if (config.postCreateCommand && containsSecrets(config.postCreateCommand)) {
    locations.push({ path: 'postCreateCommand', pattern: 'Secret in command' });
  }

  if (config.postStartCommand && containsSecrets(config.postStartCommand)) {
    locations.push({ path: 'postStartCommand', pattern: 'Secret in command' });
  }

  return {
    found: locations.length > 0,
    locations
  };
}
