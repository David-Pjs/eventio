import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COLLECTORS, selectCollectors } from './collectors';
import type { Collector } from './collectors';
import { hasMeaningfulChange, reconcile } from './reconcile';
import type { RadarSnapshot } from './reconcile';
import { runTasks } from './resilient';
import type { CollectResult } from './resilient';

const IS_LOCAL_RUN = process.env.RADAR_LOCAL === '1';
const OUTPUT_FILE = IS_LOCAL_RUN ? 'opportunities.local.json' : 'opportunities.json';
const OUTPUT_PATH = fileURLToPath(new URL(`../../../apps/radar/data/${OUTPUT_FILE}`, import.meta.url));
const EMPTY: RadarSnapshot = { generatedAt: null, sources: [], items: [] };

async function loadPrevious(): Promise<RadarSnapshot> {
  let raw: string;
  try {
    raw = await readFile(OUTPUT_PATH, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY;
    throw error;
  }

  const parsed = JSON.parse(raw) as Partial<RadarSnapshot>;
  return {
    generatedAt: parsed.generatedAt ?? null,
    items: Array.isArray(parsed.items) ? parsed.items : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources.filter((source) => typeof source?.status === 'string') : [],
  };
}

async function runCollector(collector: Collector): Promise<CollectResult> {
  const first = await runTasks(collector.tasks(), collector.gapMs);
  if (!collector.followUp) return first;

  const second = await runTasks(collector.followUp(first.items), collector.gapMs);
  const merged = new Map([...first.items, ...second.items].map((item) => [item.id, item]));
  return { items: [...merged.values()], failures: [...first.failures, ...second.failures] };
}

async function main() {
  const previous = await loadPrevious();
  const now = new Date();

  const outcomes = await Promise.all(
    selectCollectors(COLLECTORS, IS_LOCAL_RUN).map(async (collector) => ({
      name: collector.name,
      sources: collector.sources,
      result: await runCollector(collector),
    })),
  );

  const { snapshot, allDown } = reconcile(previous, outcomes, now);

  for (const source of snapshot.sources) {
    const detail = source.error ? ` (${source.error})` : '';
    console.log(`${source.status.padEnd(8)} ${source.name}: ${source.count} fresh, ${source.carriedOver} carried${detail}`);
  }

  if (allDown) {
    console.error('Every source is down. Keeping the previous data untouched.');
    process.exitCode = 1;
    return;
  }

  if (!hasMeaningfulChange(previous, snapshot)) {
    console.log(`No changes. ${snapshot.items.length} opportunities stay as they are.`);
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${snapshot.items.length} opportunities.`);
}

await main();
