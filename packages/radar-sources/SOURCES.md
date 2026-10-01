# Opportunity sources

Every source below is a public API, feed or data page that we read directly. Nothing here uses a generic
web search, and nothing evades blocking or logins.

## Commands

| Command | What it does |
|---|---|
| `pnpm collect` | Runs the public-safe sources, writes `apps/radar/data/opportunities.json` |
| `pnpm collect:local` | Also runs local-only sources (Eventbrite), writes the gitignored `opportunities.local.json` |
| `pnpm discover:newsletters` | Searches Substack, scores every feed, writes `config/newsletters.discovered.json` |
| `pnpm test` | Runs the unit tests (fixtures only, no network) |

## Active sources

| Source | Method | Yield (Oct 2026) | Notes |
|---|---|---|---|
| Google Developer Groups (DevFest and meetups) | `gdg.community.dev/api`: list chapters, keep `country == NG`, fetch each chapter's live events | about 100 Nigerian events across 95 chapters | Finds paid DevFests that never appear on free-event sites |
| Luma | Discovery API by city and category, then a second pass that follows every Nigerian organiser's calendar | about 50 | New organisers appear automatically because calendars are found from events |
| Substack newsletters | Search API finds candidates, feed is fetched and scored on freshness and opportunity density, top feeds go in `config/newsletters.json` | 11 curated, about 20 posts | Re-run discovery monthly to refresh the registry |
| Opportunities for Africans, Opportunity Desk, Opportunities for Youth | WordPress category feeds (`/category/<name>/feed/`), including a Nigeria-only feed | about 200 | The main feed only shows the latest 10 posts, so category feeds multiply coverage |
| Devpost | Public JSON API, online plus searches for Nigerian cities | about 60 | In-person Nigerian hackathons found through search terms |
| Hack Club | Public JSON API, online hackathons only | 4 | Student and teen hackathons |
| Zindi | Public JSON API | 1 to 5 | African data science competitions with cash prizes |
| Superteam Earn | Public JSON API | about 30 | Paid bounties; Nigerian sponsors are tagged Nigeria |
| Eventbrite (local only) | JSON-LD on city search pages | about 40 | Not published: their terms discourage scraping, so it only runs locally |

## Reliability

- Every request retries with backoff (longer after HTTP 429) and is isolated, so one broken feed never stops the run.
- If a source returns nothing or errors, the last good items are kept for up to 7 days.
- If every source is down, the previous data file is left untouched.
- Private organiser calendars (401/403/404) are skipped quietly.

## Checked and rejected

| Source | Why not |
|---|---|
| Reddit JSON | Returns 403 to unauthenticated clients. Use the official OAuth API (free script app) if you want it |
| LinkedIn, Instagram, X | No legitimate public feed. Scraping them breaks their terms and is actively blocked |
| GitHub issues labelled bounty | Dominated by spam repos and token-reward schemes that look like scams |
| Immunefi, Sherlock, Code4rena | Public data works, but no dated contest was live; revisit when one is (Immunefi JSON: `immunefi.com/public-api/bounties.json`, Sherlock: `audits.sherlock.xyz/api/contests`) |
| Devfolio, Unstop, HackerEarth | APIs work but nearly everything is in-person and restricted to Indian colleges |
| Himalayas, RemoteOK, Remotive | Mostly US-only or not location-tagged; the Africa jobs newsletters are better |
| EvalAI | No cash-prize challenges currently |
| Meetup, Tix Africa | JavaScript apps with no open data endpoint |
| Telegram channels | Public previews work (`t.me/s/<channel>`) but channel names can't be discovered reliably, and guessed ones were dead or off-topic |

## Ideas to extend

1. **LinkedIn and Instagram opportunities, legitimately**: create a dedicated Gmail address, subscribe it to LinkedIn job
   alerts and newsletters, and add a collector that reads that mailbox through the Gmail API. Emails sent to you are yours to process.
2. **Reddit**: register a free script app and read `r/forhire`, `r/hackathon`, `r/Nigeria` through the official API.
3. **Telegram**: once you know specific channels worth following, add them by name; the preview page is machine readable.
4. **Calls for speakers**: `tech-conferences/conference-data` on GitHub has CFP deadlines (about 18 open worldwide today).
5. **More GDG-style platforms**: any site built on the Bevy platform exposes the same `event_slim` API shape.

## Adding a source

1. Save a small real response in `tests/fixtures/`.
2. Write the failing test against a `parseX(body)` function.
3. Implement `parseX` and an `xTasks()` function that throws on an unexpected shape.
4. Register it in `src/collectors.ts` (`publicSafe: false` keeps it local-only).
