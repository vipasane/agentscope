/**
 * TSDoc extractor
 * Parses TSDoc/JSDoc comments and extracts structured documentation
 */

import * as ts from 'typescript';
import { TSDocParser, ParserContext } from '@microsoft/tsdoc';
import {
  TSDocComment,
  Parameter,
  Returns,
  CodeExample,
  ThrowsClause,
  CustomTag,
} from '../domain/source-analysis/entities.js';

export class TSDocExtractor {
  private tsdocParser: TSDocParser;

  constructor() {
    this.tsdocParser = new TSDocParser();
  }

  /**
   * Extract TSDoc comment from a TypeScript node
   */
  extract(node: ts.Node, sourceFile: ts.SourceFile): TSDocComment | null {
    // Get JSDoc comment ranges
    const commentRanges = this.getJSDocCommentRanges(node, sourceFile);
    if (commentRanges.length === 0) return null;

    // Parse the first comment
    const commentRange = commentRanges[0];
    const commentText = sourceFile.text.substring(commentRange.pos, commentRange.end);

    // Parse with TSDoc parser
    const parserContext: ParserContext = this.tsdocParser.parseString(commentText);
    const docComment = parserContext.docComment;

    // Extract summary and description
    const summary = this.extractSummary(docComment);
    const description = this.extractDescription(docComment);

    // Extract parameters
    const parameters = this.extractParameters(docComment, node);

    // Extract returns
    const returns = this.extractReturns(docComment);

    // Extract examples
    const examples = this.extractExamples(docComment);

    // Extract throws
    const throws = this.extractThrows(docComment);

    // Extract custom tags
    const tags = this.extractCustomTags(docComment);

    // Extract special tags
    const deprecated = this.extractDeprecated(docComment);
    const since = this.extractSince(docComment);
    const seeAlso = this.extractSeeAlso(docComment);

    return new TSDocComment(
      summary,
      description,
      parameters,
      returns,
      examples,
      throws,
      tags,
      deprecated,
      since,
      seeAlso
    );
  }

  /**
   * Get JSDoc comment ranges for a node
   */
  private getJSDocCommentRanges(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): ts.CommentRange[] {
    const ranges: ts.CommentRange[] = [];
    const nodeStart = node.getFullStart();
    const triviaText = sourceFile.text.substring(nodeStart, node.getStart());

    const triviaRanges = ts.getLeadingCommentRanges(triviaText, 0) || [];

    for (const range of triviaRanges) {
      const commentText = triviaText.substring(range.pos, range.end);
      if (commentText.startsWith('/**') || commentText.startsWith('/*')) {
        ranges.push({
          ...range,
          pos: nodeStart + range.pos,
          end: nodeStart + range.end,
        });
      }
    }

    return ranges;
  }

  /**
   * Extract summary section
   */
  private extractSummary(docComment: any): string {
    if (!docComment.summarySection) return '';
    return this.renderDocNodes(docComment.summarySection.nodes);
  }

  /**
   * Extract description (remarks section)
   */
  private extractDescription(docComment: any): string {
    const remarksBlock = docComment.remarksBlock;
    if (!remarksBlock) return '';
    return this.renderDocNodes(remarksBlock.content.nodes);
  }

  /**
   * Extract parameters
   */
  private extractParameters(docComment: any, node: ts.Node): Parameter[] {
    const params: Parameter[] = [];
    const paramBlocks = docComment.params?.blocks || [];

    for (const block of paramBlocks) {
      const name = block.parameterName;
      const description = this.renderDocNodes(block.content.nodes);

      // Try to get type from TypeScript AST
      const type = this.extractParameterType(node, name);
      const optional = this.isParameterOptional(node, name);
      const defaultValue = this.extractParameterDefault(node, name);

      params.push(new Parameter(name, type, description, optional, defaultValue));
    }

    return params;
  }

  /**
   * Extract return information
   */
  private extractReturns(docComment: any): Returns | null {
    const returnsBlock = docComment.returnsBlock;
    if (!returnsBlock) return null;

    const description = this.renderDocNodes(returnsBlock.content.nodes);
    return new Returns('void', description); // Type will be filled by TypeScript analysis
  }

