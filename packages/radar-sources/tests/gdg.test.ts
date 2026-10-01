import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { chapterEventsUrl, parseGdgChapters, parseGdgEvents, tooManyFailures } from '../src/gdg';

const chaptersBody = JSON.parse(readFileSync(new URL('./fixtures/gdg-chapters.json', import.meta.url), 'utf8'));
const eventsBody = JSON.parse(readFileSync(new URL('./fixtures/gdg-events.json', import.meta.url), 'utf8'));
const abuja = { id: 569, title: 'GDG Abuja', city: 'Abuja' };

describe('parseGdgChapters', () => {
  it('keeps only nigerian chapters', () => {
    const { chapters } = parseGdgChapters(chaptersBody);
    expect(chapters).toHaveLength(3);
    expect(chapters.every((chapter) => typeof chapter.id === 'number')).toBe(true);
    expect(chapters[0]).toEqual({ id: 756, title: 'GDG Aba', city: 'Aba' });
  });

  it('reports the next page when there is one', () => {
    expect(parseGdgChapters(chaptersBody).nextPage).toBe(2);
    expect(parseGdgChapters({ ...chaptersBody, pagination: { next_page: null } }).nextPage).toBeNull();
  });

  it('survives an unexpected payload', () => {
    expect(parseGdgChapters({})).toEqual({ chapters: [], nextPage: null });
  });
});

describe('parseGdgEvents', () => {
  it('maps a devfest to a nigerian in-person event with its registration link', () => {
    const [first] = parseGdgEvents(eventsBody, abuja);
    expect(first.title).toBe('DevFest Abuja 2026: Unleash Your Tech Potential');
    expect(first.source).toBe('gdg');
    expect(first.kind).toBe('event');
    expect(first.scope).toBe('nigeria');
    expect(first.city).toBe('Abuja');
    expect(first.mode).toBe('in-person');
    expect(first.url).toBe('https://gdg.community.dev/e/m6wc2p/');
    expect(first.startsAt).toBe('2026-10-30T08:00:00.000Z');
    expect(first.location).toBe('Abuja, Nigeria');
  });

  it('marks ticketed events as not free', () => {
    const [first] = parseGdgEvents(eventsBody, abuja);
    expect(first.isFree).toBe(false);
  });

  it('classifies hackathon titles as hackathons', () => {
    const copy = structuredClone(eventsBody);
    copy.results[0].title = 'Pre-DevFest Hackathon 2026';
    expect(parseGdgEvents(copy, abuja)[0].kind).toBe('hackathon');
  });

  it('treats online audience events as online', () => {
    const copy = structuredClone(eventsBody);
    copy.results[0].audience_type = 'ONLINE';
    expect(parseGdgEvents(copy, abuja)[0].mode).toBe('online');
  });

  it('leaves the city empty for towns outside the supported cities', () => {
    const [first] = parseGdgEvents(eventsBody, { id: 1, title: 'GDG Aba', city: 'Aba' });
    expect(first.city).toBeNull();
    expect(first.location).toBe('Aba, Nigeria');
  });

  it('returns an empty list for an unexpected payload', () => {
    expect(parseGdgEvents({}, abuja)).toEqual([]);
  });
});

describe('chapterEventsUrl', () => {
  it('asks for live events of one chapter', () => {
    expect(chapterEventsUrl(569)).toBe('https://gdg.community.dev/api/event_slim/for_chapter/569/?page_size=50&status=Live');
  });
});

describe('tooManyFailures', () => {
  it('tolerates a few failed chapters', () => {
    expect(tooManyFailures(3, 95)).toBe(false);
    expect(tooManyFailures(0, 95)).toBe(false);
  });

  it('rejects the run once more than a tenth of the chapters failed', () => {
    expect(tooManyFailures(10, 95)).toBe(true);
    expect(tooManyFailures(95, 95)).toBe(true);
  });
});
