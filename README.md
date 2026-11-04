# Mapbox Developer Ecosystem Field Notes

An independent, time-boxed technical experiment and public ecosystem notebook. **Not an official Mapbox assessment, audit, or endorsement.** AI-assisted interpretations and firsthand journal prompts require human review.

## What is implemented

- Static Astro + strict TypeScript + Tailwind site with six pages: overview, explorer, ecosystem, field notes, opportunities, methodology.
- Mapbox GL JS GeoJSON circles styled by community category, filters, local event search, venue popups, and focus-from-list controls. Equivalent sourced HTML cards work without a map or JavaScript.
- Helpful missing-token, unsupported-WebGL, loading, resource-error, and no-results states.
- Reproducible GitHub REST collection, minimized version-controlled evidence, four quantitative indicators, discoverability inventory, metric tests, CI, and GitHub Pages deployment.
- Four curated **historical** conference venues. This is not a list of Mapbox events or a geographic sample of its community.

No Mapbox token was supplied during implementation. Authenticated map rendering, real-device mobile interaction, and assistive-technology testing still require verification. No live public deployment or firsthand author experience is claimed.

## Setup

Use **Node 22.12+**; Node 24 was used here. Check `node --version` if your shell selects an older runtime.

```sh
npm ci
cp .env.example .env
# Edit .env to set PUBLIC_MAPBOX_TOKEN=pk....
npm run dev
```

Open the local URL printed by Astro. Without a token, the site and venue list still work and the map explains setup.

Use a **public `pk.` Mapbox token**, with only permissions needed by GL JS, and URL restrictions for localhost and your deployment origin as appropriate. Browser tokens are inherently visible in built JS and requests. Never use or commit an `sk.` secret token. `.env` is ignored; `.env.example` contains placeholders only. See [Mapbox token documentation](https://docs.mapbox.com/help/dive-deeper/access-tokens/). GL JS and service usage retain Mapbox terms; the project's MIT license does not replace them. The token is injected at build time; changing it requires a rebuild.

`PUBLIC_REPO_URL` optionally adds a real source link after publication. No fake remote URL is displayed by default. `BASE_PATH` and `SITE_URL` support GitHub Pages subpaths.

## Research snapshot

Actually collected on **2026-11-04 UTC**, for the preceding 90 days:

| Repository                | New issues | New PRs | Sampled issues |
| ------------------------- | ---------: | ------: | -------------: |
| mapbox/mapbox-gl-js       |         25 |      12 |              5 |
| mapbox/mapbox-gl-draw     |          2 |      35 |              2 |
| mapbox/mapbox-gl-geocoder |          0 |      10 |              0 |

The candidate `mapbox/mapbox-search-js` returned 404. Do not infer that its product or documentation is unavailable.

```sh
npm run research:collect
```

Optional `GITHUB_TOKEN` must be supplied in the process environment (scripts do not load `.env` automatically). No token is necessary below GitHub's unauthenticated quota. It is never included in saved data. Optional `RESEARCH_END` pins the ISO cohort end. Example:

```sh
RESEARCH_END=2026-11-04T14:30:22.730Z npm run research:collect
```

The collector follows pagination, limits runaway traversal, retries transient failures, and fails loudly on rate limits and incomplete pagination. It saves only after all repositories complete; on failure the previous snapshot remains. A live API query is not an immutable reconstruction of the past. Exact reproduction uses the committed evidence and pure transformation tests.

- `data/raw/github.json`: minimized normalized source evidence, item URLs and dates, sampled comment timestamps and bot/self flags; no names, email, comment bodies, or profiles.
- `data/processed/ecosystem.json`: derived display snapshot.
- `data/processed/locations.json`: curated venue dataset and original organizer links.
- `scripts/research/`: acquisition and pure calculations with tests.
- `src/pages/`: presentation and reviewed/provisional editorial content.
- `src/content/firsthand-template.md`: author journal template.
- `docs/methodology/PROVENANCE.md`: provenance notes.

The build copies evidence into `public/data` for static downloads. Rebuild after collection. These copies are ignored by Git to avoid duplicated source-of-truth files.

Indicators align with CHAOSS Issues New and Change Requests. PR time-to-closure and sampled first-comment response are **proxies** with explicitly different scope. GL JS documents internal import and Copybara sync, so an accepted public PR can appear closed rather than merged. Closed PRs include unmerged requests; responses exclude author and GitHub Bot comments. Unanswered observations are censored and shown in denominators. No contributor ranking, health score, unique-person inference, or historical trend is claimed. See `/methodology` for exact formulas and [CHAOSS references](https://www.chaoss.community/kb-metrics-and-metrics-models/).

After refreshing, review README counts and editorial claims manually. `research.yml` produces an artifact for review; it deliberately does not auto-publish updated conclusions. A schedule can be added after review policy is agreed.

## Validate

```sh
npm test
npm run check
npm run lint
npm run build
npm run preview
```

Optional browser suite: with Google Chrome installed and a no-token production build, run `npm run test:browser`. See [validation record](docs/VALIDATION.md) for completed checks and limits.

Metric tests cover cohort boundaries, PR/issue separation, empty data, duration medians, self/bot exclusions, and consistency between committed raw evidence and processed aggregates. Astro checks `.astro` templates and strict TypeScript; ESLint checks JS/TS scripts (Astro templates are covered by Astro check).

Before portfolio publication, test with a restricted token: map load, category colors, local filters, zero matches, venue popup, list-to-map focus, keyboard use, narrow viewport, blocked network, invalid token, and reduced motion. Confirm attribution remains visible. Record results in field notes; do not replace pending evidence with assumed success.

## Publish on GitHub Pages

An authenticated GitHub remote is not configured in this workspace. To publish:

1. Authenticate: `gh auth login -h github.com`.
2. Create a public repository and push this working tree:
   ```sh
   git add .
   git commit -m "Build independent Mapbox ecosystem field notes"
   gh repo create mapbox-developer-ecosystem-field-notes --public --source=. --remote=origin --push
   ```
   If a remote already exists, use it instead of creating another.
3. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Repository **Settings → Secrets and variables → Actions → Variables**: add `PUBLIC_MAPBOX_TOKEN` with a restricted public token. Do not put any secret token here.
5. Run **Deploy GitHub Pages** from Actions, or push to `main`. The workflow derives the origin/base path, validates, builds, and uploads `dist`. If your branch has a different name, adjust `pages.yml`.
6. Add the returned Pages URL to the token's allowed URLs, then verify a production render. Check the repository About section and set its website link.

For a custom domain, configure Pages and override build origin/base path accordingly. For any static host, deploy `dist` after setting the intended `SITE_URL` and `BASE_PATH` at build time. No runtime server or GitHub credential is needed by the website. The map fetches Mapbox resources directly; all research data is bundled locally.

## Review and next steps

1. Supply a restricted public token and complete browser/mobile/keyboard checks, recording the first real render and deployment.
2. Review licensing, contribution policies, provisional analysis, and fill in the author's firsthand field notes.
3. Expand response collection beyond the tiny newest-issue sample, retrieve actual PR merge/review events, and add a second comparable snapshot before discussing trends.

Original code and prose: MIT. Third-party material and Mapbox services keep their own licenses and terms. See LICENSE and the linked sources.
