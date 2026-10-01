import { describe, expect, it } from 'vitest';

import { filterOpportunities } from '../src/filter';
import type { Opportunity } from '../src/types';

const make = (overrides: Partial<Opportunity>): Opportunity => ({
  id: 'a',
  title: 'Thing',
  kind: 'event',
  scope: 'global',
  mode: 'online',
  startsAt: null,
  deadline: null,
  location: null,
  url: 'https://example.com/a',
  source: 'test',
  summary: null,
  image: null,
  tags: [],
  isFree: null,
  prize: null,
  ...overrides,
});

const items = [
  make({ id: '1', title: 'Lagos AI Build Day', kind: 'hackathon', scope: 'nigeria', location: 'Yaba, Lagos', city: 'Lagos' }),
  make({ id: '2', title: 'Mastercard Scholars', kind: 'scholarship', scope: 'africa', tags: ['Rwanda'] }),
  make({ id: '3', title: 'Global Web3 Hack', kind: 'hackathon', scope: 'global', prize: '$5,000' }),
];

const ids = (result: Opportunity[]) => result.map((item) => item.id);

describe('filterOpportunities', () => {
  it('returns everything by default', () => {
    expect(ids(filterOpportunities(items, { query: '', scope: 'all', kind: 'all' }))).toEqual(['1', '2', '3']);
  });

  it('naija shows only nigerian items', () => {
    expect(ids(filterOpportunities(items, { query: '', scope: 'nigeria', kind: 'all' }))).toEqual(['1']);
  });

  it('africa includes nigeria and africa, but not global', () => {
    expect(ids(filterOpportunities(items, { query: '', scope: 'africa', kind: 'all' }))).toEqual(['1', '2']);
  });

  it('filters by kind', () => {
    expect(ids(filterOpportunities(items, { query: '', scope: 'all', kind: 'hackathon' }))).toEqual(['1', '3']);
  });

  it('searches title, location, tags and prize case-insensitively', () => {
    expect(ids(filterOpportunities(items, { query: 'yaba', scope: 'all', kind: 'all' }))).toEqual(['1']);
    expect(ids(filterOpportunities(items, { query: 'RWANDA', scope: 'all', kind: 'all' }))).toEqual(['2']);
    expect(ids(filterOpportunities(items, { query: '5,000', scope: 'all', kind: 'all' }))).toEqual(['3']);
  });

  it('combines filters', () => {
    expect(ids(filterOpportunities(items, { query: 'hack', scope: 'africa', kind: 'hackathon' }))).toEqual([]);
  });

  it('filters by nigerian city', () => {
    expect(ids(filterOpportunities(items, { query: '', scope: 'all', kind: 'all', city: 'Lagos' }))).toEqual(['1']);
    expect(ids(filterOpportunities(items, { query: '', scope: 'all', kind: 'all', city: 'Uyo' }))).toEqual([]);
  });
});