  /**
   * Extract code examples
   */
  private extractExamples(docComment: any): CodeExample[] {
    const examples: CodeExample[] = [];
    const exampleBlocks = docComment.customBlocks?.filter(
      (b: any) => b.blockTag.tagName === '@example'
    ) || [];

    for (const block of exampleBlocks) {
      const content = this.renderDocNodes(block.content.nodes);
      const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);

      if (codeMatch) {
        const language = codeMatch[1] || 'typescript';
        const code = codeMatch[2].trim();
        examples.push(new CodeExample(code, language));
      }
    }

    return examples;
  }

  /**
   * Extract throws clauses
   */
  private extractThrows(docComment: any): ThrowsClause[] {
    const throws: ThrowsClause[] = [];
    const throwsBlocks = docComment.customBlocks?.filter(
      (b: any) => b.blockTag.tagName === '@throws'
    ) || [];

    for (const block of throwsBlocks) {
      const content = this.renderDocNodes(block.content.nodes);
      // Try to extract error type from content
      const typeMatch = content.match(/(\w+Error)/);
      const type = typeMatch ? typeMatch[1] : 'Error';

      throws.push(new ThrowsClause(type, content));
    }

    return throws;
  }

  /**
   * Extract custom tags
   */
  private extractCustomTags(docComment: any): CustomTag[] {
    const tags: CustomTag[] = [];
    const customBlocks = docComment.customBlocks || [];

    for (const block of customBlocks) {
      const tagName = block.blockTag.tagName;
      // Skip standard tags
      if (['@example', '@throws', '@param', '@returns'].includes(tagName)) {
        continue;
      }

      const value = this.renderDocNodes(block.content.nodes);
      tags.push(new CustomTag(tagName.substring(1), value));
    }

    return tags;
  }

  /**
   * Extract deprecated tag
   */
  private extractDeprecated(docComment: any): string | undefined {
    const deprecatedBlock = docComment.deprecatedBlock;
    if (!deprecatedBlock) return undefined;
    return this.renderDocNodes(deprecatedBlock.content.nodes);
  }

  /**
   * Extract since tag
   */
  private extractSince(docComment: any): string | undefined {
    const customBlocks = docComment.customBlocks || [];
    const sinceBlock = customBlocks.find((b: any) => b.blockTag.tagName === '@since');
    if (!sinceBlock) return undefined;
    return this.renderDocNodes(sinceBlock.content.nodes);
  }

  /**
   * Extract see also references
   */
  private extractSeeAlso(docComment: any): string[] | undefined {
    const customBlocks = docComment.customBlocks || [];
    const seeBlocks = customBlocks.filter((b: any) => b.blockTag.tagName === '@see');

    if (seeBlocks.length === 0) return undefined;

    return seeBlocks.map((b: any) => this.renderDocNodes(b.content.nodes));
  }

  /**
   * Render doc nodes to string
   */
  private renderDocNodes(nodes: any[]): string {
    return nodes.map((node: any) => node.toString()).join('');
  }

  /**
   * Extract parameter type from TypeScript AST
   */
  private extractParameterType(node: ts.Node, paramName: string): string {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const param = node.parameters.find(
        (p) => ts.isIdentifier(p.name) && p.name.text === paramName
      );
      if (param && param.type) {
        return param.type.getText();
      }
    }
    return 'unknown';
  }

  /**
   * Check if parameter is optional
   */
  private isParameterOptional(node: ts.Node, paramName: string): boolean {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const param = node.parameters.find(
        (p) => ts.isIdentifier(p.name) && p.name.text === paramName
      );
      return param?.questionToken !== undefined || param?.initializer !== undefined;
    }
    return false;
  }

  /**
   * Extract parameter default value
   */
  private extractParameterDefault(node: ts.Node, paramName: string): string | undefined {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const param = node.parameters.find(
        (p) => ts.isIdentifier(p.name) && p.name.text === paramName
      );
      if (param?.initializer) {
        return param.initializer.getText();
      }
    }
    return undefined;
  }
}
