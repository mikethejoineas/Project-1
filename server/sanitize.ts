/**
 * Strips ASCII control characters (preserving newlines/tabs when allowed)
 * and neutralizes angle brackets to prevent stored XSS if ever rendered unsafely.
 */
export function sanitizeString(input: unknown, allowNewlines = false): string {
  if (typeof input !== 'string') return '';
  let cleaned = input.replace(/\0/g, '');
  if (allowNewlines) {
    cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  return cleaned.replace(/[<>]/g, '').trim();
}

export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeString(value, true) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeDeep(v);
    }
    return result as T;
  }
  return value;
}
