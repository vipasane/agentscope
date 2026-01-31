#!/usr/bin/env node

/**
 * CLI for API Reference Documentation System
 */

import { Command } from 'commander';
import { DocumentationGenerator } from './generator/documentation-generator.js';
import { DocWatcher } from './watch/doc-watcher.js';
import { SemanticSearchService } from './search/semantic-search.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('api-docs')
  .description('API Reference Documentation System')
  .version('1.0.0');

/**
 * Generate command
 */
program
  .command('generate')
  .description('Generate API documentation')
  .option('-i, --input <path>', 'Input directory or file', './src')
  .option('-o, --output <path>', 'Output directory', './docs/api')
  .option('-f, --format <format>', 'Output format (markdown|html|json|all)', 'markdown')
  .option('-p, --package <name>', 'Package name', '@claude-flow/package')
  .option('-v, --version <version>', 'Package version', '1.0.0')
  .option('--validate-examples', 'Validate code examples', false)
  .option('--check-secrets', 'Scan for secrets in examples', true)
  .action(async (options) => {
    try {
      console.log('Generating API documentation...');
      console.log('Input:', options.input);
      console.log('Output:', options.output);
      console.log('Format:', options.format);

      const generator = new DocumentationGenerator({
        validateExamples: options.validateExamples,
        checkSecrets: options.checkSecrets,
      });

      const result = await generator.generateFromDirectory(
        options.input,
        options.package,
        options.version,
        options.format,
        options.output
      );

      console.log(`\n✓ Documentation generated successfully!`);
      console.log(`  Files processed: ${result.filesProcessed}`);
      console.log(`  Symbols documented: ${result.symbolsDocumented}`);
      console.log(`  Coverage: ${(result.coverage * 100).toFixed(1)}%`);
      console.log(`  Output: ${options.output}`);

      if (result.validationErrors > 0) {
        console.warn(`\n⚠ ${result.validationErrors} validation errors found`);
      }
    } catch (error) {
      console.error('Error generating documentation:', error);
      process.exit(1);
    }
  });

/**
 * Watch command
 */
program
  .command('watch')
  .description('Watch for changes and regenerate documentation')
  .option('-i, --input <path>', 'Input directory', './src')
  .option('-o, --output <path>', 'Output directory', './docs/api')
  .option('-f, --format <format>', 'Output format', 'markdown')
  .option('-p, --package <name>', 'Package name', '@claude-flow/package')
  .option('-v, --version <version>', 'Package version', '1.0.0')
  .action(async (options) => {
    try {
      console.log('Starting documentation watch mode...');
      console.log('Watching:', options.input);

      const watcher = new DocWatcher({
        inputDir: options.input,
        outputDir: options.output,
        format: options.format,
        packageName: options.package,
        version: options.version,
      });

      await watcher.start();

      console.log('✓ Watch mode started. Press Ctrl+C to stop.');

      // Keep process alive
      process.on('SIGINT', async () => {
        console.log('\nStopping watch mode...');
        await watcher.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('Error in watch mode:', error);
      process.exit(1);
    }
  });

/**
 * Search command
 */
program
  .command('search')
  .description('Search documentation')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum results', '10')
  .option('-p, --package <name>', 'Filter by package')
  .option('-k, --kind <kind>', 'Filter by symbol kind (class|function|interface)')
  .action(async (query, options) => {
    try {
      console.log('Searching documentation...');

      const searchService = new SemanticSearchService();

      // Load index (in real implementation, load from persistent storage)
      console.log('⚠ Search requires pre-built index');

      const results = await searchService.search(query, {
        limit: parseInt(options.limit),
        packageFilter: options.package,
        kindFilter: options.kind,
      });

      console.log(`\nFound ${results.length} results:\n`);

      for (const result of results) {
        console.log(`${result.entry.metadata.symbolName} (${result.entry.metadata.symbolKind})`);
        console.log(`  Package: ${result.entry.metadata.packageName}`);
        console.log(`  Score: ${result.score.toFixed(4)}`);
        console.log(`  Content: ${result.entry.content.substring(0, 100)}...`);
        console.log();
      }
    } catch (error) {
      console.error('Error searching:', error);
      process.exit(1);
    }
  });

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate documentation quality')
  .option('-i, --input <path>', 'Input directory', './src')
  .option('--check-coverage', 'Check documentation coverage', true)
  .option('--check-examples', 'Validate code examples', true)
  .option('--check-secrets', 'Scan for secrets', true)
  .action(async (options) => {
    try {
      console.log('Validating documentation...');

      const generator = new DocumentationGenerator({
        validateExamples: options.checkExamples,
        checkSecrets: options.checkSecrets,
      });

      const result = await generator.validate(options.input);

      console.log('\nValidation Results:');
      console.log(`  Coverage: ${(result.coverage * 100).toFixed(1)}%`);
      console.log(`  Symbols documented: ${result.documented}/${result.total}`);
      console.log(`  Examples validated: ${result.examplesValidated}`);
      console.log(`  Example errors: ${result.exampleErrors}`);
      console.log(`  Secret warnings: ${result.secretWarnings}`);

      if (result.coverage < 0.8) {
        console.warn('\n⚠ Coverage below 80% threshold');
      }

      if (result.exampleErrors > 0) {
        console.error('\n✗ Some examples have errors');
        process.exit(1);
      }

      console.log('\n✓ Validation passed');
    } catch (error) {
      console.error('Error validating:', error);
      process.exit(1);
    }
  });

/**
 * Init command
 */
program
  .command('init')
  .description('Initialize API documentation configuration')
  .option('-o, --output <path>', 'Config file path', './api-docs.config.json')
  .action(async (options) => {
    try {
      const config = {
        input: './src',
        output: './docs/api',
        format: 'markdown',
        package: '@claude-flow/package',
        version: '1.0.0',
        validateExamples: true,
        checkSecrets: true,
        watch: {
          enabled: false,
          debounce: 1000,
        },
        search: {
          enabled: true,
          indexPath: './docs/api/.search-index',
        },
      };

      await fs.writeFile(options.output, JSON.stringify(config, null, 2));

      console.log(`✓ Configuration file created: ${options.output}`);
      console.log('\nEdit the configuration and run:');
      console.log('  api-docs generate');
    } catch (error) {
      console.error('Error creating config:', error);
      process.exit(1);
    }
  });

program.parse();
