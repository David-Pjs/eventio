export type OpportunityKind =
  | 'event'
  | 'hackathon'
  | 'fellowship'
  | 'grant'
  | 'scholarship'
  | 'job';

export type OpportunityScope = 'nigeria' | 'africa' | 'global';

export type OpportunityMode = 'online' | 'in-person' | 'hybrid' | 'unknown';

export interface Opportunity {
  id: string;
  title: string;
  kind: OpportunityKind;
  scope: OpportunityScope;
  mode: OpportunityMode;
  startsAt: string | null;
  deadline: string | null;
  location: string | null;
  city?: string | null;
  organizerId?: string | null;
  url: string;
  source: string;
  summary: string | null;
  image: string | null;
  tags: string[];
  isFree: boolean | null;
  prize: string | null;
}

export type SourceStatus = 'ok' | 'degraded' | 'down';

export interface SourceReport {
  name: string;
  status: SourceStatus;
  count: number;
  carriedOver: number;
  error: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}
