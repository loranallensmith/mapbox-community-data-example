import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { readConfig, loadEnvironment } from "./config.mjs";
import { collectGithub } from "./adapters/github.mjs";
import {
  collectYoutube,
  collectFeed,
  collectCurated,
  collectDiscordAggregate,
} from "./adapters/content.mjs";
import { buildChannelSnapshot } from "./pipeline.mjs";
loadEnvironment();
const { values } = parseArgs({
  options: {
    source: { type: "string", multiple: true },
    config: { type: "string", default: "config/sources.json" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(
    "npm run research:collect -- [--source github] [--source articles] [--config config/sources.json]\nSources load from config/sources.json. .env loads automatically. Missing optional credentials are reported, not treated as empty observations.",
  );
  process.exit(0);
}
const config = await readConfig(values.config);
for (const id of values.source || [])
  if (!config.sources.some((s) => s.id === id))
    throw new Error(`Unknown source: ${id}`);
const end = new Date(process.env.RESEARCH_END || Date.now()).toISOString(),
  collectedAt = new Date().toISOString();
const githubSnapshot = JSON.parse(
  await readFile("data/processed/ecosystem.json", "utf8"),
);
let previous = {
  sources: [
    {
      id: "github",
      lastCollectedAt: githubSnapshot.collectedAt,
      window: githubSnapshot.window,
    },
  ],
  items: [],
};
try {
  previous = JSON.parse(await readFile("data/processed/channels.json", "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const adapters = {
  github: collectGithub,
  youtube: collectYoutube,
  feed: collectFeed,
  curated: collectCurated,
  "discord-aggregate": collectDiscordAggregate,
};
const results = [];
for (const source of config.sources) {
  const windowDays = source.windowDays || config.windowDays;
  const context = {
    start: new Date(Date.parse(end) - windowDays * 864e5).toISOString(),
    end,
    collectedAt,
    windowDays,
    env: process.env,
  };
  if (!source.enabled) {
    results.push({
      id: source.id,
      type: source.type,
      status: "disabled",
      message: source.reason || "Disabled in source configuration.",
    });
    continue;
  }
  if (values.source && !values.source.includes(source.id)) {
    results.push({
      id: source.id,
      type: source.type,
      status: "not-run",
      message: "Not selected for this run.",
    });
    continue;
  }
  try {
    const output = await adapters[source.type](source, context);
    const row = {
      id: source.id,
      type: source.type,
      status: output.status || "collected",
      message:
        output.message || "Public GitHub metadata and bounded activity cohort.",
      window: { start: context.start, end, days: windowDays },
      collectedAt,
      ...output,
    };
    if (["collected", "imported"].includes(row.status)) {
      await mkdir("data/raw/channels", { recursive: true });
      await writeFile(
        `data/raw/channels/${source.id}.json`,
        JSON.stringify(
          {
            sourceId: source.id,
            collectedAt,
            window: row.window,
            data: output.evidence,
          },
          null,
          2,
        ) + "\n",
      );
      if (source.type === "github") {
        await writeFile(
          "data/raw/github.json",
          JSON.stringify(output.evidence, null, 2) + "\n",
        );
        await writeFile(
          "data/processed/ecosystem.json",
          JSON.stringify(output.summary, null, 2) + "\n",
        );
      }
    }
    results.push(row);
    console.log(
      `${source.id}: ${row.status}${row.items ? ` (${row.items.length} items)` : ""}`,
    );
  } catch (error) {
    process.exitCode = 1;
    results.push({
      id: source.id,
      type: source.type,
      status: "error",
      message: error.message,
    });
    console.error(`${source.id}: ${error.message}`);
  }
}
const snapshot = buildChannelSnapshot(results, previous, collectedAt);
await mkdir("data/processed", { recursive: true });
await writeFile(
  "data/processed/channels.json",
  JSON.stringify(snapshot, null, 2) + "\n",
);
