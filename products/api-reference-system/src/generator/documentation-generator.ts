/**
 * Main documentation generator
 * Orchestrates parsing, rendering, and validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { TypeScriptParser } from '../parser/typescript-parser.js';
import { MarkdownRenderer } from './markdown-renderer.js';
import { JSONRenderer } from './json-renderer.js';
import { ExampleValidator } from '../validator/example-validator.js';
import { SemanticSearchService } from '../search/semantic-search.js';
import { FilePath, PackageName, Version } from '../domain/shared/value-objects.js';
import { SourceAnalysis } from '../domain/source-analysis/entities.js';

export interface GeneratorConfig {
  validateExamples?: boolean;
  checkSecrets?: boolean;
  buildSearchIndex?: boolean;
}

export interface GenerationResult {
  filesProcessed: number;
  symbolsDocumented: number;
  coverage: number;
  validationErrors: number;
  warnings: number;
}

export interface ValidationResult {
  coverage: number;
  total: number;
  documented: number;
  examplesValidated: number;
  exampleErrors: number;
  secretWarnings: number;
}

export class DocumentationGenerator {
  private parser: TypeScriptParser;
  private markdownRenderer: MarkdownRenderer;
  private jsonRenderer: JSONRenderer;
  private exampleValidator: ExampleValidator;
  private searchService: SemanticSearchService;

  constructor(private config: GeneratorConfig = {}) {
    this.parser = new TypeScriptParser();
    this.markdownRenderer = new MarkdownRenderer();
    this.jsonRenderer = new JSONRenderer();
    this.exampleValidator = new ExampleValidator();
    this.searchService = new SemanticSearchService();
  }

  /**
   * Generate documentation from a directory
   */
  async generateFromDirectory(
    inputDir: string,
    packageName: string,
    versionString: string,
    format: string,
    outputDir: string
  ): Promise<GenerationResult> {
    // Find all TypeScript files
    const files = await glob('**/*.ts', {
      cwd: inputDir,
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      absolute: true,
    });

    console.log(`Found ${files.length} TypeScript files`);

    const pkg = new PackageName(packageName);
    const version = Version.parse(versionString);
    const analyses: SourceAnalysis[] = [];

    let totalSymbols = 0;
    let validationErrors = 0;
    let warnings = 0;

    // Parse all files
    for (const file of files) {
      try {
        const filePath = new FilePath(file);
        const analysis = await this.parser.parse(filePath, pkg, version);
        analyses.push(analysis);

        const symbolCount = analysis.getPublicSymbols().length;
        totalSymbols += symbolCount;

        console.log(`  ✓ ${path.relative(inputDir, file)}: ${symbolCount} symbols`);

        // Validate examples if enabled
        if (this.config.validateExamples) {
          const validationResult = await this.validateAnalysis(analysis);
          validationErrors += validationResult.errors;
          warnings += validationResult.warnings;
        }
      } catch (error) {
        console.error(`  ✗ Error parsing ${file}:`, error);
        validationErrors++;
      }
    }

    // Calculate coverage
    const coverage = this.calculateOverallCoverage(analyses);

    // Generate output based on format
    await fs.mkdir(outputDir, { recursive: true });

    if (format === 'markdown' || format === 'all') {
      await this.generateMarkdown(analyses, outputDir);
    }

    if (format === 'json' || format === 'all') {
      await this.generateJSON(analyses, outputDir);
    }

    if (format === 'html' || format === 'all') {
      await this.generateHTML(analyses, outputDir);
    }

    // Build search index if enabled
    if (this.config.buildSearchIndex) {
      await this.searchService.indexMultiple(analyses);
    }

    return {
      filesProcessed: files.length,
      symbolsDocumented: totalSymbols,
      coverage,
      validationErrors,
      warnings,
    };
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdown(
    analyses: SourceAnalysis[],
    outputDir: string
  ): Promise<void> {
    for (const analysis of analyses) {
      const markdown = this.markdownRenderer.renderPackage(analysis);
      const fileName = `${analysis.filePath.getBaseName().replace('.ts', '')}.md`;
      const outputPath = path.join(outputDir, fileName);

      await fs.writeFile(outputPath, markdown);
      console.log(`  Generated: ${outputPath}`);
    }

    // Generate index
    const indexMarkdown = this.generateIndexMarkdown(analyses);
    await fs.writeFile(path.join(outputDir, 'README.md'), indexMarkdown);
  }

  /**
   * Generate JSON documentation
   */
  private async generateJSON(analyses: SourceAnalysis[], outputDir: string): Promise<void> {
    for (const analysis of analyses) {
      const json = this.jsonRenderer.renderPackage(analysis);
      const fileName = `${analysis.filePath.getBaseName().replace('.ts', '')}.json`;
      const outputPath = path.join(outputDir, 'json', fileName);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, json);
    }
  }

  /**
   * Generate HTML documentation (placeholder)
   */
  private async generateHTML(analyses: SourceAnalysis[], outputDir: string): Promise<void> {
    // Placeholder - would integrate with Vitepress
    console.log('HTML generation not yet implemented');
  }

  /**
   * Generate index markdown
   */
  private generateIndexMarkdown(analyses: SourceAnalysis[]): string {
    const parts: string[] = [];

    parts.push(`# API Reference\n\n`);
    parts.push(`**Generated:** ${new Date().toISOString()}\n\n`);

    if (analyses.length > 0) {
      const pkg = analyses[0].packageName.toString();
      const ver = analyses[0].version.toString();
      parts.push(`**Package:** ${pkg}\n`);
      parts.push(`**Version:** ${ver}\n\n`);
    }

    parts.push(`## Modules\n\n`);

    for (const analysis of analyses) {
      const fileName = analysis.filePath.getBaseName().replace('.ts', '');
      const coverage = (analysis.getDocumentationCoverage() * 100).toFixed(1);
      const symbolCount = analysis.getPublicSymbols().length;

      parts.push(`- [${fileName}](./${fileName}.md) - ${symbolCount} symbols (${coverage}% coverage)\n`);
    }

    return parts.join('');
  }

  /**
   * Validate analysis
   */
  private async validateAnalysis(
    analysis: SourceAnalysis
  ): Promise<{ errors: number; warnings: number }> {
    let errors = 0;
    let warnings = 0;

    const symbols = analysis.getPublicSymbols();

    for (const symbol of symbols) {
      if (!symbol.tsDocComment) continue;

      for (const example of symbol.tsDocComment.examples) {
        const result = await this.exampleValidator.validate(example, {
          checkSecrets: this.config.checkSecrets,
        });

        if (!result.isValid) {
          errors += result.errors.length;
        }

        warnings += result.warnings.length;
      }
    }

    return { errors, warnings };
  }

  /**
   * Calculate overall coverage
   */
  private calculateOverallCoverage(analyses: SourceAnalysis[]): number {
    if (analyses.length === 0) return 0;

    const totalCoverage = analyses.reduce(
      (sum, a) => sum + a.getDocumentationCoverage(),
      0
    );

    return totalCoverage / analyses.length;
  }

  /**
   * Validate documentation
   */
  async validate(inputDir: string): Promise<ValidationResult> {
    const files = await glob('**/*.ts', {
      cwd: inputDir,
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      absolute: true,
    });

    let total = 0;
    let documented = 0;
    let examplesValidated = 0;
    let exampleErrors = 0;
    let secretWarnings = 0;

    for (const file of files) {
      const filePath = new FilePath(file);
      const analysis = await this.parser.parse(
        filePath,
        new PackageName('@temp/package'),
        new Version(1, 0, 0)
      );

      const publicSymbols = analysis.getPublicSymbols();
      total += publicSymbols.length;
      documented += publicSymbols.filter((s) => s.hasDocumentation()).length;

      for (const symbol of publicSymbols) {
        if (!symbol.tsDocComment) continue;

        for (const example of symbol.tsDocComment.examples) {
          examplesValidated++;
          const result = await this.exampleValidator.validate(example, {
            checkSecrets: true,
          });

          if (!result.isValid) {
            exampleErrors += result.errors.length;
          }

          secretWarnings += result.warnings.filter((w) => w.type === 'secret').length;
        }
      }
    }

    return {
      coverage: total > 0 ? documented / total : 0,
      total,
      documented,
      examplesValidated,
      exampleErrors,
      secretWarnings,
    };
  }
}
