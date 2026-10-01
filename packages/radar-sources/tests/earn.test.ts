import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseEarnResponse } from '../src/earn';

const body = JSON.parse(readFileSync(new URL('./fixtures/earn.json', import.meta.url), 'utf8'));

describe('parseEarnResponse', () => {
  it('maps every open listing', () => {
    expect(parseEarnResponse(body)).toHaveLength(body.length);
  });

  it('builds prize, deadline, link and sponsor summary', () => {
    const [first] = parseEarnResponse(body);
    expect(first.source).toBe('superteam-earn');
    expect(first.mode).toBe('online');
    expect(first.prize).toBe('$5,002 USDG');
    expect(first.deadline).toBe('2026-09-30T22:59:59.000Z');
    expect(first.url).toBe(
      'https://superteam.fun/earn/listing/create-a-short-video-explainer-for-hisa-dollar5000-up-for-grabs',
    );
    expect(first.summary).toBe('By Hisa');
  });

  it('scopes listings that mention nigeria to nigeria, others to global', () => {
    const items = parseEarnResponse(body);
    expect(items[0].scope).toBe('nigeria');
    expect(items[1].scope).toBe('global');
  });

  it('classifies hackathon-titled listings as hackathons and the rest as grants', () => {
    const items = parseEarnResponse(body);
    expect(items[0].kind).toBe('grant');
    expect(items[1].kind).toBe('hackathon');
  });

  it('skips listings that are not open', () => {
    const copy = structuredClone(body);
    copy[0].status = 'CLOSED';
    expect(parseEarnResponse(copy)).toHaveLength(body.length - 1);
  });

  it('returns an empty list for an unexpected payload', () => {
    expect(parseEarnResponse({ error: 'x' })).toEqual([]);
  });
});
