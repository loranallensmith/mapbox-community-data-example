# Validation — 2026-11-04

Runtime: Node 24.13.1 on macOS. Static Astro 7.4.5 build.

Completed:

- `npm test`: 5 passing metric/evidence tests, including timestamp precision and saved-snapshot consistency.
- `npm run check`: no errors, warnings, or hints at last check.
- `npm run lint`: passed.
- `npm run build`: all six static routes generated.
- Separate GitHub Pages subpath build: verified prefixed navigation and bundled asset URLs.
- `npm run test:browser`: 5 passing Playwright tests against installed Chrome: all six routes at 1280px and 390px without document overflow; navigation current-state; missing-token message; category/text/no-results interactions; evidence downloads; four visible venue cards and source links with JavaScript disabled.
- Desktop/mobile overview screenshots manually inspected. Schematic preview is explicitly labeled and is not a screenshot of an authenticated map.
- npm install audit after dependency updates: zero reported vulnerabilities. A minimatch override selects a patched release; lint and type checks passed with it.

Limits:

- No Mapbox token supplied. Authenticated map render, colors, popup behavior, list-to-map focus, token URL restrictions, and Mapbox resource errors remain unverified in a live session.
- Mobile checks emulate a narrow viewport, not a physical device. No screen-reader audit or interview conducted.
- Production deployment not performed: no Git remote, invalid existing GitHub CLI authentication.
- Build emits a large-chunk advisory for Mapbox GL JS. The SDK is only included by the explorer page; deferred SDK loading is a possible refinement.
- Analyses and contribution-policy interpretations require author review. Current live guides can change independently of the collected metadata.

Browser testing requires locally installed Google Chrome. Build with PUBLIC_MAPBOX_TOKEN unset for the no-token suite, then run `npm run test:browser`. Screenshots are written to `/tmp/mapbox-overview-1280.png` and `/tmp/mapbox-overview-390.png`. If preview is left running by Astro's background lifecycle, stop it with `npm exec astro -- preview stop`.
