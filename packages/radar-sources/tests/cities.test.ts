import { describe, expect, it } from 'vitest';

import { NIGERIAN_CITIES, detectNigerianCity } from '../src/cities';

describe('NIGERIAN_CITIES', () => {
  it('lists the five supported cities', () => {
    expect(NIGERIAN_CITIES).toEqual(['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Uyo']);
  });
});

describe('detectNigerianCity', () => {
  it('matches each city by name', () => {
    expect(detectNigerianCity('Cafe One Yaba, Lagos, Nigeria')).toBe('Lagos');
    expect(detectNigerianCity('Wuse 2, Abuja')).toBe('Abuja');
    expect(detectNigerianCity('Port Harcourt, Nigeria')).toBe('Port Harcourt');
    expect(detectNigerianCity('Ibadan')).toBe('Ibadan');
    expect(detectNigerianCity('Uyo, Akwa Ibom')).toBe('Uyo');
  });

  it('maps lagos neighbourhoods and state names to their city', () => {
    expect(detectNigerianCity('Lekki Phase 1')).toBe('Lagos');
    expect(detectNigerianCity('Federal Capital Territory')).toBe('Abuja');
    expect(detectNigerianCity('Rivers State')).toBe('Port Harcourt');
  });

  it('is case-insensitive', () => {
    expect(detectNigerianCity('PORTHARCOURT')).toBe('Port Harcourt');
  });

  it('returns null for other places and empty text', () => {
    expect(detectNigerianCity('Accra, Ghana')).toBeNull();
    expect(detectNigerianCity('Nigeria')).toBeNull();
    expect(detectNigerianCity('')).toBeNull();
  });
});
