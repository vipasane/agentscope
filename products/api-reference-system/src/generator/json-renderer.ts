/**
 * JSON renderer
 * Generates structured JSON documentation for programmatic access
 */

import { Renderer, Documentation } from '../domain/documentation/entities.js';
import { SourceAnalysis, Symbol } from '../domain/source-analysis/entities.js';

export interface JSONDocSchema {
  package: string;
  version: string;
  generatedAt: string;
  exports: JSONSymbol[];
  metadata: {
    coverage: number;
    symbolCount: number;
  };
}

export interface JSONSymbol {
  type: string;
  name: string;
  description?: string;
  summary?: string;
  deprecated?: string;
  since?: string;
  typeParameters?: Array<{
    name: string;
    constraint?: string;
    default?: string;
  }>;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
    default?: string;
  }>;
  returnType?: {
    type: string;
    description: string;
  };
  examples?: Array<{
    code: string;
    language: string;
    caption?: string;
  }>;
  throws?: Array<{
    type: string;
    description: string;
  }>;
  seeAlso?: string[];
  source: {
    file: string;
    line: number;
    column: number;
  };
}

export class JSONRenderer implements Renderer {
  render(doc: Documentation): string {
    // This is simplified - in real implementation, we'd need the source analysis
    const jsonDoc = {
      documentationId: doc.id.toString(),
      sourceAnalysisId: doc.sourceAnalysisId.toString(),
      format: doc.format,
      version: doc.version.toString(),
      sections: doc.getSections().map((s) => ({
        type: s.type,
        title: s.title,
        content: s.content,
        order: s.order,
      })),
      metadata: {
        generatedAt: doc.metadata.generatedAt.toISOString(),
        generator: doc.metadata.generator,
        version: doc.metadata.version,
      },
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  /**
   * Render package analysis to JSON
   */
  renderPackage(analysis: SourceAnalysis): string {
    const symbols = analysis.getPublicSymbols();

    const jsonDoc: JSONDocSchema = {
      package: analysis.packageName.toString(),
      version: analysis.version.toString(),
      generatedAt: new Date().toISOString(),
      exports: symbols.map((s) => this.symbolToJSON(s)),
      metadata: {
        coverage: analysis.getDocumentationCoverage(),
        symbolCount: symbols.length,
      },
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  /**
   * Convert symbol to JSON representation
   */
  private symbolToJSON(symbol: Symbol): JSONSymbol {
    const json: JSONSymbol = {
      type: symbol.kind,
      name: symbol.name,
      source: {
        file: symbol.declaration.filePath.toString(),
        line: symbol.declaration.line,
        column: symbol.declaration.column,
      },
    };

    if (!symbol.tsDocComment) {
      return json;
    }

    const doc = symbol.tsDocComment;

    if (doc.summary) json.summary = doc.summary;
    if (doc.description) json.description = doc.description;
    if (doc.deprecated) json.deprecated = doc.deprecated;
    if (doc.since) json.since = doc.since;

    if (symbol.typeParameters.length > 0) {
      json.typeParameters = symbol.typeParameters.map((tp) => ({
        name: tp.name,
        constraint: tp.constraint,
        default: tp.default,
      }));
    }

    if (doc.parameters.length > 0) {
      json.parameters = doc.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        optional: p.optional,
        default: p.defaultValue,
      }));
    }

    if (doc.returns) {
      json.returnType = {
        type: doc.returns.type,
        description: doc.returns.description,
      };
    }

    if (doc.examples.length > 0) {
      json.examples = doc.examples.map((e) => ({
        code: e.code,
        language: e.language,
        caption: e.caption,
      }));
    }

    if (doc.throws.length > 0) {
      json.throws = doc.throws.map((t) => ({
        type: t.type,
        description: t.description,
      }));
    }

    if (doc.seeAlso) {
      json.seeAlso = doc.seeAlso;
    }

    return json;
  }
}
