import { describe, expect, it } from 'vitest';

import { hasMeaningfulChange, reconcile } from '../src/reconcile';
import type { RadarSnapshot } from '../src/reconcile';
import type { Opportunity, SourceReport } from '../src/types';

const NOW = new Date('2026-10-10T12:00:00.000Z');
const FUTURE = '2026-12-01T00:00:00.000Z';

const make = (id: string, source = 'luma', overrides: Partial<Opportunity> = {}): Opportunity => ({
  id,
  title: id,
  kind: 'event',
  scope: 'nigeria',
  mode: 'in-person',
  startsAt: FUTURE,
  deadline: null,
  location: null,
  url: `https://e.com/${id}`,
  source,
  summary: null,
  image: null,
  tags: [],
  isFree: null,
  prize: null,
  ...overrides,
});

const report = (overrides: Partial<SourceReport> = {}): SourceReport => ({
  name: 'luma',
  status: 'ok',
  count: 3,
  carriedOver: 0,
  error: null,
  lastSuccessAt: '2026-10-10T06:00:00.000Z',
  consecutiveFailures: 0,
  ...overrides,
});

const previous = (items: Opportunity[], sources: SourceReport[]): RadarSnapshot => ({
  generatedAt: '2026-10-10T06:00:00.000Z',
  sources,
  items,
});

const prevItems = [make('a'), make('b'), make('c')];
const outcome = (items: Opportunity[], failures: string[] = []) => ({
  name: 'luma',
  sources: ['luma'],
  result: { items, failures },
});

describe('reconcile', () => {
  it('uses only fresh items when a source is healthy', () => {
    const { snapshot } = reconcile(previous(prevItems, [report()]), [outcome([make('d')])], NOW);
    expect(snapshot.items.map((i) => i.id)).toEqual(['d']);
    expect(snapshot.sources[0]).toMatchObject({ status: 'ok', count: 1, carriedOver: 0, consecutiveFailures: 0 });
  });

  it('keeps previous items when a source is completely down', () => {
    const { snapshot, allDown } = reconcile(
      previous(prevItems, [report()]),
      [outcome([], ['q1: timeout', 'q2: timeout'])],
      NOW,
    );
    expect(snapshot.items.map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
    expect(snapshot.sources[0]).toMatchObject({ status: 'down', carriedOver: 3, consecutiveFailures: 1 });
    expect(snapshot.sources[0].lastSuccessAt).toBe('2026-10-10T06:00:00.000Z');
    expect(allDown).toBe(true);
  });

  it('treats a suddenly empty source as down when it used to have items', () => {
    const { snapshot } = reconcile(previous(prevItems, [report()]), [outcome([])], NOW);
    expect(snapshot.sources[0].status).toBe('down');
    expect(snapshot.sources[0].error).toBe('returned no items');
    expect(snapshot.items).toHaveLength(3);
  });

  it('accepts an empty source when it had almost nothing before', () => {
    const { snapshot } = reconcile(previous([make('a')], [report({ count: 1 })]), [outcome([])], NOW);
    expect(snapshot.sources[0].status).toBe('ok');
    expect(snapshot.items).toEqual([]);
  });

  it('unions fresh and previous items when a source is degraded', () => {
    const { snapshot } = reconcile(
      previous(prevItems, [report()]),
      [outcome([make('a'), make('z')], ['q2: 500'])],
      NOW,
    );
    expect(snapshot.items.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'z']);
    expect(snapshot.sources[0]).toMatchObject({ status: 'degraded', consecutiveFailures: 1 });
    expect(snapshot.sources[0].lastSuccessAt).toBe(NOW.toISOString());
  });

  it('prefers the fresh copy of a duplicate url', () => {
    const { snapshot } = reconcile(
      previous([make('a', 'luma', { title: 'old title' })], [report()]),
      [outcome([make('a', 'luma', { title: 'new title' })], ['q2: 500'])],
      NOW,
    );
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].title).toBe('new title');
  });

  it('stops carrying a source that has been down for more than a week', () => {
    const stale = report({ lastSuccessAt: '2026-10-01T00:00:00.000Z', consecutiveFailures: 20 });
    const { snapshot } = reconcile(previous(prevItems, [stale]), [outcome([], ['down'])], NOW);
    expect(snapshot.items).toEqual([]);
    expect(snapshot.sources[0]).toMatchObject({ status: 'down', carriedOver: 0, consecutiveFailures: 21 });
  });

  it('does not carry items that belong to other sources', () => {
    const mixed = [make('a'), make('x', 'devpost')];
    const { snapshot } = reconcile(previous(mixed, [report()]), [outcome([], ['down'])], NOW);
    expect(snapshot.items.map((i) => i.id)).toEqual(['a']);
  });

  it('drops carried items whose date has passed', () => {
    const old = make('old', 'luma', { startsAt: '2026-10-01T00:00:00.000Z' });
    const { snapshot } = reconcile(previous([old, make('a'), make('b')], [report()]), [outcome([], ['down'])], NOW);
    expect(snapshot.items.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('is not allDown while at least one source is up', () => {
    const devpost = { name: 'devpost', sources: ['devpost'], result: { items: [make('p', 'devpost')], failures: [] } };
    const { allDown } = reconcile(previous(prevItems, [report()]), [outcome([], ['down']), devpost], NOW);
    expect(allDown).toBe(false);
  });

  it('works on a first run with no previous data', () => {
    const { snapshot } = reconcile(previous([], []), [outcome([make('a')])], NOW);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.sources[0].lastSuccessAt).toBe(NOW.toISOString());
  });
});

describe('reconcile collapse guard', () => {
  const many = Array.from({ length: 20 }, (_, index) => make(`old${index}`));

  it('treats a sudden collapse to a fraction of the old count as degraded and keeps the old items', () => {
    const { snapshot } = reconcile(previous(many, [report({ count: 20 })]), [outcome([make('fresh')])], NOW);
    expect(snapshot.sources[0].status).toBe('degraded');
    expect(snapshot.sources[0].error).toBe('returned far fewer items than before');
    expect(snapshot.items).toHaveLength(21);
  });

  it('accepts a normal decrease', () => {
    const fresh = Array.from({ length: 15 }, (_, index) => make(`new${index}`));
    const { snapshot } = reconcile(previous(many, [report({ count: 20 })]), [outcome(fresh)], NOW);
    expect(snapshot.sources[0].status).toBe('ok');
    expect(snapshot.items).toHaveLength(15);
  });

  it('does not flag small sources, where a swing is normal', () => {
    const { snapshot } = reconcile(previous(prevItems, [report()]), [outcome([make('x')])], NOW);
    expect(snapshot.sources[0].status).toBe('ok');
  });
});

describe('hasMeaningfulChange', () => {
  const base = previous(prevItems, [report()]);

  it('ignores timestamps and failure counters', () => {
    const next = previous(prevItems, [report({ lastSuccessAt: '2026-10-10T12:00:00.000Z' })]);
    expect(hasMeaningfulChange(base, { ...next, generatedAt: 'later' })).toBe(false);
  });

  it('detects new items', () => {
    expect(hasMeaningfulChange(base, previous([...prevItems, make('d')], [report()]))).toBe(true);
  });

  it('detects a source going down', () => {
    expect(hasMeaningfulChange(base, previous(prevItems, [report({ status: 'down' })]))).toBe(true);
  });
});
