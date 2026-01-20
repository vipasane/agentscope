#!/usr/bin/env node
/**
 * Pre-Commit Review Hook
 *
 * Runs automated reviews on staged files before commit.
 * Integrates with the AI reviewer personas defined in .github/reviewers/
 *
 * Usage:
 *   - Automatically via git hooks
 *   - Manually: node .claude/hooks/pre-commit-review.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ANSI colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Reviewer persona configurations
const REVIEWERS_DIR = path.join(__dirname, '../../.github/reviewers');

// File patterns that always need human review
const HUMAN_REVIEW_PATTERNS = [
  /\.github\/workflows\//,
  /secrets?\//i,
  /\.env/,
  /package\.json$/,
  /package-lock\.json$/,
  /\.claude\//
];

// Get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error(`${colors.red}Error getting staged files:${colors.reset}`, error.message);
    return [];
  }
}

// Get diff for staged files
function getStagedDiff() {
  try {
    return execSync('git diff --cached', { encoding: 'utf-8' });
  } catch (error) {
    return '';
  }
}

// Load reviewer persona
function loadReviewer(name) {
  const reviewerPath = path.join(REVIEWERS_DIR, `${name}.yml`);
  if (fs.existsSync(reviewerPath)) {
    const content = fs.readFileSync(reviewerPath, 'utf-8');
    return yaml.load(content);
  }
  return null;
}

// Check if file matches pattern
function matchesPattern(file, patterns) {
  return patterns.some(pattern => {
    if (typeof pattern === 'string') {
      return file.includes(pattern) || file.match(new RegExp(pattern.replace(/\*/g, '.*')));
    }
    return pattern.test(file);
  });
}

