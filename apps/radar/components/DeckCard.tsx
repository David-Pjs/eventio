import { describeWhen, urgencyOf } from '@eventio/radar-sources';
import type { Opportunity } from '@eventio/radar-sources';

import { KIND_LABEL, SCOPE_LABEL } from './labels';

interface Props {
  item: Opportunity;
  now: Date;
  position: number;
  total: number;
}

export function DeckCard({ item, now, position, total }: Props) {
  const isHot = urgencyOf(item, now) === 'hot';
  const facts = [
    item.mode === 'online' ? 'Online' : item.location,
    item.prize ? `${item.prize} in prizes` : null,
    item.isFree === true ? 'Free' : item.isFree === false ? 'Ticketed' : null,
    `via ${item.source}`,
  ].filter(Boolean);

  return (
    <article
      className="deal relative flex min-h-[23rem] flex-col gap-6 rounded-[2rem] bg-ink p-7 text-paper sm:p-10"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs font-semibold tracking-[0.16em] uppercase text-paper/70">
        <span>
          {KIND_LABEL[item.kind]} · {SCOPE_LABEL[item.scope]}
        </span>
        <span className="tabular-nums">
          {position} / {total}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
            isHot ? 'bg-paper text-ink' : 'bg-paper/12 text-paper'
          }`}
        >
          {describeWhen(item, now)}
        </span>
        <h2 className="text-4xl leading-[1.02] font-bold tracking-[-0.02em] text-balance sm:text-5xl">{item.title}</h2>
        {item.summary && <p className="max-w-2xl text-lg leading-snug text-paper/75">{item.summary}</p>}
      </div>

      <p className="mt-auto text-sm text-paper/70">{facts.join('   ·   ')}</p>
    </article>
  );
}
