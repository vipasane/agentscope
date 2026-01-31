/**
 * Documentation Generation Context - Entities and Value Objects
 */

import { EntityId, Version } from '../shared/value-objects.js';
import { SourceAnalysisId } from '../source-analysis/entities.js';

export class DocumentationId extends EntityId {}

/**
 * Output formats
 */
export enum OutputFormat {
  Markdown = 'markdown',
  HTML = 'html',
  JSON = 'json',
  OpenAPI = 'openapi',
}

/**
 * Section types
 */
export enum SectionType {
  Summary = 'summary',
  Description = 'description',
  Constructor = 'constructor',
  Methods = 'methods',
  Properties = 'properties',
  Parameters = 'parameters',
  Returns = 'returns',
  Examples = 'examples',
  Throws = 'throws',
  SeeAlso = 'see-also',
  TypeParameters = 'type-parameters',
}

/**
 * Section value object
 */
export class Section {
  constructor(
    public readonly type: SectionType,
    public readonly title: string,
    public readonly content: string,
    public readonly order: number
  ) {}
}

/**
 * Documentation metadata
 */
export class DocumentationMetadata {
  constructor(
    public readonly generatedAt: Date,
    public readonly generator: string,
    public readonly version: string
  ) {}
}

/**
 * Documentation aggregate root
 */
export class Documentation {
  private sections: Section[] = [];

  constructor(
    public readonly id: DocumentationId,
    public readonly sourceAnalysisId: SourceAnalysisId,
    public readonly format: OutputFormat,
    public readonly version: Version,
    public readonly metadata: DocumentationMetadata
  ) {}

  addSection(section: Section): void {
    this.sections.push(section);
    this.sections.sort((a, b) => a.order - b.order);
  }

  getSections(): Section[] {
    return [...this.sections];
  }

  getSectionByType(type: SectionType): Section | null {
    return this.sections.find((s) => s.type === type) || null;
  }

  render(renderer: Renderer): string {
    return renderer.render(this);
  }
}

/**
 * Renderer interface
 */
export interface Renderer {
  render(doc: Documentation): string;
}
