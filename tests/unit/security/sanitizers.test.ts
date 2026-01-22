import { describe, it, expect } from 'vitest';
import { sanitizeId, sanitizeNodeLabel, validateThemeName, detectInjectionPatterns } from '../../../src/core/security/sanitizers.js';

describe('sanitizeId', () => {
  it('should replace special characters with underscores', () => {
    expect(sanitizeId('agent-name')).toBe('agent_name');
    expect(sanitizeId('agent.name')).toBe('agent_name');
    expect(sanitizeId('agent name')).toBe('agent_name');
    expect(sanitizeId('agent@name')).toBe('agent_name');
  });

  it('should prefix numeric starts with n_', () => {
    expect(sanitizeId('123agent')).toBe('n_123agent');
    expect(sanitizeId('0agent')).toBe('n_0agent');
  });

  it('should suffix reserved words with _node', () => {
    // Reserved words (case-insensitive check on the sanitized ID)
    expect(sanitizeId('end')).toBe('end_node');
    expect(sanitizeId('graph')).toBe('graph_node');
    expect(sanitizeId('subgraph')).toBe('subgraph_node');
    expect(sanitizeId('style')).toBe('style_node');
    expect(sanitizeId('class')).toBe('class_node');
    expect(sanitizeId('click')).toBe('click_node');
    expect(sanitizeId('default')).toBe('default_node');
  });

  it('should limit length to 50 characters', () => {
    const longId = 'a'.repeat(60);
    const result = sanitizeId(longId);
    expect(result.length).toBe(50);
  });

  it('should handle combination of issues', () => {
    expect(sanitizeId('123-agent.name')).toBe('n_123_agent_name');
    // end-node becomes end_node, but 'end_node' itself is not reserved
    expect(sanitizeId('end-node')).toBe('end_node');
  });

  it('should preserve valid alphanumeric characters', () => {
    expect(sanitizeId('agent123')).toBe('agent123');
    expect(sanitizeId('MyAgent')).toBe('MyAgent');
  });

  it('should return unknown_node for empty string', () => {
    expect(sanitizeId('')).toBe('unknown_node');
  });

  it('should handle underscores', () => {
    expect(sanitizeId('agent_name')).toBe('agent_name');
  });

  it('should handle mixed case reserved words', () => {
    // Case-insensitive check, but original case preserved with suffix
    expect(sanitizeId('End')).toBe('End_node');
    expect(sanitizeId('GRAPH')).toBe('GRAPH_node');
  });
});

describe('sanitizeNodeLabel', () => {
  it('should escape brackets and braces', () => {
    expect(sanitizeNodeLabel('agent [test]')).toBe('agent \\[test\\]');
    expect(sanitizeNodeLabel('agent (test)')).toBe('agent \\(test\\)');
    expect(sanitizeNodeLabel('agent {test}')).toBe('agent \\{test\\}');
  });

  it('should remove HTML tags', () => {
    // HTML tags are removed but content is kept
    expect(sanitizeNodeLabel('agent <test>')).not.toContain('<');
    expect(sanitizeNodeLabel('<b>bold</b>')).toBe('bold');
  });

  it('should escape double quotes', () => {
    expect(sanitizeNodeLabel('agent "test"')).toBe('agent \\"test\\"');
  });

  it('should preserve single quotes and backticks', () => {
    // These aren't escaped by the current implementation
    expect(sanitizeNodeLabel("agent 'test'")).toBe("agent 'test'");
    expect(sanitizeNodeLabel('agent `test`')).toBe('agent `test`');
  });

  it('should remove directive patterns', () => {
    // Directives are stripped
    const result1 = sanitizeNodeLabel('%%{init}');
    expect(result1).not.toContain('%%');

    const result2 = sanitizeNodeLabel('normal %%{init}');
    expect(result2).not.toContain('%%{');
    expect(result2).toContain('normal');
  });

  it('should remove script tags and keep content', () => {
    const result = sanitizeNodeLabel('<script>alert(1)</script>');
    expect(result).toBe('alert\\(1\\)');

    const result2 = sanitizeNodeLabel('text <script>bad</script> more');
    expect(result2).toBe('text bad more');
  });

  it('should remove javascript protocol', () => {
    const result = sanitizeNodeLabel('javascript:alert(1)');
    expect(result).not.toContain('javascript:');
  });

  it('should remove onclick handlers', () => {
    const result = sanitizeNodeLabel('onclick=alert(1)');
    expect(result).not.toContain('onclick');
  });

  it('should limit length to 100 characters', () => {
    const longLabel = 'a'.repeat(120);
    const result = sanitizeNodeLabel(longLabel);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should handle combination of threats', () => {
    const malicious = '<script>alert(1)</script> %%{init} javascript:bad';
    const result = sanitizeNodeLabel(malicious);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('%%{');
  });

  it('should preserve safe content', () => {
    expect(sanitizeNodeLabel('Safe agent name')).toBe('Safe agent name');
    expect(sanitizeNodeLabel('Agent-123')).toBe('Agent-123');
  });

  it('should handle empty string', () => {
    expect(sanitizeNodeLabel('')).toBe('');
  });

  it('should preserve newlines and tabs', () => {
    // The current implementation doesn't strip newlines/tabs
    const result = sanitizeNodeLabel('line1\nline2\tline3');
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    expect(result).toContain('line3');
  });
});

