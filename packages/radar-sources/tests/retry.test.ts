import { describe, expect, it, vi } from 'vitest';

import { HttpError, isRetryable, withRetry } from '../src/retry';

const noSleep = vi.fn(async () => {});

describe('withRetry', () => {
  it('returns the first success without sleeping', async () => {
    const sleep = vi.fn(async () => {});
    await expect(withRetry(async () => 'ok', { sleep })).resolves.toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries transient failures with exponential backoff', async () => {
    const sleep = vi.fn(async () => {});
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('network');
        return 'recovered';
      },
      { attempts: 3, baseDelayMs: 100, sleep },
    );
    expect(result).toBe('recovered');
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200]);
  });

  it('waits five times longer after a 429 rate limit', async () => {
    const sleep = vi.fn(async () => {});
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new HttpError(429, 'https://x.test');
        return 'ok';
      },
      { attempts: 3, baseDelayMs: 100, sleep },
    );
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500]);
  });

  it('gives up after the last attempt and rethrows', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('still down');
        },
        { attempts: 3, sleep: noSleep },
      ),
    ).rejects.toThrow('still down');
    expect(calls).toBe(3);
  });

  it('does not retry a 404', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new HttpError(404, 'https://x.test');
        },
        { attempts: 3, sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(HttpError);
    expect(calls).toBe(1);
  });
});

describe('isRetryable', () => {
  it('retries network errors, 429 and 5xx; not other 4xx', () => {
    expect(isRetryable(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryable(new HttpError(429, 'u'))).toBe(true);
    expect(isRetryable(new HttpError(503, 'u'))).toBe(true);
    expect(isRetryable(new HttpError(403, 'u'))).toBe(false);
    expect(isRetryable(new HttpError(404, 'u'))).toBe(false);
  });
});
