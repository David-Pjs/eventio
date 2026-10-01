export const NIGERIAN_CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Uyo'] as const;

export type NigerianCity = (typeof NIGERIAN_CITIES)[number];

const CITY_PATTERNS: ReadonlyArray<[NigerianCity, RegExp]> = [
  ['Lagos', /(?<![a-z])(lagos|ikeja|lekki|yaba|ikoyi|victoria island|surulere|ajah|ojodu)(?![a-z])/i],
  ['Abuja', /(?<![a-z])(abuja|fct|federal capital territory)(?![a-z])/i],
  ['Port Harcourt', /(?<![a-z])(port\s*harcourt|rivers state)(?![a-z])/i],
  ['Ibadan', /(?<![a-z])(ibadan|oyo state)(?![a-z])/i],
  ['Uyo', /(?<![a-z])(uyo|akwa ibom)(?![a-z])/i],
];

export function detectNigerianCity(text: string): NigerianCity | null {
  if (!text) return null;
  return CITY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
