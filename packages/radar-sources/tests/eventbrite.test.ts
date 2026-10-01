import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildEventbriteQueries, isRelevantEvent, kindOf, parseEventbritePage } from '../src/eventbrite';

const html = readFileSync(new URL('./fixtures/eventbrite.html', import.meta.url), 'utf8');

describe('parseEventbritePage', () => {
  it('keeps relevant events and drops social or religious noise', () => {
    const titles = parseEventbritePage(html).map((item) => item.title);
    expect(titles).toEqual(['Lagos International Finance Expo 2028', 'SME Africa Summit Lagos 2026 (Founding Edition)']);
  });

  it('maps the core fields and derives an id from the ticket url', () => {
    const [first] = parseEventbritePage(html);
    expect(first.id).toBe('eventbrite-761216086807');
    expect(first.source).toBe('eventbrite');
    expect(first.kind).toBe('event');
    expect(first.scope).toBe('nigeria');
    expect(first.mode).toBe('in-person');
    expect(first.startsAt).toBe('2028-11-17T00:00:00.000Z');
    expect(first.url).toContain('eventbrite');
    expect(first.location).toContain('Landmark Centre');
  });

  it('resolves the city from the region code when the locality is a neighbourhood', () => {
    const [first] = parseEventbritePage(html);
    expect(first.city).toBe('Lagos');
  });

  it('drops events outside Nigeria', () => {
    expect(parseEventbritePage(html.replaceAll('"addressCountry": "NG"', '"addressCountry": "GB"').replaceAll('"addressCountry":"NG"', '"addressCountry":"GB"'))).toEqual([]);
  });

  it('still finds structured data when the script tag has extra attributes', () => {
    const withAttribute = html.replaceAll('<script type="application/ld+json">', '<script nonce="abc" type="application/ld+json" data-x="1">');
    expect(parseEventbritePage(withAttribute)).toHaveLength(2);
  });

  it('returns an empty list for a page without structured data', () => {
    expect(parseEventbritePage('<html></html>')).toEqual([]);
  });
});

describe('isRelevantEvent', () => {
  it('accepts tech, startup and career events', () => {
    expect(isRelevantEvent('Lagos AI Hackathon', '')).toBe(true);
    expect(isRelevantEvent('Weekend workshop', 'learn web development and coding')).toBe(true);
    expect(isRelevantEvent('Startup pitch night', '')).toBe(true);
  });

  it('rejects religious and social events even when a keyword appears', () => {
    expect(isRelevantEvent('Youth Church Conference', '')).toBe(false);
    expect(isRelevantEvent('Movie Night', 'digital projector')).toBe(false);
    expect(isRelevantEvent('20th High School Reunion', '')).toBe(false);
  });

  it('rejects clergy-led mentorship sessions', () => {
    expect(isRelevantEvent('YMF Mentorship and Impartation with Rev Dr Sam Aboyeji', 'career mentorship')).toBe(false);
  });

  it('rejects music, photo and culture events that only say summit', () => {
    expect(isRelevantEvent('The Renewed Musician Summit 2026', 'worship and music')).toBe(false);
    expect(isRelevantEvent('Afroculture Independence Day Free Photo Shoot', 'creative shoot')).toBe(false);
  });

  it('does not accept an event just because it says summit or conference', () => {
    expect(isRelevantEvent('Annual Family Summit', 'a day out')).toBe(false);
  });

  it('does not reject tech events because a word merely contains rev or party', () => {
    expect(isRelevantEvent('Revenue Growth Workshop for Startups', '')).toBe(true);
    expect(isRelevantEvent('Third-party API Integration Masterclass', '')).toBe(true);
    expect(isRelevantEvent('Product Review Bootcamp', '')).toBe(true);
  });

  it('rejects events with no relevant keyword', () => {
    expect(isRelevantEvent('Blood drive', 'donate blood')).toBe(false);
  });
});

describe('kindOf', () => {
  it('classifies hackathons, job posts and ordinary events', () => {
    expect(kindOf('Lagos Hackathon 2026')).toBe('hackathon');
    expect(kindOf('Join our team! Digital marketing sales opportunity')).toBe('job');
    expect(kindOf('We are hiring: junior developers')).toBe('job');
    expect(kindOf('Tech Fellowship 2026:Fully Funded Cybersecurity, Data Science')).toBe('fellowship');
    expect(kindOf('Mastercard Scholarship Info Session')).toBe('scholarship');
    expect(kindOf('Lagos Blockchain Summit')).toBe('event');
  });
});

describe('buildEventbriteQueries', () => {
  it('covers every city with tech and developer searches', () => {
    const urls = buildEventbriteQueries();
    expect(urls).toHaveLength(10);
    expect(urls).toContain('https://www.eventbrite.com/d/nigeria--lagos/tech/');
    expect(urls).toContain('https://www.eventbrite.com/d/nigeria--uyo/developer/');
  });
});
