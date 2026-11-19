let cachedCsrfToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error('Unable to initialize security token');
  }
  const data = (await res.json()) as { csrfToken: string };
  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (method !== 'GET' && method !== 'HEAD') {
    const token = await getCsrfToken();
    headers.set('X-CSRF-Token', token);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (res.status === 403 && !headers.has('X-CSRF-Retried')) {
    cachedCsrfToken = null;
    const fresh = await getCsrfToken();
    headers.set('X-CSRF-Token', fresh);
    headers.set('X-CSRF-Retried', '1');
    const retry = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
    const retryData = await retry.json().catch(() => ({}));
    if (!retry.ok) {
      throw new Error(retryData.error || 'Request failed');
    }
    return retryData as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}
