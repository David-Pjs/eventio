import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseZindiResponse } from '../src/zindi';

const body = JSON.parse(readFileSync(new URL('./fixtures/zindi.json', import.meta.url), 'utf8'));
const NOW = new Date('2026-10-01T00:00:00.000Z');

describe('parseZindiResponse', () => {
  it('keeps only competitions that are open', () => {
    const items = parseZindiResponse(body, NOW);
    expect(items.length).toBe(body.data.filter((c: { open: boolean }) => c.open).length);
    expect(items.length).toBeGreaterThan(0);
  });

  it('maps an open competition to an africa-scoped online hackathon with a zindi link', () => {
    const [first] = parseZindiResponse(body, NOW);
    expect(first.source).toBe('zindi');
    expect(first.kind).toBe('hackathon');
    expect(first.scope).toBe('africa');
    expect(first.mode).toBe('online');
    expect(first.url).toBe(`https://zindi.africa/competitions/${first.id.replace('zindi-', '')}`);
    expect(first.deadline).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(first.tags).toContain('data science');
  });

  it('skips competitions whose end time has already passed', () => {
    const copy = structuredClone(body);
    for (const competition of copy.data) competition.end_time = '2020-01-01T00:00:00.000Z';
    expect(parseZindiResponse(copy, NOW)).toEqual([]);
  });

  it('returns an empty list for an unexpected payload', () => {
    expect(parseZindiResponse({}, NOW)).toEqual([]);
    expect(parseZindiResponse(null, NOW)).toEqual([]);
  });
});
