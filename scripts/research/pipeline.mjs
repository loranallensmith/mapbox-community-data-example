export function buildChannelSnapshot(results, previous, collectedAt) {
  const items = [],
    sources = [];
  for (const result of results) {
    const old = previous.sources.find((s) => s.id === result.id);
    const success = ["collected", "imported"].includes(result.status);
    const retained = success
      ? result.items || []
      : previous.items.filter((i) => i.sourceId === result.id);
    const unique = [
      ...new Map(retained.map((item) => [item.url, item])).values(),
    ];
    items.push(...unique);
    const aggregates = success ? result.aggregates : old?.aggregates;
    sources.push({
      id: result.id,
      type: result.type,
      status: result.status,
      message: result.message,
      lastCollectedAt: success
        ? result.collectedAt
        : old?.lastCollectedAt || null,
      window: success ? result.window : old?.window || null,
      retained: !success && Boolean(old?.lastCollectedAt),
      itemCount: unique.length,
      ...(aggregates ? { aggregates } : {}),
    });
  }
  return {
    schemaVersion: 1,
    lastRunAt: collectedAt,
    sources,
    items: items.sort(
      (a, b) =>
        (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0),
    ),
  };
}
