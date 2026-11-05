# Mapbox Developer Ecosystem

A static portfolio and ecosystem portal: working library demos, public GitHub activity, community resources, and configurable data sources. Independent exploration; no Mapbox affiliation, assessment, audit, or endorsement. AI-assisted interpretation and content relevance require review.

## Run locally

Use **Node 22.12+** (Node 24 tested).

```sh
npm ci
cp .env.example .env
# Set PUBLIC_MAPBOX_TOKEN to a restricted public pk. token.
npm run dev
```

Application, build configuration, and collector all read `.env` automatically. Existing shell variables take precedence. Do not overwrite an existing `.env` when updating this checkout.

- `PUBLIC_MAPBOX_TOKEN`: public `pk.` token, browser-visible. Use minimum read scopes and URL restrictions for localhost and production. Never use `sk.` tokens. [Mapbox setup](https://docs.mapbox.com/accounts/guides/tokens/).
- `GITHUB_TOKEN`: optional build-time public API authentication; no write permissions needed for research. Never prefix it with PUBLIC_.
- `YOUTUBE_API_KEY`: optional build-time key for YouTube Data API v3. Restrict to that API. No PUBLIC_ prefix.
- `PUBLIC_REPO_URL`: optional actual GitHub source URL, blank until published.
- `BASE_PATH`: `/` locally; Pages workflow derives its deployment value.
- `SITE_URL`: intended site origin; Pages workflow derives it automatically.

`.env` is ignored. Changing browser token requires restarting development/rebuilding the site. Without a token, venue browsing and filters remain available.

## Explore the portal

| Route            | Purpose                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `/`              | Compact overview: live projects, current metrics, source coverage, content links         |
| `/projects`      | Project gallery with previews and library source links                                   |
| `/explorer`      | Mapbox GL JS venue map, category layers, local filters, accessible list                  |
| `/image-diff`    | Working pixelmatch comparison lab: synthetic example, local uploads, sensitivity control |
| `/ecosystem`     | Search/filter repository metrics, archived status, contribution and license links        |
| `/community`     | Search/filter public article/video/project metadata                                      |
| `/sources`       | Per-channel status, freshness, discovery shortlist, setup and extension instructions     |
| `/opportunities` | Evidence-linked hypotheses for DevRel experiments                                        |
| `/field-notes`   | Implementation log and author-input prompts                                              |
| `/methodology`   | Definitions, source selection, limitations, and reproducibility                          |

The map uses four sourced historical conference venues, not upcoming or Mapbox-affiliated events. The pixelmatch demo starts with a synthetic UI sample; user-provided images stay in the browser. Neither demo claims a production outcome.

## Configure collection

Edit **[config/sources.json](config/sources.json)**. Add full owner/repository names, discovery criteria, feed URLs, YouTube queries, or curated links without editing the collector. Your seven selected repositories and the existing GitHub evidence have been preserved.

```sh
npm run research:sources
npm run research:discover                       # review popularity candidates
npm run research:discover -- --apply            # explicitly merge candidates; retain existing choices
npm run research:collect -- --source github
npm run research:collect -- --source articles
npm run research:collect -- --source youtube
npm run research:collect                        # all enabled sources
```

**[docs/SOURCES.md](docs/SOURCES.md)** explains every adapter, the configuration schemas, credentials, selection bias, and adding new adapter types.

- **GitHub:** explicitly selected public repositories, configurable response sample. Discovery uses bounded public search sorted by stars/forks/recent update with a recent-push criterion. Popularity does not imply adoption or health. Discovery does not change the sample unless explicitly applied.
- **RSS/Atom:** linked metadata from configured feeds. The starter DEV feed excludes the known Mapbox publisher path; remaining affiliations and content relevance are unverified.
- **YouTube:** public video search metadata through the official API. Missing key is reported as `needs-credential`; no fabricated videos or engagement statistics.
- **Curated:** manually selected public URLs for sites without feeds; unknown dates stay unknown.
- **Discord:** disabled by default. Supports an explicitly publishable aggregate export with public provenance, not message scraping or member-only data. An invite alone is insufficient access.

Sources refresh independently. Failed sources retain older data with visible freshness/error status; other sources continue. Missing optional credentials are distinct from empty observations. The collector exits nonzero for actual source errors. Snapshots are static files; there are no runtime collection calls in the browser.

Optional `RESEARCH_END` pins the collection endpoint. Requerying mutable public APIs is not exact historical reproduction; use the committed normalized evidence and metric tests for that. Different channels have different observation windows and incomplete retention. Never compare their raw counts as equivalent engagement measures.

## Data layout

```text
config/sources.json                 source definitions; no credentials
scripts/research/adapters/          GitHub, YouTube, feeds, curated, aggregate import
scripts/research/collect.mjs         source runner; automatic .env loading
scripts/research/discover.mjs        bounded GitHub candidate discovery
data/raw/github.json                existing minimized GitHub evidence
data/processed/ecosystem.json       repository aggregates
data/raw/channels/<id>.json         minimized per-source evidence
data/processed/channels.json        content links, run states, freshness
data/processed/discovery.json       dated popularity shortlist
data/processed/locations.json       sourced historical venue dataset
```

Build copies public evidence/configuration into ignored `public/data` and then `dist/data`. No API keys, message bodies, profile records, or image uploads belong in these snapshots. Article/video titles and publisher display names are public metadata; content bodies are not copied. Editorial interpretation remains separate in page source.

## Validate

```sh
npm test
npm run check
npm run lint
npm run build
```

Tests cover metric calculations, snapshot consistency, timestamp boundaries, source validation, missing credentials, bounded YouTube pagination, RSS/Atom filtering, safe link normalization, deduplication, failed-source retention, discovery merging, and aggregate privacy boundaries.

Optional Chrome browser checks:

```sh
PUBLIC_MAPBOX_TOKEN= BASE_PATH=/ npm run build
npm run test:browser
npm run build # restore configured deployment output
```

Requires installed Google Chrome. Browser tests exercise 1280px/390px layouts, route navigation, resource/repository filtering, evidence downloads, no-token and no-JavaScript browsing, and real pixelmatch output. Authenticated Mapbox resource behavior is a separate environment-dependent check. See [validation record](docs/VALIDATION.md). Astro may leave preview running in the background; stop an owned preview with `npm exec astro -- preview stop`.

## Publish on GitHub Pages

1. Authenticate with GitHub: `gh auth login -h github.com`.
2. Commit and push to a public repository. For a new remote:
   ```sh
   git add .
   git commit -m "Build Mapbox ecosystem portal"
   gh repo create mapbox-developer-ecosystem --public --source=. --remote=origin --push
   ```
   Reuse an existing remote if one is already configured.
3. Settings → Pages → Source: **GitHub Actions**.
4. Actions repository **Variables**: add `PUBLIC_MAPBOX_TOKEN` containing a URL-restricted public token.
5. Run **Deploy GitHub Pages**, or push to `main`. The workflow validates, builds, derives the base path/origin/source URL, and deploys `dist`.
6. Add the Pages URL to Mapbox token restrictions and verify a real production map render.

The research workflow uses GitHub's automatic token and an optional `YOUTUBE_API_KEY` Actions secret. It uploads evidence for review and never auto-publishes changing interpretations. Add scheduled refresh only after establishing review policy. Any static host can serve `dist` with the intended SITE_URL/BASE_PATH supplied at build time.

## Research boundaries

CHAOSS-inspired issue and change-request counts plus labeled closure/response proxies. Closed PRs are not necessarily merged or rejected: GL JS documents internal import and Copybara sync. Small newest-issue response samples exclude unanswered cases from medians. No community health score, maintainer ranking, demographic inference, or private support judgment. No trends from one snapshot.

Human review: verify source relevance/affiliations, contribution policies and licenses; complete firsthand author notes; validate deployment and authenticated map interaction. Original project code/prose is MIT; Mapbox services, libraries, trademarks, and third-party works retain their own terms.
