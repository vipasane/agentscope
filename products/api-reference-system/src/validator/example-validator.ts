/**
 * Example validator
 * Validates code examples by compiling and optionally executing them
 */

import * as ts from 'typescript';
import { CodeExample } from '../domain/source-analysis/entities.js';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  code: number;
}

export interface ValidationWarning {
  message: string;
  type: string;
}

export interface ValidationOptions {
  compileOnly?: boolean;
  checkSecrets?: boolean;
  checkPII?: boolean;
  timeout?: number;
}

export class ExampleValidator {
  /**
   * Validate a code example
   */
  async validate(
    example: CodeExample,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Only validate TypeScript/JavaScript examples
    if (example.language !== 'typescript' && example.language !== 'javascript') {
      return { isValid: true, errors, warnings };
    }

    // Compile check
    if (example.language === 'typescript') {
      const compileResult = this.compileTypeScript(example.code);
      errors.push(...compileResult.errors);
    }

    // Secret scanning
    if (options.checkSecrets) {
      const secretWarnings = this.scanForSecrets(example.code);
      warnings.push(...secretWarnings);
    }

    // PII detection
    if (options.checkPII) {
      const piiWarnings = this.scanForPII(example.code);
      warnings.push(...piiWarnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compile TypeScript code
   */
  private compileTypeScript(code: string): { errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Create temporary source file
    const fileName = 'example.ts';
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    };

    // Create program
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;

    host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (name === fileName) {
        return ts.createSourceFile(name, code, languageVersion, true);
      }
      return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = ts.createProgram([fileName], compilerOptions, host);
    const emitResult = program.emit();

    // Get diagnostics
    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    for (const diagnostic of allDiagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start
        );
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

        errors.push({
          line: line + 1,
          column: character + 1,
          message,
          code: diagnostic.code,
        });
      }
    }

    return { errors };
  }

  /**
   * Scan for secrets (API keys, tokens, etc.)
   */
  private scanForSecrets(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    const secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{20,}/g, type: 'API Key' },
      { pattern: /ghp_[a-zA-Z0-9]{36,}/g, type: 'GitHub Token' },
      { pattern: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key' },
      { pattern: /ya29\.[a-zA-Z0-9_-]{68,}/g, type: 'Google OAuth Token' },
      { pattern: /[0-9a-f]{32}/gi, type: 'Potential MD5 Hash/Token' },
    ];

    for (const { pattern, type } of secretPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        warnings.push({
          message: `Potential ${type} found in example code`,
          type: 'secret',
        });
      }
    }

    return warnings;
  }

  /**
   * Scan for PII (personally identifiable information)
   */
  private scanForPII(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    const piiPatterns = [
      { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, type: 'Email Address' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, type: 'Phone Number' },
      {
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        type: 'Credit Card Number',
      },
    ];

    for (const { pattern, type } of piiPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        warnings.push({
          message: `Potential ${type} found in example code`,
          type: 'pii',
        });
      }
    }

    return warnings;
  }

  /**
   * Validate all examples in a source analysis
   */
  async validateAll(
    examples: CodeExample[],
    options: ValidationOptions = {}
  ): Promise<Map<CodeExample, ValidationResult>> {
    const results = new Map<CodeExample, ValidationResult>();

    for (const example of examples) {
      const result = await this.validate(example, options);
      results.set(example, result);
    }

    return results;
  }
}
