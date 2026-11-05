import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { readConfig, loadEnvironment, mergeRepositories } from "./config.mjs";
import { jsonRequest } from "./http.mjs";
loadEnvironment();
const { values } = parseArgs({
  options: {
    apply: { type: "boolean" },
    config: { type: "string", default: "config/sources.json" },
  },
});
const config = await readConfig(values.config);
const source = config.sources.find((s) => s.type === "github");
const selection = source.discovery;
if (
  !selection ||
  !["stars", "forks", "updated"].includes(selection.sort) ||
  !Number.isInteger(selection.limit) ||
  selection.limit < 1 ||
  selection.limit > 100
)
  throw new Error(
    "Configure github.discovery with sort stars/forks/updated and limit 1–100.",
  );
const date = new Date(Date.now() - (selection.recentPushDays || 365) * 864e5)
  .toISOString()
  .slice(0, 10);
const query = `${selection.query} pushed:>=${date}`;
const params = new URLSearchParams({
  q: query,
  sort: selection.sort,
  order: "desc",
  per_page: String(selection.limit),
});
const data = await jsonRequest(
  `https://api.github.com/search/repositories?${params}`,
  {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mapbox-ecosystem-explorer",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  },
);
if (data.incomplete_results)
  throw new Error(
    "GitHub search returned incomplete results; candidate list not replaced.",
  );
const snapshot = {
  collectedAt: new Date().toISOString(),
  query,
  sort: selection.sort,
  totalMatches: data.total_count,
  limit: selection.limit,
  limitations:
    "Stars are cumulative popularity signals, not current adoption or community health. Discovery candidates do not automatically join the research sample.",
  repositories: data.items.map((r) => ({
    name: r.full_name,
    url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    pushedAt: r.pushed_at,
    archived: r.archived,
    selected: source.repositories.includes(r.full_name),
  })),
};
await mkdir("data/processed", { recursive: true });
await writeFile(
  "data/processed/discovery.json",
  JSON.stringify(snapshot, null, 2) + "\n",
);
console.log(
  `Saved ${snapshot.repositories.length} discovery candidates to data/processed/discovery.json. Add chosen owner/repository names to config/sources.json, then collect github.`,
);

if (values.apply) {
  source.repositories = mergeRepositories(
    source.repositories,
    snapshot.repositories,
  );
  await writeFile(values.config, JSON.stringify(config, null, 2) + "\n");
  console.log(
    `Merged shortlist into ${values.config}; ${source.repositories.length} repositories selected. Collect github to refresh metrics.`,
  );
}
