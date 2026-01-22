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
    expect(sanitizeId('end')).toBe('end_node');
    expect(sanitizeId('graph')).toBe('graph_node');
    expect(sanitizeId('subgraph')).toBe('subgraph_node');
    expect(sanitizeId('style')).toBe('style_node');
    expect(sanitizeId('class')).toBe('class_node');
    expect(sanitizeId('classDef')).toBe('classDef_node');
    expect(sanitizeId('click')).toBe('click_node');
  });

  it('should limit length to 50 characters', () => {
    const longId = 'a'.repeat(60);
    const result = sanitizeId(longId);
    expect(result.length).toBe(50);
  });

  it('should handle combination of issues', () => {
    expect(sanitizeId('123-agent.name')).toBe('n_123_agent_name');
    expect(sanitizeId('end-node')).toBe('end_node_node');
  });

  it('should preserve valid alphanumeric characters', () => {
    expect(sanitizeId('agent123')).toBe('agent123');
    expect(sanitizeId('MyAgent')).toBe('MyAgent');
  });

  it('should handle empty string', () => {
    expect(sanitizeId('')).toBe('');
  });

  it('should handle underscores', () => {
    expect(sanitizeId('agent_name')).toBe('agent_name');
  });

  it('should handle mixed case reserved words', () => {
    expect(sanitizeId('End')).toBe('end_node');
    expect(sanitizeId('GRAPH')).toBe('graph_node');
  });
});

describe('sanitizeNodeLabel', () => {
  it('should escape special markdown chars', () => {
    expect(sanitizeNodeLabel('agent [test]')).toBe('agent \\[test\\]');
    expect(sanitizeNodeLabel('agent (test)')).toBe('agent \\(test\\)');
    expect(sanitizeNodeLabel('agent {test}')).toBe('agent \\{test\\}');
    expect(sanitizeNodeLabel('agent <test>')).toBe('agent \\<test\\>');
  });

  it('should escape quotes', () => {
    expect(sanitizeNodeLabel('agent "test"')).toBe('agent \\"test\\"');
    expect(sanitizeNodeLabel("agent 'test'")).toBe("agent \\'test\\'");
  });

  it('should escape backticks', () => {
    expect(sanitizeNodeLabel('agent `test`')).toBe('agent \\`test\\`');
  });

  it('should block directive patterns', () => {
    expect(sanitizeNodeLabel('%%{init}')).toBe('');
    expect(sanitizeNodeLabel('%%init')).toBe('');
    expect(sanitizeNodeLabel('normal %%{init}')).toBe('normal ');
  });

  it('should block script tags', () => {
    expect(sanitizeNodeLabel('<script>alert(1)</script>')).toBe('');
    expect(sanitizeNodeLabel('text <script>bad</script> more')).toBe('text  more');
  });

  it('should block javascript protocol', () => {
    expect(sanitizeNodeLabel('javascript:alert(1)')).toBe('');
    expect(sanitizeNodeLabel('text javascript:bad')).toBe('text ');
  });

  it('should block onclick handlers', () => {
    expect(sanitizeNodeLabel('onclick=alert(1)')).toBe('');
    expect(sanitizeNodeLabel('text onclick=bad more')).toBe('text  more');
  });

  it('should limit length to 100 characters', () => {
    const longLabel = 'a'.repeat(120);
    const result = sanitizeNodeLabel(longLabel);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should handle combination of threats', () => {
    const malicious = '<script>alert(1)</script> %%{init} javascript:bad';
    const result = sanitizeNodeLabel(malicious);
    expect(result).toBe('  ');
  });

  it('should preserve safe content', () => {
    expect(sanitizeNodeLabel('Safe agent name')).toBe('Safe agent name');
    expect(sanitizeNodeLabel('Agent-123')).toBe('Agent-123');
  });

  it('should handle empty string', () => {
    expect(sanitizeNodeLabel('')).toBe('');
  });

  it('should handle newlines and tabs', () => {
    const result = sanitizeNodeLabel('line1\nline2\tline3');
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\t');
  });
});

describe('validateThemeName', () => {
  const allowedThemes = ['default', 'forest', 'dark', 'neutral', 'base', 'custom'];

  it('should accept allowlisted themes', () => {
    expect(validateThemeName('default', allowedThemes)).toBe('default');
    expect(validateThemeName('forest', allowedThemes)).toBe('forest');
    expect(validateThemeName('dark', allowedThemes)).toBe('dark');
    expect(validateThemeName('neutral', allowedThemes)).toBe('neutral');
    expect(validateThemeName('base', allowedThemes)).toBe('base');
    expect(validateThemeName('custom', allowedThemes)).toBe('custom');
  });

  it('should reject unknown themes and return default', () => {
    expect(validateThemeName('malicious', allowedThemes)).toBe('default');
    expect(validateThemeName('unknown', allowedThemes)).toBe('default');
    expect(validateThemeName('', allowedThemes)).toBe('default');
  });

  it('should be case sensitive', () => {
    expect(validateThemeName('Default', allowedThemes)).toBe('default');
    expect(validateThemeName('DARK', allowedThemes)).toBe('default');
  });

  it('should handle injection attempts', () => {
    expect(validateThemeName('dark"; alert(1); "', allowedThemes)).toBe('default');
    expect(validateThemeName('dark\'||alert(1)||\'', allowedThemes)).toBe('default');
  });

  it('should use default when allowlist is empty', () => {
    expect(validateThemeName('forest', [])).toBe('default');
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

  it('should handle whitespace variations', () => {
    expect(detectInjectionPatterns('on click = alert(1)')).toBe(true);
    expect(detectInjectionPatterns('< script >')).toBe(true);
  });
});
