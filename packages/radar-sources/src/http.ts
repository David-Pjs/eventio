import { HttpError, withRetry } from './retry';

const USER_AGENT = 'opportunity-radar/0.1 (personal aggregator; every item links back to its source)';
const DEFAULT_TIMEOUT_MS = 20_000;

export async function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  return withRetry(async () => {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new HttpError(response.status, url);
    return response.text();
  });
}

export async function fetchJson<T = unknown>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return JSON.parse(await fetchText(url, timeoutMs)) as T;
}
