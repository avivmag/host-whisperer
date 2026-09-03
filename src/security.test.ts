import { describe, expect, it } from 'vitest';
import { compactToolOutput, isSensitiveKey, sanitizeExternalText } from './security';

describe('security helpers', () => {
  it('recognizes secret-like configuration keys', () => {
    expect(isSensitiveKey('API_TOKEN')).toBe(true);
    expect(isSensitiveKey('PUBLIC_SITE_TITLE')).toBe(false);
  });

  it('redacts token-shaped external content and truncates logs', () => {
    expect(sanitizeExternalText('failed with sk-abcdefghijklmnop')).toContain('[REDACTED]');
    expect(sanitizeExternalText('x'.repeat(5000))).toHaveLength(4000);
  });

  it('keeps WebMCP output inside its character budget', () => {
    const result = compactToolOutput({ data: 'x'.repeat(3000) });
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text.length).toBeLessThanOrEqual(1450);
  });
});
