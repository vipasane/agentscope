/**
 * TypeScript parser using TypeScript Compiler API
 * Extracts symbols and type information from TypeScript source files
 */

import * as ts from 'typescript';
import { FilePath, PackageName, Version } from '../domain/shared/value-objects.js';
import {
  SourceAnalysis,
  SourceAnalysisId,
  Symbol,
  SymbolId,
  SymbolKind,
  Declaration,
  TypeParameter,
} from '../domain/source-analysis/entities.js';
import { TSDocExtractor } from './tsdoc-extractor.js';

export interface ParseOptions {
  includePrivate?: boolean;
  includeInternal?: boolean;
}

export class TypeScriptParser {
  private tsdocExtractor: TSDocExtractor;

  constructor() {
    this.tsdocExtractor = new TSDocExtractor();
  }

  /**
   * Parse a TypeScript file and extract symbols
   */
  async parse(
    filePath: FilePath,
    packageName: PackageName,
    version: Version,
    options: ParseOptions = {}
  ): Promise<SourceAnalysis> {
    const program = this.createProgram(filePath.toString());
    const sourceFile = program.getSourceFile(filePath.toString());

    if (!sourceFile) {
      throw new Error(`Could not load source file: ${filePath.toString()}`);
    }

    const analysis = new SourceAnalysis(
      new SourceAnalysisId(),
      filePath,
      packageName,
      version
    );

    const typeChecker = program.getTypeChecker();

    // Visit all nodes and extract symbols
    const visitNode = (node: ts.Node) => {
      if (this.shouldExtractSymbol(node, options)) {
        const symbol = this.extractSymbol(node, sourceFile, typeChecker, filePath);
        if (symbol) {
          analysis.addSymbol(symbol);
        }
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    return analysis;
  }

  /**
   * Create TypeScript program for analysis
   */
  private createProgram(fileName: string): ts.Program {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    };

    return ts.createProgram([fileName], compilerOptions);
  }

  /**
   * Determine if a node should be extracted as a symbol
   */
  private shouldExtractSymbol(node: ts.Node, options: ParseOptions): boolean {
    // Extract classes, interfaces, functions, types, enums
    const isExtractableKind =
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableStatement(node);

    if (!isExtractableKind) return false;

    // Check if exported
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported = modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    );

    if (!isExported && !options.includePrivate) return false;

    return true;
  }

  /**
   * Extract symbol information from a node
   */
  private extractSymbol(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    filePath: FilePath
  ): Symbol | null {
    const name = this.getSymbolName(node);
    if (!name) return null;

    const kind = this.getSymbolKind(node);
    const declaration = this.getDeclaration(node, sourceFile, filePath);
    const typeParameters = this.getTypeParameters(node);
    const modifiers = this.getModifiers(node);
    const isExported = modifiers.includes('export');

    // Extract TSDoc comment
    const tsDocComment = this.tsdocExtractor.extract(node, sourceFile);

    return new Symbol(
      new SymbolId(),
      name,
      kind,
      declaration,
      tsDocComment,
      typeParameters,
      isExported,
      modifiers
    );
  }

  /**
   * Get symbol name from node
   */
  private getSymbolName(node: ts.Node): string | null {
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      return node.name?.text || null;
    }
    if (ts.isFunctionDeclaration(node)) {
      return node.name?.text || null;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isEnumDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (ts.isIdentifier(declaration.name)) {
        return declaration.name.text;
      }
    }
    return null;
  }

  /**
   * Get symbol kind from node
   */
  private getSymbolKind(node: ts.Node): SymbolKind {
    if (ts.isClassDeclaration(node)) return SymbolKind.Class;
    if (ts.isInterfaceDeclaration(node)) return SymbolKind.Interface;
    if (ts.isFunctionDeclaration(node)) return SymbolKind.Function;
    if (ts.isTypeAliasDeclaration(node)) return SymbolKind.Type;
    if (ts.isEnumDeclaration(node)) return SymbolKind.Enum;
    if (ts.isVariableStatement(node)) return SymbolKind.Variable;
    return SymbolKind.Variable;
  }

  /**
   * Get declaration location
   */
  private getDeclaration(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: FilePath
  ): Declaration {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return new Declaration(
      filePath,
      start.line + 1,
      start.character + 1,
      end.line + 1,
      end.character + 1
    );
  }

  /**
   * Get type parameters (generics)
   */
  private getTypeParameters(node: ts.Node): TypeParameter[] {
    if (
      !ts.isClassDeclaration(node) &&
      !ts.isInterfaceDeclaration(node) &&
      !ts.isFunctionDeclaration(node) &&
      !ts.isTypeAliasDeclaration(node)
    ) {
      return [];
    }

    const typeParams = node.typeParameters;
    if (!typeParams) return [];

    return typeParams.map((tp) => {
      const name = tp.name.text;
      const constraint = tp.constraint?.getText();
      const defaultType = tp.default?.getText();
      return new TypeParameter(name, constraint, defaultType);
    });
  }

  /**
   * Get modifiers as strings
   */
  private getModifiers(node: ts.Node): string[] {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return [];

    return modifiers.map((m) => {
      switch (m.kind) {
        case ts.SyntaxKind.ExportKeyword:
          return 'export';
        case ts.SyntaxKind.PublicKeyword:
          return 'public';
        case ts.SyntaxKind.PrivateKeyword:
          return 'private';
        case ts.SyntaxKind.ProtectedKeyword:
          return 'protected';
        case ts.SyntaxKind.StaticKeyword:
          return 'static';
        case ts.SyntaxKind.ReadonlyKeyword:
          return 'readonly';
        case ts.SyntaxKind.AbstractKeyword:
          return 'abstract';
        case ts.SyntaxKind.AsyncKeyword:
          return 'async';
        default:
          return '';
      }
    }).filter((m) => m !== '');
  }
}
