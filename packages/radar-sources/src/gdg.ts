import { detectNigerianCity } from './cities';
import { fetchJson } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const GDG_API = 'https://gdg.community.dev/api';
const CHAPTER_PAGE_SIZE = 500;
const MAX_CHAPTER_PAGES = 6;
const REQUEST_GAP_MS = 250;
const SUMMARY_LENGTH = 220;
const MAX_FAILED_CHAPTER_RATIO = 0.1;
const HACKATHON_PATTERN = /hackathon|hack\s?day|buildathon/i;

export interface GdgChapter {
  id: number;
  title: string;
  city: string;
}

interface ChapterRecord {
  id?: number;
  title?: string;
  city?: string;
  country?: string;
}

interface GdgEventRecord {
  id?: number;
  title?: string;
  start_date?: string;
  end_date?: string;
  static_url?: string;
  description_short?: string;
  cropped_picture_url?: string;
  audience_type?: string;
  custom_tickets_url?: string | null;
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function parseGdgChapters(body: unknown): { chapters: GdgChapter[]; nextPage: number | null } {
  const payload = body as { results?: ChapterRecord[]; pagination?: { next_page?: number | null } };
  if (!Array.isArray(payload?.results)) return { chapters: [], nextPage: null };

  const chapters = payload.results
    .filter((record) => record.country === 'NG' && typeof record.id === 'number' && record.title)
    .map((record) => ({ id: record.id as number, title: record.title as string, city: record.city ?? '' }));

  return { chapters, nextPage: payload.pagination?.next_page ?? null };
}

const modeOf = (audience: string | undefined): Opportunity['mode'] => {
  if (audience === 'ONLINE') return 'online';
  return audience === 'HYBRID' ? 'hybrid' : 'in-person';
};

const toIso = (value: string | undefined): string | null => {
  const time = Date.parse(value ?? '');
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

export function parseGdgEvents(body: unknown, chapter: GdgChapter): Opportunity[] {
  const events = (body as { results?: GdgEventRecord[] })?.results;
  if (!Array.isArray(events)) return [];

  return events.flatMap((event) => {
    if (!event.id || !event.title || !event.static_url) return [];
    const summary = stripHtml(event.description_short ?? '').slice(0, SUMMARY_LENGTH);

    return [
      {
        id: `gdg-${event.id}`,
        title: event.title,
        kind: HACKATHON_PATTERN.test(event.title) ? 'hackathon' : 'event',
        scope: 'nigeria',
        city: detectNigerianCity(`${chapter.city} ${chapter.title}`),
        mode: modeOf(event.audience_type),
        startsAt: toIso(event.start_date),
        deadline: null,
        location: chapter.city ? `${chapter.city}, Nigeria` : 'Nigeria',
        url: event.static_url,
        source: 'gdg',
        summary: summary || `Hosted by ${chapter.title}`,
        image: event.cropped_picture_url ?? null,
        tags: ['gdg'],
        isFree: event.custom_tickets_url ? false : null,
        prize: null,
      } satisfies Opportunity,
    ];
  });
}

export const tooManyFailures = (failures: number, total: number): boolean =>
  total > 0 && failures / total > MAX_FAILED_CHAPTER_RATIO;

export const chapterEventsUrl = (chapterId: number): string =>
  `${GDG_API}/event_slim/for_chapter/${chapterId}/?page_size=50&status=Live`;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function listNigerianChapters(): Promise<GdgChapter[]> {
  const chapters: GdgChapter[] = [];
  let page: number | null = 1;

  for (let fetched = 0; page !== null && fetched < MAX_CHAPTER_PAGES; fetched += 1) {
    const body: unknown = await fetchJson(`${GDG_API}/chapter_slim/?page_size=${CHAPTER_PAGE_SIZE}&page=${page}`);
    if (!Array.isArray((body as { results?: unknown })?.results)) throw new Error('unexpected GDG chapter response shape');
    const parsed = parseGdgChapters(body);
    chapters.push(...parsed.chapters);
    page = parsed.nextPage;
  }

  return chapters;
}

async function collectGdg(): Promise<Opportunity[]> {
  const chapters = await listNigerianChapters();
  if (chapters.length === 0) throw new Error('no nigerian GDG chapters found');

  const collected: Opportunity[] = [];
  let failures = 0;

  for (const chapter of chapters) {
    try {
      collected.push(...parseGdgEvents(await fetchJson(chapterEventsUrl(chapter.id)), chapter));
    } catch {
      failures += 1;
    }
    await pause(REQUEST_GAP_MS);
  }

  if (tooManyFailures(failures, chapters.length)) {
    throw new Error(`${failures} of ${chapters.length} GDG chapter requests failed`);
  }
  return collected;
}

export const gdgTasks = (): Task[] => [{ label: 'gdg nigerian chapters', run: collectGdg }];
