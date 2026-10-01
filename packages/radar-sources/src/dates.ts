const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const LAGOS_OFFSET_MS = 3_600_000;

export const monthIndex = (name: string): number => MONTH_INDEX[name.toLowerCase()] ?? -1;

export function lagosDay(iso: string | null | undefined): string {
  const time = Date.parse(iso ?? '');
  return Number.isNaN(time) ? '' : new Date(time + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

const RANGE_DAY_FIRST = /(\d{1,2})(?:\s?[–-]\s?\d{1,2})?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/;
const MONTH_FIRST = /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;

export function extractTitleDate(title: string): string | null {
  const dayFirst = RANGE_DAY_FIRST.exec(title);
  if (dayFirst && monthIndex(dayFirst[2]) >= 0) return utcDate(Number(dayFirst[3]), monthIndex(dayFirst[2]), Number(dayFirst[1]));
  const monthFirst = MONTH_FIRST.exec(title);
  if (monthFirst && monthIndex(monthFirst[1]) >= 0) return utcDate(Number(monthFirst[3]), monthIndex(monthFirst[1]), Number(monthFirst[2]));
  return null;
}

export function utcDate(year: number, month: number, day: number): string | null {
  if (month < 0 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCMonth() === month ? date.toISOString() : null;
}
