import { describe, expect, it } from 'vitest';

import { HttpError } from '../src/retry';
import { runTasks, skipOnStatus } from '../src/resilient';
import type { Opportunity } from '../src/types';

const item = (id: string): Opportunity => ({
  id,
  title: id,
  kind: 'event',
  scope: 'global',
  mode: 'online',
  startsAt: null,
  deadline: null,
  location: null,
  url: `https://e.com/${id}`,
  source: 'test',
  summary: null,
  image: null,
  tags: [],
  isFree: null,
  prize: null,
});

describe('runTasks', () => {
  it('collects items from every task that succeeds', async () => {
    const result = await runTasks([
      { label: 'a', run: async () => [item('1')] },
      { label: 'b', run: async () => [item('2')] },
    ]);
    expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
    expect(result.failures).toEqual([]);
  });

  it('isolates a failing task and reports it', async () => {
    const result = await runTasks([
      { label: 'good', run: async () => [item('1')] },
      {
        label: 'bad',
        run: async () => {
          throw new Error('boom');
        },
      },
    ]);
    expect(result.items.map((i) => i.id)).toEqual(['1']);
    expect(result.failures).toEqual(['bad: boom']);
  });

  it('removes duplicate ids across tasks', async () => {
    const result = await runTasks([
      { label: 'a', run: async () => [item('1')] },
      { label: 'b', run: async () => [item('1'), item('2')] },
    ]);
    expect(result.items.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('reports every failure when all tasks fail', async () => {
    const fail = async () => {
      throw new Error('down');
    };
    const result = await runTasks([
      { label: 'a', run: fail },
      { label: 'b', run: fail },
    ]);
    expect(result.items).toEqual([]);
    expect(result.failures).toHaveLength(2);
  });
});

describe('skipOnStatus', () => {
  it('turns a listed http status into an empty result', async () => {
    const run = skipOnStatus([401, 404], async () => {
      throw new HttpError(401, 'https://x.test');
    });
    await expect(run()).resolves.toEqual([]);
  });

  it('rethrows other failures', async () => {
    const run = skipOnStatus([401], async () => {
      throw new HttpError(500, 'https://x.test');
    });
    await expect(run()).rejects.toBeInstanceOf(HttpError);
  });

  it('passes successful results through', async () => {
    await expect(skipOnStatus([401], async () => [item('1')])()).resolves.toHaveLength(1);
  });
});
