import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateConfig, mergeRepositories } from "./config.mjs";
import { buildChannelSnapshot } from "./pipeline.mjs";
import {
  contentItem,
  collectYoutube,
  collectFeed,
  collectCurated,
  collectDiscordAggregate,
} from "./adapters/content.mjs";
const context = {
  start: "2026-08-01T00:00:00Z",
  end: "2026-11-01T00:00:00Z",
  collectedAt: "2026-11-04T00:00:00Z",
  env: {},
};
test("configuration rejects duplicate source IDs, invalid repositories, and runaway page counts", () => {
  assert.throws(() =>
    validateConfig({
      version: 1,
      windowDays: 90,
      sources: [
        { id: "same", type: "curated", enabled: true, items: [] },
        { id: "same", type: "curated", enabled: true, items: [] },
      ],
    }),
  );
  assert.throws(() =>
    validateConfig({
      version: 1,
      windowDays: 90,
      sources: [
        {
          id: "github",
          type: "github",
          enabled: true,
          repositories: ["not-a-full-name"],
          responseSampleSize: 5,
        },
      ],
    }),
  );
  assert.throws(() =>
    validateConfig({
      version: 1,
      windowDays: 90,
      sources: [
        {
          id: "youtube",
          type: "youtube",
          enabled: true,
          queries: ["mapbox"],
          maxPages: 99,
          resultsPerPage: 10,
        },
      ],
    }),
  );
});
test("discovery apply merges candidates without losing manually pinned repositories", () => {
  assert.deepEqual(
    mergeRepositories(
      ["mapbox/pinned", "mapbox/existing"],
      [{ name: "mapbox/existing" }, { name: "mapbox/popular" }],
    ),
    ["mapbox/pinned", "mapbox/existing", "mapbox/popular"],
  );
});
test("content normalization rejects unsafe links and discards arbitrary source fields", () => {
  assert.throws(() =>
    contentItem(
      { title: "Bad", url: "javascript:alert(1)" },
      "test",
      context.collectedAt,
    ),
  );
  assert.throws(() =>
    contentItem(
      { title: "Bad", url: "https://secret:token@example.org" },
      "test",
      context.collectedAt,
    ),
  );
  const item = contentItem(
    {
      title: "Example",
      url: "https://example.org",
      body: "private text",
      token: "credential",
    },
    "test",
    context.collectedAt,
  );
  assert.equal(item.reviewStatus, "Needs review");
  assert.equal(item.body, undefined);
  assert.equal(item.token, undefined);
  assert.equal(item.publishedAt, null);
});
test("failed sources retain records and timestamps while fresh empty sources replace records", () => {
  const old = {
    sources: [
      { id: "feed", lastCollectedAt: "2026-10-01", window: { days: 90 } },
    ],
    items: [
      { sourceId: "feed", url: "https://example.org", publishedAt: null },
    ],
  };
  const failed = buildChannelSnapshot(
    [{ id: "feed", type: "feed", status: "error", message: "Unavailable" }],
    old,
    context.collectedAt,
  );
  assert.equal(failed.items.length, 1);
  assert.equal(failed.sources[0].lastCollectedAt, "2026-10-01");
  assert.equal(failed.sources[0].retained, true);
  const empty = buildChannelSnapshot(
    [
      {
        id: "feed",
        type: "feed",
        status: "collected",
        items: [],
        collectedAt: context.collectedAt,
      },
    ],
    old,
    context.collectedAt,
  );
  assert.equal(empty.items.length, 0);
  assert.equal(empty.sources[0].retained, false);
});
test("duplicate resource URLs are removed within a source without collapsing provenance", () => {
  const item = { sourceId: "a", url: "https://example.org", publishedAt: null };
  const snapshot = buildChannelSnapshot(
    [
      { id: "a", status: "collected", items: [item, item] },
      { id: "b", status: "collected", items: [{ ...item, sourceId: "b" }] },
    ],
    { sources: [], items: [] },
    context.collectedAt,
  );
  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.sources[0].itemCount, 1);
});
test("YouTube missing credential is explicitly unavailable and performs no request", async () => {
  const result = await collectYoutube({ id: "youtube" }, context, () => {
    throw new Error("should not fetch");
  });
  assert.equal(result.status, "needs-credential");
});
test("YouTube follows bounded pages, excludes configured channels, and retains no credential", async () => {
  let calls = 0;
  const result = await collectYoutube(
    {
      id: "youtube",
      queries: ["Mapbox"],
      maxPages: 2,
      resultsPerPage: 10,
      excludedChannelIds: ["official"],
    },
    { ...context, env: { YOUTUBE_API_KEY: "test-secret" } },
    async (url, options) => {
      calls++;
      assert.equal(options.headers["X-Goog-Api-Key"], "test-secret");
      assert.equal(url.includes("test-secret"), false);
      return Response.json({
        nextPageToken: "more",
        items: [
          {
            id: { videoId: `video-${calls}` },
            snippet: {
              title: "Community example",
              channelId: "external",
              channelTitle: "Publisher",
              publishedAt: "2026-10-01T00:00:00Z",
            },
          },
          {
            id: { videoId: "excluded" },
            snippet: { title: "Official", channelId: "official" },
          },
        ],
      });
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.evidence.searches[1].hasMore, true);
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
});
test("feed parsing enforces observation window and publisher exclusions without storing bodies", async () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><link>https://example.org</link><description>Fixture</description><item><title>Community</title><link>https://example.org/post</link><pubDate>Thu, 01 Oct 2026 00:00:00 GMT</pubDate><description>full body must not be stored</description></item><item><title>Official</title><link>https://example.org/official/post</link><pubDate>Thu, 01 Oct 2026 00:00:00 GMT</pubDate></item><item><title>Old</title><link>https://example.org/old</link><pubDate>Wed, 01 Oct 2025 00:00:00 GMT</pubDate></item></channel></rss>`;
  const result = await collectFeed(
    {
      id: "feed",
      feeds: [{ url: "https://example.org/feed", name: "Fixture" }],
      maxItemsPerFeed: 30,
      excludedUrlPrefixes: ["https://example.org/official/"],
    },
    context,
    async () => new Response(xml),
  );
  assert.equal(result.items.length, 1);
  assert.equal(JSON.stringify(result).includes("full body"), false);
});
test("Atom feed retains linked metadata with a valid date", async () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><title>Article</title><id>urn:1</id><link href="https://example.org/atom"/><updated>2026-10-01T00:00:00Z</updated></entry></feed>`;
  const result = await collectFeed(
    {
      id: "atom",
      feeds: [{ url: "https://example.org/feed", name: "Fixture" }],
      maxItemsPerFeed: 10,
    },
    context,
    async () => new Response(xml),
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].url, "https://example.org/atom");
});
test("curation preserves unknown publication dates without guessing", async () => {
  const result = await collectCurated(
    {
      id: "curated",
      items: [
        {
          title: "Project",
          url: "https://example.org",
          publisher: "Publisher",
          kind: "Project",
        },
      ],
    },
    context,
  );
  assert.equal(result.items[0].publishedAt, null);
});
test("Discord import requires public provenance and discards member records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ecosystem-aggregate-"));
  try {
    const path = join(dir, "input.json");
    await writeFile(
      path,
      JSON.stringify({
        publishable: true,
        sourceUrl: "https://example.org/report",
        window: { start: "2026-10-01", end: "2026-11-01" },
        aggregates: [{ label: "Events", count: 3, members: ["private"] }],
        messages: ["private"],
      }),
    );
    const result = await collectDiscordAggregate({ path }, context);
    assert.equal(JSON.stringify(result).includes("private"), false);
    assert.equal(result.window.days, 31);
    await writeFile(path, JSON.stringify({ publishable: false }));
    await assert.rejects(() => collectDiscordAggregate({ path }, context));
  } finally {
    await rm(dir, { recursive: true });
  }
});
import { collectGithub } from "./adapters/github.mjs";
test("GitHub adapter paginates issue and comment endpoints and minimizes authors", async () => {
  const fetched = [];
  const output = await collectGithub(
    { repositories: ["mapbox/example"], responseSampleSize: 1 },
    {
      ...context,
      windowDays: 92,
      fetcher: async (url) => {
        fetched.push(url);
        if (url.endsWith("/repos/mapbox/example"))
          return Response.json({
            html_url: "https://github.com/mapbox/example",
            default_branch: "main",
            description: "Example",
            archived: false,
            disabled: false,
            pushed_at: context.end,
            license: { spdx_id: "MIT" },
          });
        if (url.includes("/git/trees/"))
          return Response.json({
            tree: [{ path: "CONTRIBUTING.md" }],
            truncated: false,
          });
        if (url.includes("/comments")) {
          const second = url.includes("page=2");
          return Response.json(
            [
              {
                created_at: second
                  ? "2026-10-01T02:00:00Z"
                  : "2026-10-01T01:00:00Z",
                user: { login: second ? "responder" : "author", type: "User" },
                body: "not retained",
              },
            ],
            {
              headers: second
                ? {}
                : { link: '<https://api.github.com/next>; rel="next"' },
            },
          );
        }
        const second = url.includes("page=2");
        return Response.json(
          second
            ? [
                {
                  number: 2,
                  html_url: "https://github.com/mapbox/example/pull/2",
                  created_at: "2026-10-02T00:00:00Z",
                  closed_at: null,
                  pull_request: {},
                },
              ]
            : [
                {
                  number: 1,
                  html_url: "https://github.com/mapbox/example/issues/1",
                  created_at: "2026-10-01T00:00:00Z",
                  user: { login: "author" },
                },
              ],
          {
            headers: second
              ? {}
              : { link: '<https://api.github.com/next>; rel="next"' },
          },
        );
      },
    },
  );
  assert.equal(output.summary.repositories[0].metrics.issuesOpened, 1);
  assert.equal(output.summary.repositories[0].metrics.prsOpened, 1);
  assert.equal(
    output.summary.repositories[0].metrics.medianSampleResponseHours,
    2,
  );
  assert.equal(fetched.filter((url) => url.includes("/comments")).length, 2);
  assert.equal(JSON.stringify(output).includes("not retained"), false);
  assert.equal(JSON.stringify(output).includes("responder"), false);
});
