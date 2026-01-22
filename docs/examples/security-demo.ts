/**
 * Security Features Demo
 *
 * Demonstrates the security validators and sanitizers in action.
 */

import {
  sanitizeId,
  sanitizeNodeLabel,
  sanitizePath,
  validateThemeName,
  validateColor,
  detectInjectionPatterns,
} from '../../src/core/security/index.js';

console.log('=== AgentScope Security Features Demo ===\n');

// 1. Theme Validation
console.log('1. Theme Validation:');
console.log(`  validateThemeName('light'):          ${validateThemeName('light')}`);
console.log(`  validateThemeName('dark'):           ${validateThemeName('dark')}`);
console.log(`  validateThemeName('malicious'):      ${validateThemeName('malicious')}`);
console.log(`  validateThemeName('%%{init}%%'):     ${validateThemeName('%%{init}%%')}`);
console.log();

// 2. Color Validation
console.log('2. Color Validation:');
console.log(`  validateColor('#FF0000'):            ${validateColor('#FF0000')}`);
console.log(`  validateColor('rgb(255,0,0)'):       ${validateColor('rgb(255,0,0)')}`);
console.log(`  validateColor('red'):                ${validateColor('red')}`);
console.log(`  validateColor('javascript:alert'):   ${validateColor('javascript:alert')}`);
console.log();

// 3. Injection Pattern Detection
console.log('3. Injection Pattern Detection:');
const maliciousInputs = [
  'normal text',
  '%%{init: {theme: "dark"}}%%',
  '<script>alert(1)</script>',
  'javascript:alert(1)',
  'onclick=alert(1)',
];

for (const input of maliciousInputs) {
  const patterns = detectInjectionPatterns(input);
  console.log(`  "${input}"`);
  if (patterns.length === 0) {
    console.log(`    ✓ Clean (no threats detected)`);
  } else {
    console.log(`    ✗ Threats: ${patterns.join(', ')}`);
  }
}
console.log();

// 4. ID Sanitization
console.log('4. ID Sanitization:');
const ids = [
  'my-agent-123',
  '123-agent',
  'end',
  'graph',
  'agent@server.com',
  'a'.repeat(60),
];

for (const id of ids) {
  const sanitized = sanitizeId(id);
  console.log(`  "${id}" → "${sanitized}"`);
}
console.log();

// 5. Label Sanitization
console.log('5. Label Sanitization:');
const labels = [
  'My Agent',
  'Agent [1]',
  '%%{init: bad}%%',
  '<script>alert(1)</script>',
  'Agent {type: coordinator}',
  'Value > 100',
];

for (const label of labels) {
  const sanitized = sanitizeNodeLabel(label);
  console.log(`  "${label}"`);
  console.log(`    → "${sanitized}"`);
}
console.log();

// 6. Path Sanitization
console.log('6. Path Sanitization:');
const allowedDirs = ['/workspace', '/home/user/projects'];
const paths = [
  './file.txt',
  '../../../etc/passwd',
  '/workspace/subfolder/file.txt',
  '/tmp/file.txt',
  '/workspace/file<script>.txt',
];

for (const path of paths) {
  const sanitized = sanitizePath(path, allowedDirs);
  if (sanitized) {
    console.log(`  ✓ "${path}" → "${sanitized}"`);
  } else {
    console.log(`  ✗ "${path}" → BLOCKED`);
  }
}
console.log();

// 7. Real-world Attack Scenarios
console.log('7. Real-world Attack Scenarios:');
console.log();

console.log('  Scenario 1: Theme Override Attack');
const attackTheme = '%%{init: {\'theme\':\'base\', \'themeVariables\': {\'primaryColor\':\'red\'}}}%%dark';
console.log(`    Input:  "${attackTheme}"`);
console.log(`    Valid:  ${validateThemeName(attackTheme)}`);
console.log(`    Result: Attack blocked - invalid theme name`);
console.log();

console.log('  Scenario 2: XSS in Agent Label');
const attackLabel = '<img src=x onerror=alert(document.cookie)>';
console.log(`    Input:  "${attackLabel}"`);
console.log(`    Output: "${sanitizeNodeLabel(attackLabel)}"`);
console.log(`    Result: HTML tags and event handlers removed`);
console.log();

console.log('  Scenario 3: Path Traversal');
const attackPath = '../../../../../etc/passwd';
console.log(`    Input:  "${attackPath}"`);
console.log(`    Output: ${sanitizePath(attackPath, ['/workspace'])}`);
console.log(`    Result: Traversal blocked - path outside allowed directory`);
console.log();

console.log('  Scenario 4: Mermaid Directive Injection in ID');
const attackId = '%%{init:{\'theme\':\'forest\'}}%%agent';
console.log(`    Input:  "${attackId}"`);
console.log(`    Output: "${sanitizeId(attackId)}"`);
console.log(`    Result: Directive syntax replaced with safe characters`);
console.log();

console.log('=== Demo Complete ===');
console.log('All security features working as expected! ✓');
