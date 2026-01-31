/**
 * Tests for TypeScript parser
 */

import { describe, it, expect } from 'vitest';
import { TypeScriptParser } from '../../src/parser/typescript-parser.js';
import { FilePath, PackageName, Version } from '../../src/domain/shared/value-objects.js';
import { SymbolKind } from '../../src/domain/source-analysis/entities.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();

  it('should parse a simple class', async () => {
    // Create temporary test file
    const testFile = path.join(__dirname, 'test-class.ts');
    const testCode = `
/**
 * A simple test class
 * @example
 * \`\`\`typescript
 * const instance = new TestClass('hello');
 * \`\`\`
 */
export class TestClass {
  /**
   * Constructor
   * @param name - The name
   */
  constructor(public readonly name: string) {}

  /**
   * Get greeting
   * @returns The greeting message
   */
  getGreeting(): string {
    return \`Hello, \${this.name}\`;
  }
}
`;

    await fs.writeFile(testFile, testCode);

    try {
      const analysis = await parser.parse(
        new FilePath(testFile),
        new PackageName('@test/package'),
        new Version(1, 0, 0)
      );

      expect(analysis).toBeDefined();
      expect(analysis.getPublicSymbols()).toHaveLength(1);

      const symbol = analysis.getPublicSymbols()[0];
      expect(symbol.name).toBe('TestClass');
      expect(symbol.kind).toBe(SymbolKind.Class);
      expect(symbol.isExported).toBe(true);
      expect(symbol.tsDocComment).toBeDefined();
      expect(symbol.tsDocComment?.summary).toContain('simple test class');
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should parse interfaces', async () => {
    const testFile = path.join(__dirname, 'test-interface.ts');
    const testCode = `
/**
 * Test interface
 */
export interface TestInterface {
  /**
   * Name property
   */
  name: string;

  /**
   * Optional age
   */
  age?: number;
}
`;

    await fs.writeFile(testFile, testCode);

    try {
      const analysis = await parser.parse(
        new FilePath(testFile),
        new PackageName('@test/package'),
        new Version(1, 0, 0)
      );

      const symbol = analysis.findSymbol('TestInterface');
      expect(symbol).toBeDefined();
      expect(symbol?.kind).toBe(SymbolKind.Interface);
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should parse functions with parameters', async () => {
    const testFile = path.join(__dirname, 'test-function.ts');
    const testCode = `
/**
 * Add two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;

    await fs.writeFile(testFile, testCode);

    try {
      const analysis = await parser.parse(
        new FilePath(testFile),
        new PackageName('@test/package'),
        new Version(1, 0, 0)
      );

      const symbol = analysis.findSymbol('add');
      expect(symbol).toBeDefined();
      expect(symbol?.kind).toBe(SymbolKind.Function);
      expect(symbol?.tsDocComment?.parameters).toHaveLength(2);
      expect(symbol?.tsDocComment?.returns).toBeDefined();
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should handle type parameters (generics)', async () => {
    const testFile = path.join(__dirname, 'test-generic.ts');
    const testCode = `
/**
 * Generic container
 */
export class Container<T extends object, U = string> {
  constructor(private value: T) {}
}
`;

    await fs.writeFile(testFile, testCode);

    try {
      const analysis = await parser.parse(
        new FilePath(testFile),
        new PackageName('@test/package'),
        new Version(1, 0, 0)
      );

      const symbol = analysis.findSymbol('Container');
      expect(symbol).toBeDefined();
      expect(symbol?.typeParameters).toHaveLength(2);
      expect(symbol?.typeParameters[0].name).toBe('T');
      expect(symbol?.typeParameters[0].constraint).toBe('object');
      expect(symbol?.typeParameters[1].name).toBe('U');
      expect(symbol?.typeParameters[1].default).toBe('string');
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should calculate documentation coverage', async () => {
    const testFile = path.join(__dirname, 'test-coverage.ts');
    const testCode = `
/**
 * Documented class
 */
export class DocumentedClass {}

// No documentation
export class UndocumentedClass {}
`;

    await fs.writeFile(testFile, testCode);

    try {
      const analysis = await parser.parse(
        new FilePath(testFile),
        new PackageName('@test/package'),
        new Version(1, 0, 0)
      );

      const coverage = analysis.getDocumentationCoverage();
      expect(coverage).toBe(0.5); // 1 out of 2 documented
    } finally {
      await fs.unlink(testFile);
    }
  });
});
