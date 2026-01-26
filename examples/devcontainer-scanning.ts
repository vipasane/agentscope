/**
 * DevContainer Security Scanning Example
 *
 * Demonstrates the v1.2 security scanning capabilities for DevContainer configurations.
 *
 * Features:
 * - Zod schema validation
 * - DREAD risk analysis
 * - Secrets detection and sanitization
 * - Path traversal prevention
 * - Container escape vulnerability checks
 * - Integration with claude-flow security hooks
 *
 * Usage:
 *   ts-node examples/devcontainer-scanning.ts <path-to-devcontainer.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateDevContainer,
  calculateDREADScore,
  analyzeContainerEscapeRisk,
  scanForSecrets,
  type DevContainerConfig,
  type DREADScore,
  type ContainerEscapeRisk
} from '../src/core/security/devcontainer-validators.js';
import {
  sanitizeDevContainer,
  generateSanitizationReport,
  type SanitizationResult
} from '../src/core/security/devcontainer-sanitizers.js';

/**
 * Security scan result
 */
interface ScanResult {
  valid: boolean;
  riskScore: DREADScore;
  escapeRisk: ContainerEscapeRisk;
  secrets: { found: boolean; locations: Array<{ path: string; pattern: string }> };
  sanitization?: SanitizationResult;
  recommendations: string[];
}

/**
 * Performs comprehensive security scan on DevContainer configuration
 */
export async function scanDevContainer(configPath: string): Promise<ScanResult> {
  console.log(`\n🔍 Scanning DevContainer: ${configPath}\n`);

  // Step 1: Load and parse configuration
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Step 2: Validate with Zod schema
  console.log('1️⃣  Validating configuration schema...');
  const validation = validateDevContainer(rawConfig);

  if (!validation.valid) {
    console.error('❌ Validation failed:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    return {
      valid: false,
      riskScore: { damage: 0, reproducibility: 0, exploitability: 0, affectedUsers: 0, discoverability: 0, totalRisk: 0, priority: 'low' },
      escapeRisk: { privileged: false, hostNetworking: false, hostPID: false, hostIPC: false, capabilitiesAdded: [], securityOptDisabled: [], sensitiveMounts: [], riskLevel: 'low', vulnerabilities: [] },
      secrets: { found: false, locations: [] },
      recommendations: ['Fix validation errors before proceeding']
    };
  }

  const config = validation.data!;
  console.log('✅ Configuration is valid\n');

  // Step 3: Calculate DREAD risk score
  console.log('2️⃣  Calculating DREAD risk score...');
  const riskScore = calculateDREADScore(config);
  console.log(`   Risk Level: ${riskScore.priority.toUpperCase()} (${riskScore.totalRisk}/10)`);
  console.log(`   - Damage: ${riskScore.damage}/10`);
  console.log(`   - Reproducibility: ${riskScore.reproducibility}/10`);
  console.log(`   - Exploitability: ${riskScore.exploitability}/10`);
  console.log(`   - Affected Users: ${riskScore.affectedUsers}/10`);
  console.log(`   - Discoverability: ${riskScore.discoverability}/10\n`);

  // Step 4: Check for container escape vulnerabilities
  console.log('3️⃣  Analyzing container escape vulnerabilities...');
  const escapeRisk = analyzeContainerEscapeRisk(config);
  console.log(`   Risk Level: ${escapeRisk.riskLevel.toUpperCase()}`);

  if (escapeRisk.vulnerabilities.length > 0) {
    console.log('   Vulnerabilities:');
    escapeRisk.vulnerabilities.forEach(vuln => console.log(`   - ${vuln}`));
  } else {
    console.log('   ✅ No container escape vulnerabilities detected');
  }
  console.log('');

  // Step 5: Scan for secrets
  console.log('4️⃣  Scanning for secrets...');
  const secretScan = scanForSecrets(config);

  if (secretScan.found) {
    console.log('   ⚠️  Secrets detected:');
    secretScan.locations.forEach(loc => console.log(`   - ${loc.path}: ${loc.pattern}`));
  } else {
    console.log('   ✅ No secrets detected');
  }
  console.log('');

  // Step 6: Sanitize if medium or high risk
  let sanitization: SanitizationResult | undefined;

  if (riskScore.priority === 'medium' || riskScore.priority === 'high') {
    console.log('5️⃣  Sanitizing configuration...');
    const allowedDirs = ['/workspace', '/home', '/tmp'];
    sanitization = sanitizeDevContainer(config, allowedDirs);

    console.log(`   Changes: ${sanitization.changes.length}`);
    console.log(`   Removals: ${sanitization.removals.length}`);

    if (sanitization.changes.length > 0 || sanitization.removals.length > 0) {
      console.log('\n   Report:');
      const report = generateSanitizationReport(sanitization);
      console.log(report.split('\n').map(line => '   ' + line).join('\n'));
    }
  }

  // Step 7: Generate recommendations
  const recommendations = generateRecommendations(riskScore, escapeRisk, secretScan);

  console.log('\n📋 Recommendations:\n');
  recommendations.forEach(rec => console.log(`   - ${rec}`));

  return {
    valid: true,
    riskScore,
    escapeRisk,
    secrets: secretScan,
    sanitization,
    recommendations
  };
}

