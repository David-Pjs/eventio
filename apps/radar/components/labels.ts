import type { KindFilter, OpportunityKind, OpportunityScope, ScopeFilter } from '@eventio/radar-sources';

export const KIND_LABEL: Record<OpportunityKind, string> = {
  hackathon: 'Hackathon',
  fellowship: 'Fellowship',
  grant: 'Grant',
  scholarship: 'Scholarship',
  event: 'Event',
  job: 'Job',
};

export const SCOPE_LABEL: Record<OpportunityScope, string> = {
  nigeria: 'Nigeria',
  africa: 'Africa',
  global: 'Worldwide',
};

export const KIND_OPTIONS: ReadonlyArray<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'fellowship', label: 'Fellowships' },
  { value: 'grant', label: 'Grants' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'event', label: 'Events' },
  { value: 'job', label: 'Jobs' },
];

export const SCOPE_OPTIONS: ReadonlyArray<{ value: ScopeFilter; label: string }> = [
  { value: 'all', label: 'Everywhere' },
  { value: 'nigeria', label: 'Nigeria' },
  { value: 'africa', label: 'Africa' },
];

export const CTA_LABEL: Record<OpportunityKind, string> = {
  hackathon: 'Join',
  fellowship: 'Apply',
  grant: 'Apply',
  scholarship: 'Apply',
  event: 'RSVP',
  job: 'View role',
};
