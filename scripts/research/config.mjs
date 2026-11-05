import { readFile } from "node:fs/promises";
export const sourceTypes = [
  "github",
  "youtube",
  "feed",
  "curated",
  "discord-aggregate",
];
export function validateConfig(config) {
  if (config.version !== 1 || !Array.isArray(config.sources))
    throw new Error("Expected version: 1 and a sources array.");
  if (config.sources.filter((s) => s.type === "github").length > 1)
    throw new Error("Use one GitHub source and add repositories to its list.");
  const ids = new Set();
  for (const source of config.sources) {
    if (!/^[a-z][a-z0-9-]*$/.test(source.id) || ids.has(source.id))
      throw new Error("Source IDs must be unique lowercase names.");
    ids.add(source.id);
    if (
      !sourceTypes.includes(source.type) ||
      typeof source.enabled !== "boolean"
    )
      throw new Error(`Invalid type or enabled flag: ${source.id}`);
    if (
      source.type === "github" &&
      (!Array.isArray(source.repositories) ||
        !source.repositories.length ||
        source.repositories.some((r) => !/^[-\w.]+\/[-\w.]+$/.test(r)))
    )
      throw new Error("Use owner/repository names in github.repositories.");
    if (
      source.type === "github" &&
      (!Number.isInteger(source.responseSampleSize) ||
        source.responseSampleSize < 0 ||
        source.responseSampleSize > 20)
    )
      throw new Error("responseSampleSize must be 0–20.");
    if (
      source.type === "youtube" &&
      (!Array.isArray(source.queries) ||
        source.queries.some((q) => typeof q !== "string" || !q.trim()) ||
        !Number.isInteger(source.maxPages) ||
        source.maxPages < 1 ||
        source.maxPages > 5 ||
        !Number.isInteger(source.resultsPerPage) ||
        source.resultsPerPage < 1 ||
        source.resultsPerPage > 50)
    )
      throw new Error(
        "YouTube needs queries, maxPages 1–5, and resultsPerPage 1–50.",
      );
    if (
      source.type === "feed" &&
      (!Array.isArray(source.feeds) ||
        !Number.isInteger(source.maxItemsPerFeed) ||
        source.maxItemsPerFeed < 1 ||
        source.maxItemsPerFeed > 100)
    )
      throw new Error("Feeds need a feeds array and maxItemsPerFeed 1–100.");
    if (source.type === "curated" && !Array.isArray(source.items))
      throw new Error("Curated sources need an items array.");
  }
  for (const days of [
    config.windowDays,
    ...config.sources.map((s) => s.windowDays).filter((d) => d !== undefined),
  ])
    if (!Number.isInteger(days) || days < 1 || days > 3650)
      throw new Error("Observation windows must be 1–3650 whole days.");
  return config;
}
export async function readConfig(path = "config/sources.json") {
  return validateConfig(JSON.parse(await readFile(path, "utf8")));
}
export function loadEnvironment() {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function mergeRepositories(existing, candidates) {
  return [...new Set([...existing, ...candidates.map((r) => r.name)])];
}
