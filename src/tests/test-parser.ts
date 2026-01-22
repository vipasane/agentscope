#!/usr/bin/env node
/**
 * Test script for enhanced CLAUDE.md parser
 * Tests all new parsing methods with the sample CLAUDE.md
 */

import { ClaudeCodeParser } from '../core/parsers/claude-code.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function testParser() {
  console.log('🧪 Testing Enhanced CLAUDE.md Parser\n');
  console.log('='.repeat(60));

  const rootPath = '/workspaces/agentscope/examples/sample-project';
  const parser = new ClaudeCodeParser(rootPath);

  try {
    // Parse the entire project
    const result = await parser.parse();

    console.log('\n📋 Parse Results:\n');
    console.log(`Total Agents Found: ${result.agents.length}`);
    console.log(`Total Skills Found: ${result.skills.length}`);
    console.log(`Total Hooks Found: ${result.hooks.length}`);
    console.log(`Total Commands Found: ${result.commands.length}`);
    console.log(`Total Errors: ${result.errors.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n🤖 Parsed Agents:\n');

    // Display agents with details
    result.agents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name}`);
      console.log(`   Type: ${agent.type}`);
      console.log(`   Description: ${agent.description || 'N/A'}`);
      if (agent.delegatesTo && agent.delegatesTo.length > 0) {
        console.log(`   Delegates to: ${agent.delegatesTo.join(', ')}`);
      }
      if (agent.tools && agent.tools.length > 0) {
        console.log(`   Tools: ${agent.tools.join(', ')}`);
      }
      console.log(`   Path: ${agent.path}`);
      console.log();
    });

    console.log('='.repeat(60));

    // Verify expected agents are found
    const expectedAgents = [
      { name: 'planner', type: 'coordinator', delegatesTo: ['coder', 'tester', 'reviewer'] },
      { name: 'pr-manager', type: 'coordinator', delegatesTo: ['coder', 'reviewer'] },
      { name: 'coder', type: 'worker', tools: ['github MCP server'] },
      { name: 'tester', type: 'worker' },
      { name: 'reviewer', type: 'reviewer' },
      { name: 'security-auditor', type: 'specialist' }
    ];

    console.log('\n✅ Verification:\n');
    let allPassed = true;

    for (const expected of expectedAgents) {
      const found = result.agents.find(a => a.name === expected.name);
      if (!found) {
        console.log(`❌ Missing agent: ${expected.name}`);
        allPassed = false;
        continue;
      }

      const checks: string[] = [];

      // Check type
      if (found.type === expected.type) {
        checks.push('✓ type');
      } else {
        checks.push(`✗ type (expected: ${expected.type}, got: ${found.type})`);
        allPassed = false;
      }

      // Check delegatesTo
      if (expected.delegatesTo) {
        const hasAllDelegates = expected.delegatesTo.every(d =>
          found.delegatesTo?.includes(d)
        );
        if (hasAllDelegates && found.delegatesTo?.length === expected.delegatesTo.length) {
          checks.push('✓ delegates');
        } else {
          checks.push(`✗ delegates (expected: ${expected.delegatesTo.join(', ')}, got: ${found.delegatesTo?.join(', ') || 'none'})`);
          allPassed = false;
        }
      }

      // Check tools
      if (expected.tools) {
        const hasAllTools = expected.tools.every(t =>
          found.tools?.includes(t)
        );
        if (hasAllTools) {
          checks.push('✓ tools');
        } else {
          checks.push(`✗ tools (expected: ${expected.tools.join(', ')}, got: ${found.tools?.join(', ') || 'none'})`);
          allPassed = false;
        }
      }

      console.log(`${allPassed ? '✅' : '⚠️'} ${expected.name}: ${checks.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));

    if (allPassed) {
      console.log('\n🎉 All tests PASSED! Parser is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests FAILED. Review the output above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error during parsing:', error);
    process.exit(1);
  }
}

// Run the test
testParser();