// Run security checks
function runSecurityChecks(files, diff) {
  const issues = [];
  const reviewer = loadReviewer('security');

  // Check for hardcoded secrets
  const secretPatterns = [
    /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi,
    /sk-[a-zA-Z0-9]{20,}/g,
    /ghp_[a-zA-Z0-9]{36}/g,
    /-----BEGIN (RSA |EC |)PRIVATE KEY-----/g
  ];

  secretPatterns.forEach(pattern => {
    const matches = diff.match(pattern);
    if (matches) {
      issues.push({
        severity: 'critical',
        message: `Potential secret detected: ${matches[0].substring(0, 30)}...`,
        reviewer: 'security'
      });
    }
  });

  // Check for dangerous functions
  const dangerousFunctions = [
    { pattern: /eval\s*\(/g, message: 'eval() usage detected - potential code injection' },
    { pattern: /innerHTML\s*=/g, message: 'innerHTML assignment - potential XSS vulnerability' },
    { pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML usage - ensure input is sanitized' },
    { pattern: /exec\s*\(/g, message: 'exec() usage - potential command injection' },
    { pattern: /child_process/g, message: 'child_process import - review for command injection' }
  ];

  dangerousFunctions.forEach(({ pattern, message }) => {
    if (pattern.test(diff)) {
      issues.push({
        severity: 'warning',
        message,
        reviewer: 'security'
      });
    }
  });

  return issues;
}

// Run architecture checks
function runArchitectureChecks(files, diff) {
  const issues = [];

  // Check for circular dependency indicators
  if (diff.includes('require(') && diff.includes('module.exports')) {
    const requireMatches = diff.match(/require\(['"]\.\.?\//g);
    if (requireMatches && requireMatches.length > 5) {
      issues.push({
        severity: 'warning',
        message: 'Many relative imports detected - check for circular dependencies',
        reviewer: 'architect'
      });
    }
  }

  // Check file size
  files.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;

      if (lines > 300) {
        issues.push({
          severity: 'warning',
          message: `${file} has ${lines} lines (recommended max: 300)`,
          reviewer: 'architect'
        });
      }
    }
  });

  // Check for new files in wrong location
  files.forEach(file => {
    if (file.startsWith('src/') === false &&
        file.endsWith('.ts') &&
        !file.includes('test') &&
        !file.includes('config')) {
      issues.push({
        severity: 'info',
        message: `TypeScript file ${file} is outside src/ directory`,
        reviewer: 'architect'
      });
    }
  });

  return issues;
}

// Run simplicity checks
function runSimplicityChecks(files, diff) {
  const issues = [];

  // Count additions vs deletions
  const additions = (diff.match(/^\+[^+]/gm) || []).length;
  const deletions = (diff.match(/^-[^-]/gm) || []).length;

  if (additions > 200) {
    issues.push({
      severity: 'warning',
      message: `Large addition: +${additions} lines. Consider splitting into smaller commits.`,
      reviewer: 'simplifier'
    });
  }

  if (deletions > additions) {
    issues.push({
      severity: 'info',
      message: `Good job! Removing more code than adding (-${deletions}/+${additions})`,
      reviewer: 'simplifier'
    });
  }

  // Check for overly complex patterns
  const complexPatterns = [
    { pattern: /\?\.\s*\?\./g, message: 'Multiple optional chaining - consider simplifying' },
    { pattern: /\.then\(.*\.then\(/g, message: 'Nested promises - consider async/await' },
    { pattern: /callback.*callback/gi, message: 'Nested callbacks detected' }
  ];

  complexPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(diff)) {
      issues.push({
        severity: 'info',
        message,
        reviewer: 'simplifier'
      });
    }
  });

  return issues;
}

// Run test coverage checks
function runTestCoverageChecks(files) {
  const issues = [];

  const srcFiles = files.filter(f => f.startsWith('src/') && f.endsWith('.ts'));
  const testFiles = files.filter(f => f.includes('test') || f.includes('spec'));

  if (srcFiles.length > 0 && testFiles.length === 0) {
    issues.push({
      severity: 'warning',
      message: `Source files changed (${srcFiles.length}) but no test files included`,
      reviewer: 'test-coverage'
    });
  }

  return issues;
}

// Check if human review is required
function checkHumanReviewRequired(files) {
  const requiresHuman = [];

  files.forEach(file => {
    if (matchesPattern(file, HUMAN_REVIEW_PATTERNS)) {
      requiresHuman.push(file);
    }
  });

  return requiresHuman;
}

// Main review function
async function runReview() {
  console.log(`${colors.bold}${colors.blue}🔍 Running Pre-Commit Review${colors.reset}\n`);

  const files = getStagedFiles();

  if (files.length === 0) {
    console.log(`${colors.yellow}No staged files to review.${colors.reset}`);
    return { pass: true, issues: [] };
  }

  console.log(`${colors.blue}Files to review:${colors.reset}`);
  files.forEach(f => console.log(`  - ${f}`));
  console.log();

  const diff = getStagedDiff();
  const allIssues = [];

  // Run all checks
  allIssues.push(...runSecurityChecks(files, diff));
  allIssues.push(...runArchitectureChecks(files, diff));
  allIssues.push(...runSimplicityChecks(files, diff));
  allIssues.push(...runTestCoverageChecks(files));

  // Check for human review requirement
  const humanReviewFiles = checkHumanReviewRequired(files);
  if (humanReviewFiles.length > 0) {
    allIssues.push({
      severity: 'critical',
      message: `Files requiring human review: ${humanReviewFiles.join(', ')}`,
      reviewer: 'policy'
    });
  }

  // Output results
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const infos = allIssues.filter(i => i.severity === 'info');

  if (criticalIssues.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ CRITICAL ISSUES (${criticalIssues.length}):${colors.reset}`);
    criticalIssues.forEach(issue => {
      console.log(`  ${colors.red}[${issue.reviewer}]${colors.reset} ${issue.message}`);
    });
    console.log();
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  WARNINGS (${warnings.length}):${colors.reset}`);
    warnings.forEach(issue => {
      console.log(`  ${colors.yellow}[${issue.reviewer}]${colors.reset} ${issue.message}`);
    });
    console.log();
  }

  if (infos.length > 0) {
    console.log(`${colors.blue}${colors.bold}ℹ️  INFO (${infos.length}):${colors.reset}`);
    infos.forEach(issue => {
      console.log(`  ${colors.blue}[${issue.reviewer}]${colors.reset} ${issue.message}`);
    });
    console.log();
  }

  // Summary
  console.log(`${colors.bold}─────────────────────────────────────${colors.reset}`);

  if (criticalIssues.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ COMMIT BLOCKED${colors.reset}`);
    console.log(`${colors.red}Fix critical issues before committing.${colors.reset}`);
    console.log(`${colors.yellow}Use --no-verify to bypass (not recommended).${colors.reset}`);
    return { pass: false, issues: allIssues };
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  COMMIT ALLOWED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Consider addressing warnings before PR.${colors.reset}`);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL CHECKS PASSED${colors.reset}`);
  }

  return { pass: true, issues: allIssues };
}

// Export for use as module
module.exports = { runReview };

// Run if called directly
if (require.main === module) {
  runReview().then(result => {
    process.exit(result.pass ? 0 : 1);
  });
}
