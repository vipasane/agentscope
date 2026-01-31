/**
 * Tests for Markdown renderer
 */

import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../../src/generator/markdown-renderer.js';
import {
  Symbol,
  SymbolId,
  SymbolKind,
  Declaration,
  TSDocComment,
  Parameter,
  Returns,
  CodeExample,
} from '../../src/domain/source-analysis/entities.js';
import { FilePath } from '../../src/domain/shared/value-objects.js';

describe('MarkdownRenderer', () => {
  const renderer = new MarkdownRenderer();

  it('should render a simple symbol', () => {
    const symbol = new Symbol(
      new SymbolId(),
      'TestClass',
      SymbolKind.Class,
      new Declaration(new FilePath('/test/file.ts'), 1, 1, 10, 1),
      new TSDocComment(
        'A test class',
        'This is a test class for demonstration',
        [],
        null,
        [],
        [],
        []
      ),
      [],
      true,
      ['export']
    );

    const markdown = renderer.renderSymbol(symbol);

    expect(markdown).toContain('# TestClass');
    expect(markdown).toContain('**Type:** class');
    expect(markdown).toContain('A test class');
    expect(markdown).toContain('This is a test class for demonstration');
  });

  it('should render parameters table', () => {
    const symbol = new Symbol(
      new SymbolId(),
      'testFunction',
      SymbolKind.Function,
      new Declaration(new FilePath('/test/file.ts'), 1, 1, 5, 1),
      new TSDocComment(
        'Test function',
        '',
        [
          new Parameter('name', 'string', 'The name parameter', false),
          new Parameter('age', 'number', 'The age parameter', true, '0'),
        ],
        new Returns('void', 'No return value'),
        [],
        [],
        []
      ),
      [],
      true,
      ['export']
    );

    const markdown = renderer.renderSymbol(symbol);

    expect(markdown).toContain('## Parameters');
    expect(markdown).toContain('| Name | Type | Description | Optional | Default |');
    expect(markdown).toContain('`name`');
    expect(markdown).toContain('`string`');
    expect(markdown).toContain('`age`');
    expect(markdown).toContain('`number`');
  });

  it('should render code examples', () => {
    const symbol = new Symbol(
      new SymbolId(),
      'TestClass',
      SymbolKind.Class,
      new Declaration(new FilePath('/test/file.ts'), 1, 1, 10, 1),
      new TSDocComment(
        'Test class',
        '',
        [],
        null,
        [
          new CodeExample(
            'const instance = new TestClass();',
            'typescript',
            'Basic usage'
          ),
        ],
        [],
        []
      ),
      [],
      true,
      ['export']
    );

    const markdown = renderer.renderSymbol(symbol);

    expect(markdown).toContain('## Examples');
    expect(markdown).toContain('### Basic usage');
    expect(markdown).toContain('```typescript');
    expect(markdown).toContain('const instance = new TestClass();');
  });

  it('should render deprecated notice', () => {
    const symbol = new Symbol(
      new SymbolId(),
      'OldClass',
      SymbolKind.Class,
      new Declaration(new FilePath('/test/file.ts'), 1, 1, 10, 1),
      new TSDocComment(
        'Old class',
        '',
        [],
        null,
        [],
        [],
        [],
        'Use NewClass instead'
      ),
      [],
      true,
      ['export']
    );

    const markdown = renderer.renderSymbol(symbol);

    expect(markdown).toContain('⚠️ Deprecated');
    expect(markdown).toContain('Use NewClass instead');
  });

  it('should render type parameters', () => {
    const symbol = new Symbol(
      new SymbolId(),
      'Container',
      SymbolKind.Class,
      new Declaration(new FilePath('/test/file.ts'), 1, 1, 10, 1),
      new TSDocComment('Generic container', '', [], null, [], [], []),
      [
        { name: 'T', constraint: 'object', default: undefined },
        { name: 'U', constraint: undefined, default: 'string' },
      ],
      true,
      ['export']
    );

    const markdown = renderer.renderSymbol(symbol);

    expect(markdown).toContain('## Type Parameters');
    expect(markdown).toContain('`T` extends `object`');
    expect(markdown).toContain('`U` = `string`');
  });
});
