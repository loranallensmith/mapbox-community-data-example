export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function summarize(items, start, end) {
  const cohort = items.filter(
    (x) =>
      Date.parse(x.created_at) >= Date.parse(start) &&
      Date.parse(x.created_at) <= Date.parse(end),
  );
  const issues = cohort.filter((x) => !x.pr),
    prs = cohort.filter((x) => x.pr);
  const closed = prs.filter(
    (x) => x.closed_at && Date.parse(x.closed_at) <= Date.parse(end),
  );
  return {
    issuesOpened: issues.length,
    prsOpened: prs.length,
    closedPrs: closed.length,
    medianPrCloseHours: median(
      closed.map(
        (x) => (Date.parse(x.closed_at) - Date.parse(x.created_at)) / 36e5,
      ),
    ),
  };
}
export function responseHours(created, responses) {
  const eligible = responses
    .filter(
      (x) =>
        !x.self && !x.bot && Date.parse(x.created_at) >= Date.parse(created),
    )
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return eligible.length
    ? (Date.parse(eligible[0].created_at) - Date.parse(created)) / 36e5
    : null;
}
