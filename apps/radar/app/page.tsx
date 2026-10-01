import { NIGERIAN_CITIES } from '@eventio/radar-sources';
import type { KindFilter, ScopeFilter } from '@eventio/radar-sources';

import { Radar } from '@/components/Radar';
import { loadOpportunities } from '@/lib/load-opportunities';

export const dynamic = 'force-dynamic';

const SCOPES: ScopeFilter[] = ['all', 'nigeria', 'africa', 'global'];
const CITIES: string[] = ['all', ...NIGERIAN_CITIES];
const KINDS: KindFilter[] = ['all', 'hackathon', 'fellowship', 'grant', 'scholarship', 'event', 'job'];

const pick = <T extends string>(value: string | string[] | undefined, allowed: T[], fallback: T): T => {
  const single = Array.isArray(value) ? value[0] : value;
  return allowed.find((option) => option === single) ?? fallback;
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { items, generatedAt } = await loadOpportunities();
  const query = Array.isArray(params.q) ? params.q[0] : params.q;

  return (
    <>
      <nav aria-label="Site" className="border-b border-ink-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span aria-hidden className="relative grid size-6 place-items-center overflow-hidden rounded-full border border-ink">
              <span className="sweep absolute inset-0 rounded-full opacity-70" />
              <span className="relative size-1 rounded-full bg-ink" />
            </span>
            Opportunity Radar
          </span>
          {generatedAt && (
            <span className="text-xs text-ink-soft">
              Updated {new Date(generatedAt).toUTCString().slice(5, 22)} UTC
            </span>
          )}
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-12 pb-16 sm:px-6 lg:pt-16">
        <Radar
          items={items}
          nowIso={new Date().toISOString()}
          initial={{
            query: query ?? '',
            scope: pick(params.scope, SCOPES, 'all'),
            kind: pick(params.kind, KINDS, 'all'),
            city: pick(params.city, CITIES, 'all'),
          }}
        />
        <footer className="text-sm text-ink-soft">
          Listings come from public sources (Luma, Google Developer Groups, Devpost, Hack Club, Zindi, Superteam Earn and opportunity newsletters). Every card links back to its original source. Always confirm details on the official page before you apply.
        </footer>
      </main>
    </>
  );
}
