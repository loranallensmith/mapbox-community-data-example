import { test } from "node:test";
import assert from "node:assert/strict";
import { median, summarize, responseHours } from "./metrics.mjs";
test("median handles empty, even and odd cohorts without mutation", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 2]), 3);
});
test("cohort separates issues and PRs, excludes out-of-window and still-open closures", () => {
  const r = summarize(
    [
      { created_at: "2026-01-02", closed_at: "2026-01-03", pr: true },
      { created_at: "2026-01-04", closed_at: null, pr: true },
      { created_at: "2026-01-05", pr: false },
      { created_at: "2025-12-01", pr: false },
    ],
    "2026-01-01",
    "2026-02-01",
  );
  assert.deepEqual(r, {
    issuesOpened: 1,
    prsOpened: 2,
    closedPrs: 1,
    medianPrCloseHours: 24,
  });
});
test("response proxy excludes author, bots and predating comments", () => {
  assert.equal(
    responseHours("2026-01-01T00:00:00Z", [
      { created_at: "2026-01-01T01:00:00Z", self: true },
      { created_at: "2026-01-01T02:00:00Z", bot: true },
      { created_at: "2025-12-31T00:00:00Z" },
      { created_at: "2026-01-01T04:00:00Z" },
    ]),
    4,
  );
  assert.equal(responseHours("2026-01-01", []), null);
});
import { readFile } from "node:fs/promises";
test("committed presentation data reproduces normalized evidence", async () => {
  const raw = JSON.parse(await readFile("data/raw/github.json"));
  const processed = JSON.parse(await readFile("data/processed/ecosystem.json"));
  for (const repo of raw.repositories) {
    const summary = summarize(repo.items, raw.window.start, raw.window.end);
    const displayed = processed.repositories.find((x) => x.name === repo.name);
    for (const [key, value] of Object.entries(summary))
      assert.equal(displayed.metrics[key], value);
    const responses = repo.responseSample.map((x) =>
      responseHours(x.created_at, x.responses),
    );
    assert.equal(
      displayed.metrics.medianSampleResponseHours,
      median(responses.filter((x) => x !== null)),
    );
    assert.equal(
      displayed.metrics.respondedSample,
      responses.filter((x) => x !== null).length,
    );
  }
});
test("timestamp precision and time-zone offsets preserve instant boundaries", () => {
  const r = summarize(
    [
      { created_at: "2026-01-01T00:00:00Z", pr: false },
      { created_at: "2025-12-31T19:00:01-05:00", pr: false },
    ],
    "2026-01-01T00:00:00.500Z",
    "2026-01-01T00:00:02.000Z",
  );
  assert.equal(r.issuesOpened, 1);
});
