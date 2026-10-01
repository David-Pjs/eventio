import { describe, expect, it } from 'vitest';

import { COLLECTORS, selectCollectors } from '../src/collectors';

describe('selectCollectors', () => {
  it('runs only public-safe collectors by default', () => {
    const names = selectCollectors(COLLECTORS, false).map((collector) => collector.name);
    expect(names).not.toContain('eventbrite');
    expect(names).toContain('luma');
    expect(names).toContain('devpost');
  });

  it('includes private collectors when asked for a local run', () => {
    const names = selectCollectors(COLLECTORS, true).map((collector) => collector.name);
    expect(names).toContain('eventbrite');
    expect(names.length).toBe(COLLECTORS.length);
  });

  it('marks eventbrite as not public-safe', () => {
    expect(COLLECTORS.find((collector) => collector.name === 'eventbrite')?.publicSafe).toBe(false);
  });
});
