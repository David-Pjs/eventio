import type { Opportunity, OpportunityKind, OpportunityScope } from './types';

export type ScopeFilter = 'all' | OpportunityScope;
export type KindFilter = 'all' | OpportunityKind;

export interface OpportunityFilter {
  query: string;
  scope: ScopeFilter;
  kind: KindFilter;
  city?: string;
}

const matchesScope = (item: Opportunity, scope: ScopeFilter): boolean => {
  if (scope === 'all') return true;
  if (scope === 'africa') return item.scope === 'africa' || item.scope === 'nigeria';
  return item.scope === scope;
};

const searchableText = (item: Opportunity): string =>
  [item.title, item.summary, item.location, item.prize, item.source, ...item.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function filterOpportunities(
  items: readonly Opportunity[],
  { query, scope, kind, city = 'all' }: OpportunityFilter,
): Opportunity[] {
  const needle = query.trim().toLowerCase();

  return items.filter(
    (item) =>
      matchesScope(item, scope) &&
      (kind === 'all' || item.kind === kind) &&
      (city === 'all' || item.city === city) &&
      (needle === '' || searchableText(item).includes(needle)),
  );
}
