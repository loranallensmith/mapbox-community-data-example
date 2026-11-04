# Provenance

The version-controlled JSON is the numerical source of truth. `data/raw/github.json` is minimized normalized evidence (not full raw API payloads). `data/processed/ecosystem.json` omits item-level evidence for presentation. The collector is `scripts/research/collect.mjs`; pure calculations and tests live beside it.

First collection: 2026-11-04 UTC. Exact timestamps and 90-day bounds live in each snapshot. GitHub REST v2022-11-28 metadata, default-branch tree, repository issues, and sampled issue comments were actually retrieved. No profile or comment text is stored. A 404 for Search JS means publicly unavailable at that URL, not proof of absence. Licenses must be read at source; GL JS is not assumed to have an OSI license.

Conference sources are embedded in `data/processed/locations.json`; organizer venue assertions were checked on 2026-11-04. Coordinates are manual approximate venue points. Historical editions are deliberately used to avoid presenting unverified future dates. Geographic locations do not describe Mapbox's community or attendance.

CHAOSS catalog: https://www.chaoss.community/kb-metrics-and-metrics-models/
Metric definitions and proxy caveats appear in `src/pages/methodology.astro`.

Recompute aggregates from the committed evidence with `npm test` (includes snapshot consistency). Recollection is not immutable reproduction: deleted/edited/closed records can change. Preserve snapshot history in Git; review changes before replacing conclusions. No trend is inferred from one snapshot.
