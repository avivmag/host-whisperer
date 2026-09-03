const secretPattern = /(secret|token|password|private[_-]?key|api[_-]?key|credential)/i;
const tokenValuePattern = /(?:sk|ghp|glpat|xox[baprs]|eyJ)[-_A-Za-z0-9.]{12,}/g;

export function isSensitiveKey(key: string): boolean {
  return secretPattern.test(key);
}

export function sanitizeExternalText(value: string, maxLength = 4000): string {
  const redacted = value.replace(tokenValuePattern, '[REDACTED]');
  return redacted.slice(0, maxLength);
}

export function compactToolOutput<T>(value: T, maxLength = 1450) {
  const serialized = JSON.stringify(value);
  const text = serialized.length <= maxLength
    ? serialized
    : JSON.stringify({ truncated: true, preview: serialized.slice(0, maxLength - 45) });
  return { content: [{ type: 'text' as const, text }] };
}
