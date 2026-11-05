export function sourceStatus(source: {
  status: string;
  lastCollectedAt: string | null;
}) {
  return source.status === "not-run" && source.lastCollectedAt
    ? "Saved snapshot"
    : source.status.replaceAll("-", " ");
}
