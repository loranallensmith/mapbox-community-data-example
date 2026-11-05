import { summarize, median, responseHours } from "../metrics.mjs";
import { request } from "../http.mjs";
export async function collectGithub(source, context) {
  const { start, end, collectedAt, env } = context;
  const repositories = source.repositories;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mapbox-ecosystem-explorer",
    ...(env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
      : {}),
  };
  async function get(path, optional = false) {
    const res = await request(
      `https://api.github.com${path}`,
      { headers },
      context.fetcher,
    );
    if (optional && res.status === 404) return null;
    if (res.ok)
      return {
        data: await res.json(),
        next: res.headers.get("link")?.includes('rel="next"'),
      };
    throw new Error(
      `GitHub ${res.status} at ${path}; remaining=${res.headers.get("x-ratelimit-remaining")}; reset=${res.headers.get("x-ratelimit-reset")}. Retry later or supply GITHUB_TOKEN.`,
    );
  }

  async function pages(path) {
    const all = [];
    for (let p = 1; p <= 30; p++) {
      const r = await get(
        `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${p}`,
      );
      all.push(...r.data);
      if (!r.next) return all;
    }
    throw new Error(
      `Pagination limit reached: ${path}; no partial metric emitted`,
    );
  }
  const result = {
    schemaVersion: 1,
    collectedAt,
    window: { start, end, days: context.windowDays },
    responseSampling: `Newest ${source.responseSampleSize ?? 5} non-PR issues created in the window per repository; comments only, excludes author and GitHub Bot accounts. Censored unanswered items excluded from median.`,
    selection: { mode: "explicit", repositories },
    candidates: [],
    repositories: [],
  };
  for (const full of repositories) {
    const base = `/repos/${full}`;
    const r = await get(base, true);
    if (!r) {
      result.candidates.push({
        name: full,
        status:
          "Not publicly retrievable (404); absence is not proof of nonexistence.",
      });
      continue;
    }
    const m = r.data;
    const tree = (
      await get(
        `${base}/git/trees/${encodeURIComponent(m.default_branch)}?recursive=1`,
      )
    ).data;
    const paths = tree.tree.map((x) => x.path);
    const docs = {};
    for (const kind of [
      "CONTRIBUTING",
      "LICENSE",
      "CODE_OF_CONDUCT",
      "SUPPORT",
    ])
      docs[kind] = paths.filter((p) =>
        new RegExp(`(^|/)${kind}([.].*)?$`, "i").test(p),
      );
    const all = await pages(
      `${base}/issues?state=all&since=${start}&sort=created&direction=desc`,
    );
    const cohort = all.filter(
      (x) =>
        Date.parse(x.created_at) >= Date.parse(start) &&
        Date.parse(x.created_at) <= Date.parse(end),
    );
    const items = cohort.map((x) => ({
      number: x.number,
      url: x.html_url,
      created_at: x.created_at,
      closed_at: x.closed_at,
      pr: Boolean(x.pull_request),
    }));
    const responseSample = [];
    for (const issue of cohort
      .filter((x) => !x.pull_request)
      .slice(0, source.responseSampleSize ?? 5)) {
      const comments = await pages(`${base}/issues/${issue.number}/comments`);
      const responses = comments
        .filter((c) => Date.parse(c.created_at) <= Date.parse(end))
        .map((c) => ({
          created_at: c.created_at,
          self: c.user?.login === issue.user?.login,
          bot: c.user?.type === "Bot",
        }));
      responseSample.push({
        number: issue.number,
        url: issue.html_url,
        created_at: issue.created_at,
        responses,
        firstResponseHours: responseHours(issue.created_at, responses),
      });
    }
    const observed = responseSample.filter(
      (x) => x.firstResponseHours !== null,
    );
    const repo = {
      name: full,
      url: m.html_url,
      description: m.description,
      archived: m.archived,
      disabled: m.disabled,
      pushedAt: m.pushed_at,
      branch: m.default_branch,
      license: m.license?.spdx_id || "Unspecified",
      docs,
      treeTruncated: tree.truncated,
      metrics: {
        ...summarize(items, start, end),
        responseSampleSize: responseSample.length,
        respondedSample: observed.length,
        medianSampleResponseHours: median(
          observed.map((x) => x.firstResponseHours),
        ),
      },
      items,
      responseSample,
    };
    result.repositories.push(repo);
    console.log(
      `${full}: ${items.length} window items; ${responseSample.length} sampled issues`,
    );
  }
  return {
    evidence: result,
    summary: {
      ...result,
      repositories: result.repositories.map((repo) =>
        Object.fromEntries(
          Object.entries(repo).filter(
            ([key]) => !["items", "responseSample"].includes(key),
          ),
        ),
      ),
    },
  };
}
