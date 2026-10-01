import type { Opportunity } from '@eventio/radar-sources';

import { safeHref } from '../lib/safe-href';

interface Props {
  items: Opportunity[];
  upNext: Opportunity[];
  upNextStart: number;
  saved: string[];
  onJump: (index: number) => void;
  onUnsave: (id: string) => void;
}

export function SideLists({ items, upNext, upNextStart, saved, onJump, onUnsave }: Props) {
  const savedItems = saved
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is Opportunity => Boolean(item));

  return (
    <aside className="flex flex-col gap-10 text-sm">
      <section aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="mb-3 text-xs font-semibold tracking-[0.16em] uppercase text-ink-soft">
          Saved · {savedItems.length}
        </h2>
        {savedItems.length === 0 ? (
          <p className="text-ink-soft">Nothing yet. Press S on anything worth your time.</p>
        ) : (
          <ul className="flex flex-col">
            {savedItems.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-t border-ink-line py-2.5">
                <a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {item.title}
                </a>
                <button
                  type="button"
                  onClick={() => onUnsave(item.id)}
                  aria-label={`Remove ${item.title} from saved`}
                  className="text-ink-soft hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upNext.length > 0 && (
        <section aria-labelledby="next-heading">
          <h2 id="next-heading" className="mb-3 text-xs font-semibold tracking-[0.16em] uppercase text-ink-soft">
            Up next
          </h2>
          <ol className="flex flex-col">
            {upNext.map((item, offset) => (
              <li key={item.id} className="border-t border-ink-line">
                <button
                  type="button"
                  onClick={() => onJump(upNextStart + offset)}
                  className="w-full py-2.5 text-left font-medium text-ink/80 hover:text-ink"
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