/**
 * Generates security recommendations based on scan results
 */
function generateRecommendations(
  riskScore: DREADScore,
  escapeRisk: ContainerEscapeRisk,
  secrets: { found: boolean; locations: Array<{ path: string; pattern: string }> }
): string[] {
  const recommendations: string[] = [];

  // Critical/High risk recommendations
  if (riskScore.priority === 'critical') {
    recommendations.push('🚨 CRITICAL: This configuration poses severe security risks. Do not use in production.');
  }

  if (escapeRisk.privileged) {
    recommendations.push('Remove --privileged flag. Use specific capabilities instead.');
  }

  if (escapeRisk.hostNetworking) {
    recommendations.push('Remove --network=host. Use port forwarding instead.');
  }

  if (escapeRisk.hostPID || escapeRisk.hostIPC) {
    recommendations.push('Remove host namespace access (--pid=host, --ipc=host).');
  }

  if (escapeRisk.capabilitiesAdded.length > 0) {
    recommendations.push(`Review added capabilities: ${escapeRisk.capabilitiesAdded.join(', ')}. Only add necessary capabilities.`);
  }

  if (escapeRisk.sensitiveMounts.length > 0) {
    recommendations.push(`Remove sensitive mounts: ${escapeRisk.sensitiveMounts.join(', ')}.`);
  }

  // Secret handling
  if (secrets.found) {
    recommendations.push('Remove hardcoded secrets. Use environment files (.env) or secret managers.');
    recommendations.push('Add .env to .gitignore to prevent accidental commits.');
  }

  // Medium risk recommendations
  if (riskScore.priority === 'medium') {
    recommendations.push('Consider reducing the number of features and mounts to minimize attack surface.');
  }

  // Best practices
  recommendations.push('Use official Microsoft DevContainer base images only.');
  recommendations.push('Enable Docker Content Trust: export DOCKER_CONTENT_TRUST=1');
  recommendations.push('Regularly update base images and features to patch vulnerabilities.');
  recommendations.push('Review lifecycle commands for security implications.');

  // Low risk - all good
  if (riskScore.priority === 'low' && !secrets.found && escapeRisk.vulnerabilities.length === 0) {
    recommendations.push('✅ Configuration follows security best practices.');
  }

  return recommendations;
}

/**
 * Stores scan results in claude-flow memory for learning
 */
export async function storeScanPattern(
  configPath: string,
  result: ScanResult
): Promise<void> {
  const configHash = require('crypto')
    .createHash('sha256')
    .update(JSON.stringify(result))
    .digest('hex')
    .slice(0, 16);

  const pattern = {
    configPath,
    configHash,
    riskScore: result.riskScore,
    vulnerabilities: result.escapeRisk.vulnerabilities,
    secrets: result.secrets.locations,
    recommendations: result.recommendations,
    timestamp: Date.now()
  };

  console.log('\n💾 Storing scan pattern in memory...');

  // Note: In real usage, this would call the claude-flow CLI via child_process
  console.log(`\nRun this command to store the pattern:`);
  console.log(`\nnpx @claude-flow/cli@latest memory store \\`);
  console.log(`  --namespace "devcontainer-security" \\`);
  console.log(`  --key "scan-${configHash}-${Date.now()}" \\`);
  console.log(`  --value '${JSON.stringify(pattern)}' \\`);
  console.log(`  --tags "devcontainer,security,risk-${result.riskScore.priority}"`);
}

/**
 * Example: Scan with claude-flow hooks integration
 */
export async function scanWithHooks(configPath: string): Promise<void> {
  const scanId = `devcontainer-scan-${Date.now()}`;

  console.log('\n🪝 Pre-scan hook...');
  console.log(`Run: npx @claude-flow/cli@latest hooks pre-task --description "DevContainer security scan: ${configPath}"\n`);

  // Perform scan
  const result = await scanDevContainer(configPath);

  // Post-scan hook
  console.log('\n🪝 Post-scan hook...');
  const passed = result.riskScore.priority !== 'critical';
  console.log(`Run: npx @claude-flow/cli@latest hooks post-task --task-id "${scanId}" --success ${passed} --store-results true\n`);

  // Store pattern
  await storeScanPattern(configPath, result);

  // AIDefence integration (if lifecycle commands present)
  if (result.valid && result.riskScore.priority !== 'low') {
    console.log('\n🛡️  AIDefence threat scanning...');
    console.log('For production use, integrate with @claude-flow/security AIDefence module.');
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node examples/devcontainer-scanning.ts <path-to-devcontainer.json>');
    process.exit(1);
  }

  const configPath = path.resolve(args[0]);

  if (!fs.existsSync(configPath)) {
    console.error(`Error: File not found: ${configPath}`);
    process.exit(1);
  }

  scanWithHooks(configPath)
    .then(() => {
      console.log('\n✅ Scan complete\n');
    })
    .catch((error) => {
      console.error('\n❌ Scan failed:', error.message);
      process.exit(1);
    });
}
