import { describe, expect, it } from 'vitest';
import { compactToolOutput, containsSensitiveValue, isSensitiveKey, sanitizeExternalText, sanitizeExternalUrl } from './security';

describe('security helpers', () => {
  it('recognizes secret-like configuration keys', () => {
    expect(isSensitiveKey('API_TOKEN')).toBe(true);
    expect(isSensitiveKey('CART_SCHEMA_VERSION')).toBe(false);
    expect(containsSensitiveValue('ghp_abcdefghijklmnop')).toBe(true);
  });

  it('redacts token-shaped external content and truncates logs', () => {
    expect(sanitizeExternalText('failed with sk-abcdefghijklmnop')).toContain('[REDACTED]');
    expect(sanitizeExternalText('x'.repeat(5000))).toHaveLength(4000);
  });

  it('only preserves web URLs from provider output', () => {
    expect(sanitizeExternalUrl('https://example.com/status')).toBe('https://example.com/status');
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalUrl('not a URL')).toBeUndefined();
  });

  it('keeps WebMCP output inside its character budget', () => {
    const result = compactToolOutput({ data: 'x'.repeat(3000) });
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text.length).toBeLessThanOrEqual(1450);
  });
});
