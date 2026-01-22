#!/usr/bin/env node
/**
 * Debug version of parser test with detailed error output
 */

import { ClaudeCodeParser } from '../core/parsers/claude-code.js';
import { readFile } from 'node:fs/promises';

async function debugParser() {
  console.log('🧪 Debugging Enhanced CLAUDE.md Parser\n');

  const rootPath = '/workspaces/agentscope/examples/sample-project';
  const parser = new ClaudeCodeParser(rootPath);

  try {
    const result = await parser.parse();

    console.log(`Total Agents Found: ${result.agents.length}`);
    console.log(`Total Errors: ${result.errors.length}\n`);

    if (result.errors.length > 0) {
      console.log('⚠️ Errors encountered:\n');
      result.errors.forEach(error => {
        console.log(`  Severity: ${error.severity}`);
        console.log(`  Code: ${error.code}`);
        console.log(`  Message: ${error.message}`);
        console.log(`  File: ${error.file || 'N/A'}`);
        console.log();
      });
    }

    console.log('\n📝 Testing individual parsing methods:\n');

    // Test parseHeadingContexts
    const claudeMdPath = '/workspaces/agentscope/examples/sample-project/CLAUDE.md';
    const content = await readFile(claudeMdPath, 'utf-8');

    console.log('Testing parseHeadingContexts...');
    const contexts = (parser as any).parseHeadingContexts(content);
    console.log(`  Found ${contexts.length} heading contexts:`);
    contexts.forEach((ctx: any) => {
      console.log(`    - ${ctx.type} (level ${ctx.level}, lines ${ctx.startLine}-${ctx.endLine || 'end'})`);
    });

    console.log('\nTesting parseBulletAgents...');
    const bulletAgents = (parser as any).parseBulletAgents(content);
    console.log(`  Found ${bulletAgents.length} bullet agents:`);
    bulletAgents.forEach((agent: any) => {
      console.log(`    - ${agent.name}: ${agent.description.substring(0, 50)}...`);
    });

    console.log('\nTesting extractDelegatesTo...');
    const delegatesTo = (parser as any).extractDelegatesTo(content);
    console.log(`  Found delegates for ${Object.keys(delegatesTo).length} agents:`);
    Object.entries(delegatesTo).forEach(([agent, delegates]: [string, any]) => {
      console.log(`    - ${agent} -> [${delegates.join(', ')}]`);
    });

    console.log('\nTesting extractTools...');
    const tools = (parser as any).extractTools(content);
    console.log(`  Found tools for ${Object.keys(tools).length} agents:`);
    Object.entries(tools).forEach(([agent, agentTools]: [string, any]) => {
      console.log(`    - ${agent}: [${agentTools.join(', ')}]`);
    });

    console.log('\nTesting parseAgentTable...');
    const tableAgents = (parser as any).parseAgentTable(content);
    console.log(`  Found ${tableAgents.length} table agents:`);
    tableAgents.forEach((agent: any) => {
      console.log(`    - ${agent.name} (${agent.type})`);
    });

  } catch (error) {
    console.error('\n❌ Error during parsing:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

debugParser();
