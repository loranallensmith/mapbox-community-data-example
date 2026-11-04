import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/data", { recursive: true });
for (const [source, dest] of [
  ["data/raw/github.json", "github.json"],
  ["data/processed/ecosystem.json", "ecosystem.json"],
  ["data/processed/locations.json", "locations.json"],
])
  await copyFile(source, `public/data/${dest}`);
