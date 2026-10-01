const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 800;
const SERVER_ERROR_FLOOR = 500;
const RATE_LIMITED = 429;
const RATE_LIMIT_DELAY_FACTOR = 5;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`${url} responded ${status}`);
    this.name = 'HttpError';
  }
}

export const isRetryable = (error: unknown): boolean =>
  !(error instanceof HttpError) || error.status === RATE_LIMITED || error.status >= SERVER_ERROR_FLOOR;

interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  task: () => Promise<T>,
  { attempts = DEFAULT_ATTEMPTS, baseDelayMs = DEFAULT_BASE_DELAY_MS, sleep = defaultSleep }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      const factor = error instanceof HttpError && error.status === RATE_LIMITED ? RATE_LIMIT_DELAY_FACTOR : 1;
      await sleep(baseDelayMs * factor * 2 ** (attempt - 1));
    }
  }
}
