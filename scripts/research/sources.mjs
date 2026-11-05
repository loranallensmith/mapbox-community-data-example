import { readConfig } from "./config.mjs";
const config = await readConfig();
for (const source of config.sources)
  console.log(
    `${source.id.padEnd(12)} ${source.type.padEnd(18)} ${source.enabled ? "enabled" : "disabled"}${source.repositories ? ` · ${source.repositories.length} repositories` : ""}`,
  );
console.log(
  "\nEdit config/sources.json to add repositories, search queries, feed URLs, or curated links.",
);
