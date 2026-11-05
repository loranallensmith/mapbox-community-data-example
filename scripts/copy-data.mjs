import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/data", { recursive: true });
for (const [source, dest] of [
  ["data/raw/github.json", "github.json"],
  ["data/processed/ecosystem.json", "ecosystem.json"],
  ["data/processed/locations.json", "locations.json"],
  ["data/processed/channels.json", "channels.json"],
  ["data/processed/discovery.json", "discovery.json"],
  ["config/sources.json", "source-config.json"],
])
  await copyFile(source, `public/data/${dest}`);
