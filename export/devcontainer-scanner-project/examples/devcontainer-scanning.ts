/**
 * DevContainer Scanner - Usage Examples
 *
 * Demonstrates how to use the DevContainer Scanner API for security analysis.
 */

import {
  validateDevContainer,
  calculateDREADScore,
  scanForSecrets,
  analyzeContainerEscapeRisk,
  sanitizeDevContainer,
  generateSanitizationReport,
  type DevContainerConfig
} from '@devcontainer-security/scanner';

// ============================================================================
// EXAMPLE 1: Basic Validation
// ============================================================================

/**
 * Validate a DevContainer configuration
 */
function example1_basicValidation() {
  const config = {
    name: "my-devcontainer",
    image: "mcr.microsoft.com/devcontainers/typescript-node:18",
    customizations: {
      vscode: {
        extensions: ["ms-python.python"]
      }
    }
  };

  const result = validateDevContainer(config);

  if (result.valid) {
    console.log('✅ Configuration is valid');
    console.log('Data:', result.data);
  } else {
    console.log('❌ Validation errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
}

// ============================================================================
// EXAMPLE 2: Risk Assessment with DREAD Scoring
// ============================================================================

/**
 * Calculate risk score for a configuration
 */
function example2_riskAssessment() {
  const config: DevContainerConfig = {
    name: "risky-devcontainer",
    image: "mcr.microsoft.com/devcontainers/base:latest",
    features: {
      "ghcr.io/devcontainers/features/docker-in-docker:1": {}
    },
    containerEnv: {
      DATABASE_URL: "postgres://admin:password123@db.example.com:5432/mydb"
    },
    mounts: [
      { source: "/var/run/docker.sock", target: "/docker.sock" }
    ]
  };

  const dreadScore = calculateDREADScore(config);

  console.log('DREAD Risk Assessment:');
  console.log(`  Damage: ${dreadScore.damage}/10`);
  console.log(`  Reproducibility: ${dreadScore.reproducibility}/10`);
  console.log(`  Exploitability: ${dreadScore.exploitability}/10`);
  console.log(`  Affected Users: ${dreadScore.affectedUsers}/10`);
  console.log(`  Discoverability: ${dreadScore.discoverability}/10`);
  console.log(`  Total Risk: ${dreadScore.totalRisk}/10`);
  console.log(`  Priority: ${dreadScore.priority.toUpperCase()}`);
}

// ============================================================================
// EXAMPLE 3: Secrets Detection
// ============================================================================

/**
 * Scan configuration for secrets
 */
function example3_secretsDetection() {
  const config: DevContainerConfig = {
    name: "dev",
    image: "mcr.microsoft.com/devcontainers/base:latest",
    containerEnv: {
      OPENAI_API_KEY: "sk-proj-abc123def456ghi789jkl",
      GITHUB_TOKEN: "ghp_1234567890abcdefghij1234567890",
      DEBUG: "false"
    }
  };

  const secretScan = scanForSecrets(config);

  if (secretScan.found) {
    console.log('🚨 SECRETS DETECTED:');
    secretScan.locations.forEach(loc => {
      console.log(`  - ${loc.path}: ${loc.pattern}`);
    });
  } else {
    console.log('✅ No secrets detected');
  }
}

// ============================================================================
// EXAMPLE 4: Container Escape Risk Analysis
// ============================================================================

/**
 * Analyze container escape vulnerabilities
 */
function example4_containerEscapeRisk() {
  const config: DevContainerConfig = {
    name: "privileged-dev",
    image: "mcr.microsoft.com/devcontainers/base:latest",
    runArgs: [
      "--privileged",
      "--cap-add=SYS_ADMIN",
      "--network=host"
    ],
    mounts: [
      { source: "/etc", target: "/etc-host" },
      { source: "/var/run/docker.sock", target: "/docker.sock" }
    ]
  };

  const escapeRisk = analyzeContainerEscapeRisk(config);

  console.log('Container Escape Risk Analysis:');
  console.log(`  Privileged Mode: ${escapeRisk.privileged}`);
  console.log(`  Host Networking: ${escapeRisk.hostNetworking}`);
  console.log(`  Host PID: ${escapeRisk.hostPID}`);
  console.log(`  Host IPC: ${escapeRisk.hostIPC}`);
  console.log(`  Capabilities Added: ${escapeRisk.capabilitiesAdded.join(', ')}`);
  console.log(`  Sensitive Mounts: ${escapeRisk.sensitiveMounts.join(', ')}`);
  console.log(`  Risk Level: ${escapeRisk.riskLevel.toUpperCase()}`);
  console.log('\nVulnerabilities:');
  escapeRisk.vulnerabilities.forEach(v => console.log(`  - ${v}`));
}

// ============================================================================
// EXAMPLE 5: Automated Remediation
// ============================================================================

/**
 * Apply security sanitization and generate report
 */
function example5_automatedRemediation() {
  const config: DevContainerConfig = {
    name: "insecure-dev",
    image: "mcr.microsoft.com/devcontainers/base:latest",
    containerEnv: {
      DATABASE_PASSWORD: "secret123456789xyz",
      APP_ENV: "development"
    },
    runArgs: ["--privileged", "--cap-add=SYS_ADMIN"],
    postCreateCommand: "npm install && npm run setup || sudo systemctl restart",
    features: {
      "ghcr.io/devcontainers/features/docker-in-docker:1": {}
    }
  };

  const result = sanitizeDevContainer(config, ['/workspaces', '/home/user']);

  console.log('Sanitization Results:');
  console.log(`  Changes: ${result.changes.length}`);
  console.log(`  Removals: ${result.removals.length}`);

  // Show specific changes
  if (result.changes.length > 0) {
    console.log('\nChanges Applied:');
    result.changes.slice(0, 3).forEach(change => {
      console.log(`  - ${change.path}: "${change.original}" → "${change.sanitized}"`);
      console.log(`    Reason: ${change.reason}`);
    });
  }

  // Show removals
  if (result.removals.length > 0) {
    console.log('\nItems Removed:');
    result.removals.slice(0, 3).forEach(removal => {
      console.log(`  - ${removal.path}`);
      console.log(`    Reason: ${removal.reason}`);
    });
  }

  // Generate report
  const report = generateSanitizationReport(result);
  console.log('\nFull Report:');
  console.log(report);
}

// ============================================================================
// EXAMPLE 6: Comprehensive Security Audit
// ============================================================================

/**
 * Complete security audit of a DevContainer
 */
function example6_comprehensiveAudit() {
  const config: DevContainerConfig = {
    name: "full-audit-example",
    image: "mcr.microsoft.com/devcontainers/typescript-node:18",
    features: {
      "ghcr.io/devcontainers/features/node:1": {},
      "ghcr.io/devcontainers/features/github-cli:1": {}
    },
    customizations: {
      vscode: {
        extensions: ["ms-python.python", "ms-vscode.cpptools"]
      }
    },
    containerEnv: {
      NODE_ENV: "development",
      API_KEY: "sk-abc123def456"
    },
    postCreateCommand: "npm install && npm run setup"
  };

  console.log('═══════════════════════════════════════════');
  console.log('DevContainer Security Audit Report');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // 1. Validation
  console.log('📋 Step 1: Validation');
  const validation = validateDevContainer(config);
  console.log(validation.valid ? '  ✅ Configuration valid' : '  ❌ Configuration invalid');
  if (!validation.valid) {
    validation.errors.forEach(e => console.log(`     Error: ${e}`));
  }
  console.log('');

  // 2. Risk Assessment
  console.log('⚠️ Step 2: Risk Assessment (DREAD)');
  const dread = calculateDREADScore(config);
  console.log(`  Overall Risk: ${dread.totalRisk}/10 (${dread.priority.toUpperCase()})`);
  console.log('');

  // 3. Secrets Detection
  console.log('🔐 Step 3: Secrets Detection');
  const secrets = scanForSecrets(config);
  if (secrets.found) {
    console.log(`  🚨 Found ${secrets.locations.length} secret(s):`);
    secrets.locations.forEach(loc => console.log(`     - ${loc.path}`));
  } else {
    console.log('  ✅ No secrets detected');
  }
  console.log('');

  // 4. Container Escape Risk
  console.log('💥 Step 4: Container Escape Risk');
  const escape = analyzeContainerEscapeRisk(config);
  console.log(`  Risk Level: ${escape.riskLevel.toUpperCase()}`);
  if (escape.vulnerabilities.length > 0) {
    console.log(`  Vulnerabilities: ${escape.vulnerabilities.length}`);
    escape.vulnerabilities.slice(0, 3).forEach(v => console.log(`    - ${v}`));
  } else {
    console.log('  ✅ No obvious escape vectors');
  }
  console.log('');

  // 5. Remediation
  console.log('🔧 Step 5: Remediation');
  const remediation = sanitizeDevContainer(config, ['/workspaces']);
  console.log(`  Changes: ${remediation.changes.length}`);
  console.log(`  Removals: ${remediation.removals.length}`);
  console.log('');

  console.log('═══════════════════════════════════════════');
}

// ============================================================================
// EXAMPLE 7: Best Practices Template
// ============================================================================

/**
 * Secure DevContainer template following best practices
 */
function example7_secureTemplate(): DevContainerConfig {
  return {
    name: "secure-devcontainer",
    image: "mcr.microsoft.com/devcontainers/typescript-node:18",
    features: {
      "ghcr.io/devcontainers/features/node:1": {},
      "ghcr.io/devcontainers/features/github-cli:1": {}
    },
    customizations: {
      vscode: {
        extensions: [
          "ms-vscode.vscode-typescript-next",
          "esbenp.prettier-vscode",
          "dbaeumer.vscode-eslint"
        ]
      }
    },
    containerEnv: {
      // Use .env files instead of hardcoding secrets
      NODE_ENV: "development",
      LOG_LEVEL: "debug"
    },
    postCreateCommand: "npm install && npm run setup",
    forwardPorts: [3000, 5432],
    mounts: []
    // Safe defaults:
    // - No privileged mode
    // - No host namespace access
    // - No sensitive directory mounts
    // - No dangerous capabilities
    // - No secrets in environment
  };
}

// ============================================================================
// Run Examples
// ============================================================================

if (require.main === module) {
  console.log('\n=== Example 1: Basic Validation ===\n');
  try {
    example1_basicValidation();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 2: Risk Assessment ===\n');
  try {
    example2_riskAssessment();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 3: Secrets Detection ===\n');
  try {
    example3_secretsDetection();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 4: Container Escape Risk ===\n');
  try {
    example4_containerEscapeRisk();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 5: Automated Remediation ===\n');
  try {
    example5_automatedRemediation();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 6: Comprehensive Audit ===\n');
  try {
    example6_comprehensiveAudit();
  } catch (e) {
    console.error('Error:', e);
  }

  console.log('\n=== Example 7: Secure Template ===\n');
  try {
    const template = example7_secureTemplate();
    console.log('Secure template:');
    console.log(JSON.stringify(template, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

export {
  example1_basicValidation,
  example2_riskAssessment,
  example3_secretsDetection,
  example4_containerEscapeRisk,
  example5_automatedRemediation,
  example6_comprehensiveAudit,
  example7_secureTemplate
};
