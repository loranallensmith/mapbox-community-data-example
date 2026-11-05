# Provenance

The version-controlled JSON is the numerical source of truth. `data/raw/github.json` is minimized normalized evidence (not full raw API payloads). `data/processed/ecosystem.json` omits item-level evidence for presentation. The collector is `scripts/research/collect.mjs`; pure calculations and tests live beside it.

First collection: 2026-11-04 UTC. Exact timestamps and 90-day bounds live in each snapshot. GitHub REST v2022-11-28 metadata, default-branch tree, repository issues, and sampled issue comments were actually retrieved. No profile or comment text is stored. A 404 for Search JS means publicly unavailable at that URL, not proof of absence. Licenses must be read at source; GL JS is not assumed to have an OSI license.

Conference sources are embedded in `data/processed/locations.json`; organizer venue assertions were checked on 2026-11-04. Coordinates are manual approximate venue points. Historical editions are deliberately used to avoid presenting unverified future dates. Geographic locations do not describe Mapbox's community or attendance.

CHAOSS catalog: https://www.chaoss.community/kb-metrics-and-metrics-models/
Metric definitions and proxy caveats appear in `src/pages/methodology.astro`.

Recompute aggregates from the committed evidence with `npm test` (includes snapshot consistency). Recollection is not immutable reproduction: deleted/edited/closed records can change. Preserve snapshot history in Git; review changes before replacing conclusions. No trend is inferred from one snapshot.

## Portal / channel extension, 2026-11-04

The user's expanded seven-repository snapshot was preserved when source selection moved to `config/sources.json`. Source configuration now drives independent adapters. Live GitHub discovery and the DEV RSS feed were retrieved; the exact queries, windows, and timestamps are in `data/processed/discovery.json`, `data/raw/channels/articles.json`, and `data/processed/channels.json`. Known Mapbox publisher paths are excluded from the starter article source; other affiliations and relevance remain unverified. No live YouTube or Discord data was retrieved. The pixelmatch example uses a labeled synthetic sample and locally processed uploads, not community research data.

See `docs/SOURCES.md` for source-specific scopes, bounds, status semantics, and extension instructions. Failed/unselected source retention must not be read as a fresh successful measurement. Channel counts and windows differ, and popularity discovery is separate from explicit repository sampling.
