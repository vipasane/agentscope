/**
 * Source Code Analysis Context - Entities and Value Objects
 * Responsible for parsing and extracting documentation from TypeScript source code
 */

import { EntityId, FilePath, PackageName, Version } from '../shared/value-objects.js';

/**
 * Entity IDs
 */
export class SourceAnalysisId extends EntityId {}
export class SymbolId extends EntityId {}

/**
 * Symbol kinds
 */
export enum SymbolKind {
  Class = 'class',
  Function = 'function',
  Interface = 'interface',
  Type = 'type',
  Enum = 'enum',
  Variable = 'variable',
  Method = 'method',
  Property = 'property',
}

/**
 * Parameter definition
 */
export class Parameter {
  constructor(
    public readonly name: string,
    public readonly type: string,
    public readonly description: string,
    public readonly optional: boolean = false,
    public readonly defaultValue?: string
  ) {}
}

/**
 * Return type definition
 */
export class Returns {
  constructor(
    public readonly type: string,
    public readonly description: string
  ) {}
}

/**
 * Code example
 */
export class CodeExample {
  constructor(
    public readonly code: string,
    public readonly language: string = 'typescript',
    public readonly caption?: string
  ) {}
}

/**
 * Throws clause
 */
export class ThrowsClause {
  constructor(
    public readonly type: string,
    public readonly description: string
  ) {}
}

/**
 * Custom tag
 */
export class CustomTag {
  constructor(
    public readonly name: string,
    public readonly value: string
  ) {}
}

/**
 * TSDoc comment value object
 */
export class TSDocComment {
  constructor(
    public readonly summary: string,
    public readonly description: string,
    public readonly parameters: Parameter[],
    public readonly returns: Returns | null,
    public readonly examples: CodeExample[],
    public readonly throws: ThrowsClause[],
    public readonly tags: CustomTag[],
    public readonly deprecated?: string,
    public readonly since?: string,
    public readonly seeAlso?: string[]
  ) {}

  hasExamples(): boolean {
    return this.examples.length > 0;
  }

  isDeprecated(): boolean {
    return this.deprecated !== undefined;
  }
}

/**
 * Type parameter (for generics)
 */
export class TypeParameter {
  constructor(
    public readonly name: string,
    public readonly constraint?: string,
    public readonly default?: string
  ) {}
}

/**
 * Declaration location
 */
export class Declaration {
  constructor(
    public readonly filePath: FilePath,
    public readonly line: number,
    public readonly column: number,
    public readonly endLine: number,
    public readonly endColumn: number
  ) {}
}

/**
 * Symbol entity
 */
export class Symbol {
  constructor(
    public readonly id: SymbolId,
    public readonly name: string,
    public readonly kind: SymbolKind,
    public readonly declaration: Declaration,
    public readonly tsDocComment: TSDocComment | null,
    public readonly typeParameters: TypeParameter[],
    public readonly isExported: boolean = false,
    public readonly modifiers: string[] = []
  ) {}

  isPublic(): boolean {
    return this.isExported && !this.modifiers.includes('private');
  }

  hasDocumentation(): boolean {
    return this.tsDocComment !== null;
  }
}

/**
 * Source analysis aggregate root
 */
export class SourceAnalysis {
  private symbols: Symbol[] = [];

  constructor(
    public readonly id: SourceAnalysisId,
    public readonly filePath: FilePath,
    public readonly packageName: PackageName,
    public readonly version: Version,
    public readonly analyzedAt: Date = new Date()
  ) {}

  addSymbol(symbol: Symbol): void {
    if (this.symbols.find((s) => s.id.equals(symbol.id))) {
      throw new Error(`Symbol ${symbol.name} already exists`);
    }
    this.symbols.push(symbol);
  }

  getSymbols(): Symbol[] {
    return [...this.symbols];
  }

  findSymbol(name: string): Symbol | null {
    return this.symbols.find((s) => s.name === name) || null;
  }

  getPublicSymbols(): Symbol[] {
    return this.symbols.filter((s) => s.isPublic());
  }

  getDocumentedSymbols(): Symbol[] {
    return this.symbols.filter((s) => s.hasDocumentation());
  }

  getDocumentationCoverage(): number {
    const publicSymbols = this.getPublicSymbols();
    if (publicSymbols.length === 0) return 1.0;

    const documented = publicSymbols.filter((s) => s.hasDocumentation()).length;
    return documented / publicSymbols.length;
  }
}