describe('validateThemeName', () => {
  it('should accept allowlisted themes', () => {
    // validateThemeName takes only theme name, checks against built-in allowlist
    expect(validateThemeName('light')).toBe(true);
    expect(validateThemeName('dark')).toBe(true);
    expect(validateThemeName('high-contrast-light')).toBe(true);
    expect(validateThemeName('high-contrast-dark')).toBe(true);
    expect(validateThemeName('colorblind-light')).toBe(true);
    expect(validateThemeName('colorblind-dark')).toBe(true);
  });

  it('should reject unknown themes', () => {
    expect(validateThemeName('malicious')).toBe(false);
    expect(validateThemeName('unknown')).toBe(false);
    expect(validateThemeName('forest')).toBe(false);
    expect(validateThemeName('default')).toBe(false);
  });

  it('should handle empty and invalid inputs', () => {
    expect(validateThemeName('')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(validateThemeName('Light')).toBe(true);
    expect(validateThemeName('DARK')).toBe(true);
    expect(validateThemeName('HIGH-CONTRAST-LIGHT')).toBe(true);
  });

  it('should reject injection attempts', () => {
    expect(validateThemeName('dark"; alert(1); "')).toBe(false);
    expect(validateThemeName("dark'||alert(1)||'")).toBe(false);
    expect(validateThemeName('light<script>')).toBe(false);
  });
});

describe('detectInjectionPatterns', () => {
  it('should detect %%{ directive', () => {
    expect(detectInjectionPatterns('%%{init}')).toBe(true);
    expect(detectInjectionPatterns('text %%{init: {}} more')).toBe(true);
  });

  it('should detect script tags', () => {
    expect(detectInjectionPatterns('<script>alert(1)</script>')).toBe(true);
    expect(detectInjectionPatterns('text <script> bad')).toBe(true);
    expect(detectInjectionPatterns('</script>')).toBe(true);
  });

  it('should detect javascript protocol', () => {
    expect(detectInjectionPatterns('javascript:alert(1)')).toBe(true);
    expect(detectInjectionPatterns('JAVASCRIPT:bad')).toBe(true);
  });

  it('should detect onclick handlers', () => {
    expect(detectInjectionPatterns('onclick=alert(1)')).toBe(true);
    expect(detectInjectionPatterns('onClick=bad')).toBe(true);
  });

  it('should detect onerror handlers', () => {
    expect(detectInjectionPatterns('onerror=alert(1)')).toBe(true);
    expect(detectInjectionPatterns('onError=bad')).toBe(true);
  });

  it('should detect onload handlers', () => {
    expect(detectInjectionPatterns('onload=alert(1)')).toBe(true);
    expect(detectInjectionPatterns('onLoad=bad')).toBe(true);
  });

  it('should detect eval calls', () => {
    expect(detectInjectionPatterns('eval("code")')).toBe(true);
    expect(detectInjectionPatterns('window.eval')).toBe(true);
  });

  it('should return false for safe content', () => {
    expect(detectInjectionPatterns('Safe agent name')).toBe(false);
    expect(detectInjectionPatterns('normal text')).toBe(false);
    expect(detectInjectionPatterns('agent-123')).toBe(false);
  });

  it('should be case insensitive for protocols', () => {
    expect(detectInjectionPatterns('JAVASCRIPT:alert(1)')).toBe(true);
    expect(detectInjectionPatterns('JavaScript:bad')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(detectInjectionPatterns('')).toBe(false);
  });

  it('should detect combination of patterns', () => {
    expect(detectInjectionPatterns('<script>eval()</script>')).toBe(true);
    expect(detectInjectionPatterns('%%{init} onclick=bad')).toBe(true);
  });

  it('should handle whitespace variations in valid patterns', () => {
    // Event handler with space after = is still valid
    expect(detectInjectionPatterns('onclick= alert(1)')).toBe(true);
    expect(detectInjectionPatterns('onerror =bad')).toBe(true);
    // Script tag variations
    expect(detectInjectionPatterns('<script >')).toBe(true);
    expect(detectInjectionPatterns('< script>')).toBe(false); // Invalid - space before tag name
  });
});
