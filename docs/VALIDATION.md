# Validation — portal and source adapters, 2026-11-04

Runtime: Node 24.13.1 on macOS, Astro 7.4.5. Existing `.env` and the user's seven-repository GitHub snapshots were preserved. No Git staging, commit, push, or publication was performed.

## Checks completed

- `npm test`: **17 passing** tests. Metric cohorts, timestamps and saved-evidence consistency; source configuration validation; discovery merging; content URL normalization; source failure retention/deduplication; missing YouTube credentials; bounded YouTube pagination/exclusions via fixtures; RSS and Atom parsing/window/publisher exclusions; undated curation; publishable aggregate import with extra member/message fields discarded; GitHub issue/comment pagination with minimized evidence.
- `npm run check`: **zero errors, warnings, or hints**.
- `npm run lint`: passed.
- `npm run build`: **10 static routes** generated, including Projects, Community Content, Data Sources, and the working pixelmatch lab.
- `npm run test:browser`: **9 passing** tests in installed Chrome against a no-token build and dedicated preview on port 4322. All ten pages fit 1280px and 390px without document overflow; navigation current-state includes project detail routes; repository archived/search filters; community publisher/search filters; current snapshot downloads; map list filters and no-token setup; local pixelmatch computation, threshold changes, valid uploads, dimension mismatch and reset; static location/resource links with JavaScript disabled.
- Desktop and mobile overview screenshots manually inspected (`/tmp/mapbox-portal-1280.png`, `/tmp/mapbox-portal-390.png`). Preview graphics are labeled illustrative; neither is a claimed live map screenshot.
- Dependency install reported **zero vulnerabilities** after adding RSS parsing, pixelmatch, and Node types.

## Actual new retrievals

- A bounded public GitHub search produced **12 discovery candidates** from **337 matches**, using `org:mapbox archived:false fork:false pushed:>=2025-11-04`, ordered by cumulative stars. Exact collection time and counts live in `data/processed/discovery.json`. Candidates were not applied to the existing sample.
- The configured DEV Mapbox RSS feed produced **4 article links** after the observation-window and known Mapbox publisher-path exclusion. See minimized evidence in `data/raw/channels/articles.json` and exact timestamp/window in `data/processed/channels.json`. Relevance, quality, and remaining author affiliations are unverified.
- YouTube correctly reports `needs-credential`; **no live YouTube metadata was retrieved**. The API adapter was exercised with fixtures.
- Discord remains disabled. Aggregate import was tested with temporary synthetic fixtures; **no Mapbox Discord content was collected**.
- Existing GitHub activity evidence was not recollected or replaced in this iteration. Its exact seven-repository cohort remains in the original snapshot paths.

## Limits and operation

Authenticated Mapbox resource loading and physical-device/screen-reader behavior are not established by the no-token browser suite. No interviews, user-study outcomes, strategic validation, or production deployment are claimed. The static map bundle still produces a large-chunk advisory. Source interpretation, license/contribution context, and discovered resource relevance need human review.

The optional browser suite requires installed Google Chrome. Build with `PUBLIC_MAPBOX_TOKEN= BASE_PATH=/ npm run build`, run `npm run test:browser`, then run `npm run build` to restore configured output. The suite owns a foreground `--ignore-lock` preview on port 4322 and tears it down; it does not reuse the user's development server. Environment configuration is never printed or copied to evidence, and collector-only credentials must not appear in static build output.

The earlier GitHub Pages subpath build was verified before the portal redesign; the current iteration also checks subpath output before delivery. The Pages workflow continues deriving origin/base path and the public repository link at build time.
