/**
 * Tests for ADR Generator
 * Phase 3 Implementation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateADRIndex,
  formatADRIndex,
  generateADRTemplate,
  type ADR,
  type ADRIndex,
} from '../../src/core/generators/docs/adr-generator.js';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

beforeEach(() => {
  // Create temporary test directory
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentscope-test-'));
});

afterEach(() => {
  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

function createTestADR(
  dir: string,
  filename: string,
  content: string
): void {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function createMockADRContent(
  number: string,
  title: string,
  status: ADR['status'] = 'Accepted'
): string {
  return `---
title: ${title}
status: ${status}
date: 2026-01-25
---

# ${number}: ${title}

## Context

This is a test ADR.
`;
}

// ============================================================================
// Task 3.4: ADR Index Generator Tests
// ============================================================================

describe('generateADRIndex', () => {
  it('should scan ADR directories', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(adrDir, 'ADR-001-test.md', createMockADRContent('ADR-001', 'Test Decision'));

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.adrs.length).toBe(1);
    expect(index.adrs[0].number).toBe('ADR-001');
    expect(index.adrs[0].title).toBe('Test Decision');
  });

  it('should scan multiple ADR directories', () => {
    const adrDir1 = path.join(testDir, 'docs', 'adr');
    const adrDir2 = path.join(testDir, 'docs', 'architecture', 'decisions');

    fs.mkdirSync(adrDir1, { recursive: true });
    fs.mkdirSync(adrDir2, { recursive: true });

    createTestADR(adrDir1, 'ADR-001-test1.md', createMockADRContent('ADR-001', 'Decision 1'));
    createTestADR(adrDir2, 'ADR-002-test2.md', createMockADRContent('ADR-002', 'Decision 2'));

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.adrs.length).toBe(2);
  });

  it('should parse ADR metadata', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(adrDir, 'ADR-001-test.md', createMockADRContent('ADR-001', 'Test Decision', 'Accepted'));

    const index = generateADRIndex({ projectRoot: testDir });
    const adr = index.adrs[0];

    expect(adr.number).toBe('ADR-001');
    expect(adr.title).toBe('Test Decision');
    expect(adr.status).toBe('Accepted');
    expect(adr.date).toBeDefined();
  });

  it('should categorize ADRs by content', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(
      adrDir,
      'ADR-001-architecture.md',
      createMockADRContent('ADR-001', 'Architecture Decision')
    );
    createTestADR(
      adrDir,
      'ADR-002-output.md',
      createMockADRContent('ADR-002', 'Output Format Decision')
    );

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.categories.size).toBeGreaterThan(0);
    expect(index.categories.has('Architecture & Design')).toBe(true);
  });

  it('should determine last ADR number', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(adrDir, 'ADR-001-test.md', createMockADRContent('ADR-001', 'Decision 1'));
    createTestADR(adrDir, 'ADR-005-test.md', createMockADRContent('ADR-005', 'Decision 5'));
    createTestADR(adrDir, 'ADR-003-test.md', createMockADRContent('ADR-003', 'Decision 3'));

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.lastNumber).toBe(5);
  });

  it('should sort ADRs by number', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(adrDir, 'ADR-003-test.md', createMockADRContent('ADR-003', 'Decision 3'));
    createTestADR(adrDir, 'ADR-001-test.md', createMockADRContent('ADR-001', 'Decision 1'));
    createTestADR(adrDir, 'ADR-002-test.md', createMockADRContent('ADR-002', 'Decision 2'));

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.adrs[0].number).toBe('ADR-001');
    expect(index.adrs[1].number).toBe('ADR-002');
    expect(index.adrs[2].number).toBe('ADR-003');
  });

  it('should handle empty directories gracefully', () => {
    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.adrs).toEqual([]);
    expect(index.lastNumber).toBe(0);
    expect(index.categories.size).toBe(0);
  });

  it('should skip README.md files', () => {
    const adrDir = path.join(testDir, 'docs', 'adr');
    fs.mkdirSync(adrDir, { recursive: true });

    createTestADR(adrDir, 'README.md', '# ADR Index');
    createTestADR(adrDir, 'ADR-001-test.md', createMockADRContent('ADR-001', 'Decision 1'));

    const index = generateADRIndex({ projectRoot: testDir });

    expect(index.adrs.length).toBe(1);
    expect(index.adrs[0].number).toBe('ADR-001');
  });
});

// ============================================================================
// Task 3.5: ADR Index Formatter Tests
// ============================================================================

describe('formatADRIndex', () => {
  it('should include ADR index title', () => {
    const index: ADRIndex = {
      adrs: [],
      categories: new Map(),
      lastNumber: 0,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('# Architecture Decision Records (ADRs)');
  });

  it('should include quick stats', () => {
    const index: ADRIndex = {
      adrs: [
        {
          number: 'ADR-001',
          title: 'Test',
          status: 'Accepted',
          date: '2026-01-25',
          filePath: '/test/ADR-001.md',
        },
      ],
      categories: new Map([['Architecture & Design', []]]),
      lastNumber: 1,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('**Total ADRs**: 1');
    expect(markdown).toContain('**Last ADR**: ADR-001');
    expect(markdown).toContain('**Categories**: 1');
  });

  it('should list ADRs by status', () => {
    const index: ADRIndex = {
      adrs: [
        {
          number: 'ADR-001',
          title: 'Accepted Decision',
          status: 'Accepted',
          date: '2026-01-25',
          filePath: '/test/ADR-001.md',
        },
        {
          number: 'ADR-002',
          title: 'Proposed Decision',
          status: 'Proposed',
          date: '2026-01-25',
          filePath: '/test/ADR-002.md',
        },
      ],
      categories: new Map(),
      lastNumber: 2,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('## ADRs by Status');
    expect(markdown).toContain('✅ Accepted');
    expect(markdown).toContain('📝 Proposed');
  });

  it('should list ADRs by category', () => {
    const adr1: ADR = {
      number: 'ADR-001',
      title: 'Architecture Decision',
      status: 'Accepted',
      date: '2026-01-25',
      filePath: '/test/ADR-001.md',
      category: 'Architecture & Design',
    };

    const index: ADRIndex = {
      adrs: [adr1],
      categories: new Map([['Architecture & Design', [adr1]]]),
      lastNumber: 1,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('## ADRs by Category');
    expect(markdown).toContain('### Architecture & Design');
  });

  it('should include chronological list of all ADRs', () => {
    const index: ADRIndex = {
      adrs: [
        {
          number: 'ADR-001',
          title: 'Decision 1',
          status: 'Accepted',
          date: '2026-01-25',
          filePath: '/test/ADR-001.md',
          category: 'General',
        },
        {
          number: 'ADR-002',
          title: 'Decision 2',
          status: 'Proposed',
          date: '2026-01-25',
          filePath: '/test/ADR-002.md',
          category: 'General',
        },
      ],
      categories: new Map(),
      lastNumber: 2,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('## All ADRs (Chronological)');
    expect(markdown).toContain('ADR-001');
    expect(markdown).toContain('ADR-002');
  });

  it('should include instructions for creating new ADRs', () => {
    const index: ADRIndex = {
      adrs: [],
      categories: new Map(),
      lastNumber: 5,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('## Creating a New ADR');
    expect(markdown).toContain('ADR-006');
  });

  it('should include links to ADR files', () => {
    const index: ADRIndex = {
      adrs: [
        {
          number: 'ADR-001',
          title: 'Test',
          status: 'Accepted',
          date: '2026-01-25',
          filePath: '/test/ADR-001-test.md',
        },
      ],
      categories: new Map(),
      lastNumber: 1,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toContain('[ADR-001](./ADR-001-test.md)');
  });

  it('should include timestamp footer', () => {
    const index: ADRIndex = {
      adrs: [],
      categories: new Map(),
      lastNumber: 0,
    };

    const markdown = formatADRIndex(index);

    expect(markdown).toMatch(/Generated by AgentScope on \d{4}-\d{2}-\d{2}/);
  });
});

// ============================================================================
// ADR Template Generator Tests
// ============================================================================

describe('generateADRTemplate', () => {
  it('should generate MADR 3.0 format template', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001');

    expect(template).toContain('---');
    expect(template).toContain('title: Test Decision');
    expect(template).toContain('status: Proposed');
    expect(template).toContain('# ADR-001: Test Decision');
  });

  it('should include all MADR sections', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001');

    expect(template).toContain('## Context and Problem Statement');
    expect(template).toContain('## Decision Drivers');
    expect(template).toContain('## Considered Options');
    expect(template).toContain('## Decision Outcome');
    expect(template).toContain('## Pros and Cons of the Options');
    expect(template).toContain('## Links');
  });

  it('should use custom status when provided', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001', {
      status: 'Accepted',
    });

    expect(template).toContain('status: Accepted');
  });

  it('should use custom date when provided', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001', {
      date: '2025-12-31',
    });

    expect(template).toContain('date: 2025-12-31');
  });

  it('should include deciders when provided', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001', {
      deciders: ['Alice', 'Bob'],
    });

    expect(template).toContain('deciders: Alice, Bob');
  });

  it('should default to current date', () => {
    const template = generateADRTemplate('Test Decision', 'ADR-001');

    const today = new Date().toISOString().split('T')[0];
    expect(template).toContain(`date: ${today}`);
  });
});
