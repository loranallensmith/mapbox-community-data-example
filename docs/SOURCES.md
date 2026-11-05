# Adding data sources

`config/sources.json` is the source registry. Collection reads `.env` automatically without overwriting exported environment values. Never put tokens or API keys in this JSON: source configuration is published on the static site.

```sh
npm run research:sources
npm run research:collect                    # all enabled sources
npm run research:collect -- --source github # one source
npm run research:collect -- --source articles --source youtube
npm run research:collect -- --config config/sources.json
```

A selected source runs independently. A network/access failure reports `error`, retains prior records, and makes the command fail overall; other sources still run. Missing optional credentials report `needs-credential` without implying zero activity. Disabled and unselected sources keep any prior content labeled as retained. Freshness is shown per source, not just per build. Removed source IDs are removed from the combined presentation snapshot on the next run.

## GitHub: explicit repositories and popularity discovery

Add any public `owner/repository` to the GitHub source's `repositories` list. The seven previously selected repositories are preserved, including `mapbox/mapbox-gl-native` (archived). No activity is silently dropped because it is zero or archived.

Discovery is separate from the sample:

```json
"discovery": {
  "query": "org:mapbox archived:false fork:false",
  "sort": "stars",
  "limit": 12,
  "recentPushDays": 365
}
```

```sh
npm run research:discover
# Review data/processed/discovery.json or /sources, then optionally:
npm run research:discover -- --apply
npm run research:collect -- --source github
```

`--apply` merges candidates into the existing repository list and never removes pinned choices. Queries support GitHub repository search syntax; ordering supports `stars`, `forks`, or `updated`. A recent-push condition is added, the shortlist is bounded to 1–100 results, and incomplete search responses fail without replacing the previous shortlist. Stars are historical popularity, not adoption or community health. Review methodology whenever sample selection changes; snapshots with different samples are not directly comparable.

`GITHUB_TOKEN` is optional for public REST reads. No write scopes are needed for collection. The source has a configurable `responseSampleSize` (0–20); the resulting snapshot records its actual value and cohort.

## YouTube: public video metadata

Enable YouTube Data API v3 in a Google Cloud project and set `YOUTUBE_API_KEY` in `.env`. Restrict the key to the YouTube Data API; an HTTP-referrer restriction is unsuitable for this build-time Node collector. Use a separate key from browser-facing applications.

Configure `queries`, `maxPages` (1–5 per query), `resultsPerPage` (1–50), and `excludedChannelIds` for known official channels. The collector uses date-bounded video search and follows page tokens up to the configured bound. It records whether more results existed; this is intentionally bounded coverage, not exhaustive collection. Each page/query uses API quota: consult the current [search reference](https://developers.google.com/youtube/v3/docs/search/list) rather than assuming a fixed quota allotment.

YouTube API metadata must be refreshed or deleted within 30 days under the [developer policies](https://developers.google.com/youtube/terms/developer-policies). Do not preserve fetched YouTube metadata indefinitely in Git history; arrange refresh/deletion before enabling public video collection. No YouTube API metadata has been collected in the supplied snapshot.

Only title, public URL, public channel title, publication date, and provenance are kept. No comments, transcripts, viewer data, or engagement metrics. Search terms can return irrelevant or official material. Results are labeled **Needs review / affiliation unverified**; configure exclusions and review relevance before drawing conclusions.

## RSS and Atom: publishers and external blogs

```json
{
  "id": "articles",
  "type": "feed",
  "enabled": true,
  "windowDays": 365,
  "feeds": [
    {
      "name": "DEV Community · Mapbox",
      "url": "https://dev.to/feed/tag/mapbox"
    }
  ],
  "maxItemsPerFeed": 30,
  "excludedUrlPrefixes": ["https://dev.to/mapbox/"]
}
```

Add feeds for other public publishers, with their own named source ID if independent failure/freshness behavior is desired. Both RSS and Atom are supported. Only dated, in-window entries among the first bounded feed items are included. Feed retention and ordering are publisher-controlled; this is not an archive search. Invalid feed entries fail that source rather than becoming fabricated counts. Only linked metadata is retained, never full article HTML.

The starter feed excludes the known Mapbox DEV publisher path. That does not establish that every remaining author is external: affiliations remain unverified. Duplicates within a source are removed by exact normalized URL; cross-source duplicates keep their separate provenance.

## Curated public links

Add items to the `curated` source:

```json
{
  "title": "Title verified at the source",
  "url": "https://example.org/a-public-project",
  "publisher": "Publisher name",
  "publishedAt": "2026-10-01T00:00:00Z",
  "kind": "Project"
}
```

The above is a schema example, not a collected resource. `publishedAt` is optional; never guess a date. Kind can be Article, Video, or Project. Curated links are intentionally not constrained by the automated observation window and are labeled as manual selections. All links must be HTTP(S) without embedded credentials.

## Discord: publishable aggregates only

A Discord invite does not grant permission to access or republish messages. This repository does not implement user-account scraping, bot installation, or live message capture. Connect a server-approved integration outside this collector only if you have the necessary server permissions and a publication basis. The supported input is an explicitly publishable export with a public provenance URL, not a member-only chat dump.

Create the configured file (default `data/imports/discord-public-aggregates.json`) with this shape, then enable the source:

```json
{
  "publishable": true,
  "sourceUrl": "https://example.org/public-community-report",
  "window": { "start": "2026-10-01T00:00:00Z", "end": "2026-11-01T00:00:00Z" },
  "aggregates": [{ "label": "Public events hosted", "count": 3 }]
}
```

This is a schema example, not Mapbox data. The importer requires exact bounds, a public source URL, and nonnegative integer totals. It deliberately whitelists labeled totals: no message bodies, usernames, member IDs, or arbitrary extra export fields are retained. The project’s public-data principle still applies: do not import private-chat-derived research merely because totals were computed. Import source dates are distinct from the collector's configured windows.

## Add an adapter type

1. Add the type to `sourceTypes` and its configuration checks in `scripts/research/config.mjs`.
2. Implement an adapter in `scripts/research/adapters/` accepting `(source, context)`. Context provides `start`, `end`, `windowDays`, `collectedAt`, and `env`; do not persist `env`.
3. Register the adapter in `collect.mjs`. Return `{status, message, items, evidence}`. `items` should use `contentItem()` to validate public URLs and normalize metadata. Non-content aggregates can return `aggregates` with no content items.
4. Use `request()`/`jsonRequest()` for bounded timeouts/retries and sanitized failures; never log credential-bearing URLs. Add source-specific pagination/completeness bounds.
5. Add fixture-based tests for normalization, limits, missing credentials, and failures. Extend the Sources UI if the source's units differ from resource links.

`data/raw/channels/<id>.json` stores minimized source evidence. `data/processed/channels.json` stores presentation items and run status. Source-level failures preserve previous snapshots. GitHub maintains its existing raw/processed file paths for compatibility. The website remains entirely static at runtime.
