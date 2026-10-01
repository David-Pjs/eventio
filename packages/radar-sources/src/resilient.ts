import { HttpError } from './retry';
import type { Opportunity } from './types';

export interface CollectResult {
  items: Opportunity[];
  failures: string[];
}

export interface Task {
  label: string;
  run: () => Promise<Opportunity[]>;
}

export const skipOnStatus =
  (statuses: readonly number[], run: () => Promise<Opportunity[]>) =>
  async (): Promise<Opportunity[]> => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof HttpError && statuses.includes(error.status)) return [];
      throw error;
    }
  };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runTasks(tasks: readonly Task[], gapMs = 0): Promise<CollectResult> {
  const byId = new Map<string, Opportunity>();
  const failures: string[] = [];

  for (const [index, task] of tasks.entries()) {
    if (index > 0 && gapMs > 0) await pause(gapMs);
    try {
      for (const item of await task.run()) {
        if (!byId.has(item.id)) byId.set(item.id, item);
      }
    } catch (error) {
      failures.push(`${task.label}: ${describeError(error)}`);
    }
  }

  return { items: [...byId.values()], failures };
}
