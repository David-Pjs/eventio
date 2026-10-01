import { describe, expect, it } from 'vitest';

import { deckReducer, initialDeck } from '../src/deck';

const LENGTH = 3;

describe('deckReducer', () => {
  it('skip advances, and stops one past the end', () => {
    let state = initialDeck([]);
    state = deckReducer(state, { type: 'skip', length: LENGTH });
    expect(state.index).toBe(1);
    state = deckReducer({ ...state, index: 3 }, { type: 'skip', length: LENGTH });
    expect(state.index).toBe(3);
  });

  it('back goes to the previous card but not below zero', () => {
    expect(deckReducer({ index: 2, saved: [] }, { type: 'back' }).index).toBe(1);
    expect(deckReducer({ index: 0, saved: [] }, { type: 'back' }).index).toBe(0);
  });

  it('save stores the id once and advances', () => {
    const once = deckReducer(initialDeck([]), { type: 'save', id: 'x', length: LENGTH });
    expect(once).toEqual({ index: 1, saved: ['x'] });
    const twice = deckReducer({ ...once, index: 0 }, { type: 'save', id: 'x', length: LENGTH });
    expect(twice.saved).toEqual(['x']);
  });

  it('unsave removes the id without moving', () => {
    expect(deckReducer({ index: 2, saved: ['x', 'y'] }, { type: 'unsave', id: 'x' })).toEqual({ index: 2, saved: ['y'] });
  });

  it('jump and reset set the index', () => {
    expect(deckReducer({ index: 0, saved: [] }, { type: 'jump', index: 2 }).index).toBe(2);
    expect(deckReducer({ index: 2, saved: ['a'] }, { type: 'reset' })).toEqual({ index: 0, saved: ['a'] });
  });

  it('hydrate merges stored ids without duplicates', () => {
    expect(deckReducer({ index: 1, saved: ['a'] }, { type: 'hydrate', saved: ['b', 'a'] })).toEqual({ index: 1, saved: ['b', 'a'] });
  });

  it('never mutates the previous state', () => {
    const state = { index: 0, saved: ['a'] };
    deckReducer(state, { type: 'save', id: 'b', length: LENGTH });
    expect(state).toEqual({ index: 0, saved: ['a'] });
  });
});
