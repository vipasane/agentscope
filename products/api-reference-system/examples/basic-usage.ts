/**
 * Basic usage examples for the API Reference System
 */

import {
  DocumentationGenerator,
  TypeScriptParser,
  MarkdownRenderer,
  ExampleValidator,
  SemanticSearchService,
  PackageName,
  Version,
  FilePath,
} from '../src/index.js';

/**
 * Example 1: Generate documentation from a directory
 */
async function example1() {
  const generator = new DocumentationGenerator({
    validateExamples: true,
    checkSecrets: true,
  });

  const result = await generator.generateFromDirectory(
    './src',
    '@claude-flow/example',
    '1.0.0',
    'markdown',
    './docs/api'
  );

  console.log('Generation complete!');
  console.log(`Files processed: ${result.filesProcessed}`);
  console.log(`Symbols documented: ${result.symbolsDocumented}`);
  console.log(`Coverage: ${(result.coverage * 100).toFixed(1)}%`);
}

/**
 * Example 2: Parse a single file
 */
async function example2() {
  const parser = new TypeScriptParser();

  const analysis = await parser.parse(
    new FilePath('./src/index.ts'),
    new PackageName('@claude-flow/example'),
    new Version(1, 0, 0)
  );

  console.log('Parsing complete!');
  console.log(`Public symbols: ${analysis.getPublicSymbols().length}`);
  console.log(`Coverage: ${(analysis.getDocumentationCoverage() * 100).toFixed(1)}%`);

  // List all symbols
  for (const symbol of analysis.getPublicSymbols()) {
    console.log(`- ${symbol.name} (${symbol.kind})`);
  }
}

/**
 * Example 3: Render to Markdown
 */
async function example3() {
  const parser = new TypeScriptParser();
  const renderer = new MarkdownRenderer();

  const analysis = await parser.parse(
    new FilePath('./src/index.ts'),
    new PackageName('@claude-flow/example'),
    new Version(1, 0, 0)
  );

  const markdown = renderer.renderPackage(analysis);

  console.log('Markdown generated:');
  console.log(markdown);
}

/**
 * Example 4: Validate examples
 */
async function example4() {
  const parser = new TypeScriptParser();
  const validator = new ExampleValidator();

  const analysis = await parser.parse(
    new FilePath('./src/index.ts'),
    new PackageName('@claude-flow/example'),
    new Version(1, 0, 0)
  );

  let validExamples = 0;
  let invalidExamples = 0;

  for (const symbol of analysis.getPublicSymbols()) {
    if (!symbol.tsDocComment) continue;

    for (const example of symbol.tsDocComment.examples) {
      const result = await validator.validate(example, {
        checkSecrets: true,
        checkPII: true,
      });

      if (result.isValid) {
        validExamples++;
      } else {
        invalidExamples++;
        console.log(`Invalid example in ${symbol.name}:`);
        for (const error of result.errors) {
          console.log(`  Line ${error.line}: ${error.message}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log(`Warnings in ${symbol.name}:`);
        for (const warning of result.warnings) {
          console.log(`  ${warning.type}: ${warning.message}`);
        }
      }
    }
  }

  console.log(`Valid examples: ${validExamples}`);
  console.log(`Invalid examples: ${invalidExamples}`);
}

/**
 * Example 5: Search documentation
 */
async function example5() {
  const parser = new TypeScriptParser();
  const searchService = new SemanticSearchService();

  // Index multiple files
  const files = ['./src/index.ts', './src/parser/typescript-parser.ts'];

  for (const file of files) {
    const analysis = await parser.parse(
      new FilePath(file),
      new PackageName('@claude-flow/example'),
      new Version(1, 0, 0)
    );
    await searchService.indexSourceAnalysis(analysis);
  }

  // Search
  const results = await searchService.search('parse TypeScript', { limit: 5 });

  console.log(`Found ${results.length} results:`);
  for (const result of results) {
    console.log(`- ${result.entry.metadata.symbolName} (score: ${result.score.toFixed(4)})`);
  }
}

/**
 * Example 6: Watch mode
 */
async function example6() {
  const { DocWatcher } = await import('../src/watch/doc-watcher.js');

  const watcher = new DocWatcher({
    inputDir: './src',
    outputDir: './docs/api',
    format: 'markdown',
    packageName: '@claude-flow/example',
    version: '1.0.0',
    debounce: 1000,
  });

  await watcher.start();
  console.log('Watch mode started. Press Ctrl+C to stop.');

  // Keep process alive
  await new Promise(() => {}); // Infinite wait
}

// Run examples (uncomment to execute)
// example1();
// example2();
// example3();
// example4();
// example5();
// example6();
