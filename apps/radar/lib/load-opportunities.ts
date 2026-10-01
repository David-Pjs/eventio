import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Opportunity, SourceReport } from '@eventio/radar-sources';

import publicSnapshot from '../data/opportunities.json';

export interface RadarData {
  generatedAt: string | null;
  sources: SourceReport[];
  items: Opportunity[];
}

const LOCAL_SNAPSHOT_PATH = join(process.cwd(), 'data', 'opportunities.local.json');

const normalize = (data: Partial<RadarData>): RadarData => ({
  generatedAt: data.generatedAt ?? null,
  sources: data.sources ?? [],
  items: data.items ?? [],
});

async function readLocalSnapshot(): Promise<Partial<RadarData> | null> {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    return JSON.parse(await readFile(LOCAL_SNAPSHOT_PATH, 'utf8')) as Partial<RadarData>;
  } catch {
    return null;
  }
}

export async function loadOpportunities(): Promise<RadarData> {
  const local = await readLocalSnapshot();
  return normalize(local ?? (publicSnapshot as unknown as Partial<RadarData>));
}
