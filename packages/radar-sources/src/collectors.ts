import { devpostTasks } from './devpost';
import { earnTasks } from './earn';
import { eventbriteTasks } from './eventbrite';
import { gdgTasks } from './gdg';
import { hackClubTasks } from './hackclub';
import { lumaFollowUpTasks, lumaTasks } from './luma';
import { NEWSLETTERS, newsletterTasks } from './newsletters';
import type { Task } from './resilient';
import type { Opportunity } from './types';
import { feedTasks } from './rss';
import { zindiTasks } from './zindi';

export interface Collector {
  name: string;
  sources: readonly string[];
  gapMs: number;
  publicSafe: boolean;
  tasks: () => Task[];
  followUp?: (found: readonly Opportunity[]) => Task[];
}

const LUMA_GAP_MS = 400;
const EVENTBRITE_GAP_MS = 2500;
const FEED_GAP_MS = 300;

export const COLLECTORS: readonly Collector[] = [
  { name: 'luma', sources: ['luma'], gapMs: LUMA_GAP_MS, publicSafe: true, tasks: lumaTasks, followUp: lumaFollowUpTasks },
  { name: 'devpost', sources: ['devpost'], gapMs: 0, publicSafe: true, tasks: devpostTasks },
  { name: 'gdg', sources: ['gdg'], gapMs: 0, publicSafe: true, tasks: gdgTasks },
  { name: 'eventbrite', sources: ['eventbrite'], gapMs: EVENTBRITE_GAP_MS, publicSafe: false, tasks: eventbriteTasks },
  { name: 'hackclub', sources: ['hackclub'], gapMs: 0, publicSafe: true, tasks: hackClubTasks },
  { name: 'zindi', sources: ['zindi'], gapMs: 0, publicSafe: true, tasks: zindiTasks },
  { name: 'superteam-earn', sources: ['superteam-earn'], gapMs: 0, publicSafe: true, tasks: earnTasks },
  { name: 'newsletters', sources: NEWSLETTERS.map((entry) => entry.source), gapMs: 0, publicSafe: true, tasks: newsletterTasks },
  { name: 'fellowship-feeds', sources: ['opportunitiesforafricans', 'opportunitydesk', 'fundsforngos', 'opportunitiescorners', 'opportunitiesforyouth'], gapMs: FEED_GAP_MS, publicSafe: true, tasks: feedTasks },
];

export const selectCollectors = (collectors: readonly Collector[], includePrivate: boolean): readonly Collector[] =>
  includePrivate ? collectors : collectors.filter((collector) => collector.publicSafe);
