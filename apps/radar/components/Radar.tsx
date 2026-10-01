'use client';

import { NIGERIAN_CITIES, bucketOf, deckReducer, filterOpportunities, initialDeck } from '@eventio/radar-sources';
import type { KindFilter, Opportunity, ScopeFilter } from '@eventio/radar-sources';
import { useEffect, useMemo, useReducer, useState } from 'react';

import { DeckCard } from './DeckCard';
import { Pills, Segmented, Tabs } from './Filters';
import { CTA_LABEL, KIND_OPTIONS, SCOPE_OPTIONS } from './labels';
import { SideLists } from './SideLists';
import { safeHref } from '../lib/safe-href';

const SAVED_KEY = 'radar:saved';

interface Props {
  items: Opportunity[];
  nowIso: string;
  initial: { query: string; scope: ScopeFilter; kind: KindFilter; city: string };
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);

export function Radar({ items, nowIso, initial }: Props) {
  const [query, setQuery] = useState(initial.query);
  const [scope, setScope] = useState<ScopeFilter>(initial.scope);
  const [kind, setKind] = useState<KindFilter>(initial.kind);
  const [city, setCity] = useState(initial.city);
  const [deck, dispatch] = useReducer(deckReducer, [], initialDeck);
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const visible = useMemo(() => filterOpportunities(items, { query, scope, kind, city }), [items, query, scope, kind, city]);
  const cityOptions = useMemo(
    () => [
      { value: 'all', label: 'All cities' },
      ...NIGERIAN_CITIES.map((name) => ({
        value: name as string,
        label: name,
        count: items.filter((item) => item.city === name).length,
      })),
    ],
    [items],
  );
  const showCities = scope === 'nigeria' || city !== 'all';

  const changeScope = (next: ScopeFilter) => {
    setScope(next);
    if (next !== 'nigeria') setCity('all');
  };
  const current = visible[deck.index];
  const thisWeek = visible.filter((item) => bucketOf(item, now) === 'this-week').length;

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]');
      if (Array.isArray(stored)) dispatch({ type: 'hydrate', saved: stored.map(String) });
    } catch {
      // storage unavailable: saved list stays in memory only
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(deck.saved));
    } catch {
      // storage unavailable: saved list stays in memory only
    }
  }, [deck.saved]);

  useEffect(() => {
    dispatch({ type: 'reset' });
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (scope !== 'all') params.set('scope', scope);
    if (kind !== 'all') params.set('kind', kind);
    if (city !== 'all') params.set('city', city);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [query, scope, kind, city]);

  const skip = () => dispatch({ type: 'skip', length: visible.length });
  const save = () => current && dispatch({ type: 'save', id: current.id, length: visible.length });
  const open = () => current && window.open(safeHref(current.url), '_blank', 'noopener,noreferrer');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'arrowright' || key === 'j') skip();
      else if (key === 'arrowleft' || key === 'k') dispatch({ type: 'back' });
      else if (key === 's') save();
      else if (key === 'enter' || key === 'o') open();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const isSaved = current ? deck.saved.includes(current.id) : false;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-6">
        <h1 className="max-w-4xl text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-6xl">
          What are we chasing today?
        </h1>
        <label className="w-full max-w-xl">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: AI, Lagos, fully funded, $5,000"
            className="w-full rounded-full border border-ink-line bg-paper px-5 py-3 text-base placeholder:text-ink-soft/70 focus:border-ink focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Segmented label="Where" options={SCOPE_OPTIONS} value={scope} onChange={changeScope} />
          <p className="text-sm font-medium text-ink-soft" aria-live="polite">
            {visible.length} open{thisWeek > 0 && ` · ${thisWeek} closing this week`}
          </p>
        </div>
        {showCities && <Pills label="City" options={cityOptions} value={city} onChange={setCity} />}
        <Tabs label="What" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
        <section aria-label="Current opportunity" className="flex flex-col gap-5">
          <div className="relative">
            {current && deck.index + 1 < visible.length && (
              <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-[2rem] border border-ink-line bg-ink-wash" />
            )}
            {current && deck.index + 2 < visible.length && (
              <div aria-hidden className="absolute inset-x-12 -bottom-6 h-full rounded-[2rem] border border-ink-line bg-paper" />
            )}
            <div className="relative">
              {current ? (
                <DeckCard key={current.id} item={current} now={now} position={deck.index + 1} total={visible.length} />
              ) : (
                <div className="deal flex min-h-[23rem] flex-col items-start justify-center gap-4 rounded-[2rem] border-2 border-dashed border-ink-line p-10">
                  <p className="text-3xl font-bold tracking-tight">
                    {visible.length === 0 ? 'Nothing matches that filter.' : "That's the whole pile."}
                  </p>
                  <p className="text-ink-soft">{deck.saved.length} saved so far.</p>
                  {visible.length > 0 && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'reset' })}
                      className="rounded-full border border-ink px-5 py-2 font-semibold hover:bg-ink hover:text-paper"
                    >
                      Start over
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {current && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={skip}
                className="flex items-center justify-center gap-2 rounded-full border border-ink-line py-3.5 font-semibold transition-colors hover:border-ink"
              >
                Skip <kbd className="text-xs text-ink-soft">→</kbd>
              </button>
              <button
                type="button"
                onClick={save}
                aria-pressed={isSaved}
                className={`flex items-center justify-center gap-2 rounded-full border py-3.5 font-semibold transition-colors ${
                  isSaved ? 'border-ink bg-ink-wash' : 'border-ink-line hover:border-ink'
                }`}
              >
                {isSaved ? 'Saved' : 'Save'} <kbd className="text-xs text-ink-soft">S</kbd>
              </button>
              <a
                href={safeHref(current.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-semibold text-paper transition-opacity hover:opacity-90"
              >
                {CTA_LABEL[current.kind]} ↗ <kbd className="text-xs text-paper/60">↵</kbd>
              </a>
            </div>
          )}
          {deck.index > 0 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'back' })}
              className="w-fit text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
            >
              ← Previous
            </button>
          )}
        </section>

        <SideLists
          items={items}
          upNext={visible.slice(deck.index + 1, deck.index + 7)}
          upNextStart={deck.index + 1}
          saved={deck.saved}
          onJump={(index) => dispatch({ type: 'jump', index })}
          onUnsave={(id) => dispatch({ type: 'unsave', id })}
        />
      </div>
    </div>
  );
}
