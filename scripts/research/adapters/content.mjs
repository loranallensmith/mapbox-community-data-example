import Parser from "rss-parser";
import { readFile } from "node:fs/promises";
import { jsonRequest, request, publicUrl } from "../http.mjs";
export function contentItem(item, sourceId, collectedAt) {
  const url = publicUrl(item.url);
  if (!url || typeof item.title !== "string" || !item.title.trim())
    throw new Error("Content items need a title and a public HTTP(S) URL.");
  const publishedAt = item.publishedAt
    ? new Date(item.publishedAt).toISOString()
    : null;
  return {
    id: url,
    sourceId,
    title: item.title.trim().slice(0, 300),
    url,
    kind: item.kind || "Article",
    publisher: String(item.publisher || "Unknown publisher").slice(0, 160),
    publishedAt,
    collectedAt,
    affiliation: "Unverified",
    reviewStatus: "Needs review",
  };
}
export const inWindow = (date, { start, end }) =>
  date &&
  Date.parse(date) >= Date.parse(start) &&
  Date.parse(date) <= Date.parse(end);
export async function collectYoutube(source, context, fetcher) {
  if (!context.env.YOUTUBE_API_KEY)
    return {
      status: "needs-credential",
      message: "Set YOUTUBE_API_KEY to collect public video metadata.",
      items: [],
      evidence: [],
    };
  const items = [],
    searches = [];
  for (const query of source.queries) {
    let pageToken;
    for (let page = 0; page < source.maxPages; page++) {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        q: query,
        order: "date",
        publishedAfter: context.start,
        publishedBefore: context.end,
        maxResults: String(source.resultsPerPage),
        ...(pageToken ? { pageToken } : {}),
      });
      const data = await jsonRequest(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { headers: { "X-Goog-Api-Key": context.env.YOUTUBE_API_KEY } },
        fetcher,
      );
      searches.push({
        query,
        page: page + 1,
        hasMore: Boolean(data.nextPageToken),
      });
      for (const item of data.items || []) {
        if (
          !item.id?.videoId ||
          source.excludedChannelIds?.includes(item.snippet.channelId)
        )
          continue;
        items.push(
          contentItem(
            {
              title: item.snippet.title,
              url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id.videoId)}`,
              kind: "Video",
              publisher: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
            },
            source.id,
            context.collectedAt,
          ),
        );
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }
  return {
    status: "collected",
    items,
    evidence: { searches, items },
    message:
      "Bounded search results, not all YouTube content. Publisher affiliation is unverified; no transcripts, comments, or view counts collected.",
  };
}
export async function collectFeed(source, context, fetcher) {
  const items = [],
    coverage = [];
  for (const feed of source.feeds) {
    if (!publicUrl(feed.url)) throw new Error("Invalid feed URL.");
    const response = await request(
      feed.url,
      {
        headers: {
          Accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
      },
      fetcher,
    );
    if (!response.ok)
      throw new Error(
        `Feed returned HTTP ${response.status}; previous source snapshot retained.`,
      );
    const text = await response.text();
    if (text.length > 5e6) throw new Error("Feed exceeds 5 MB limit.");
    const parsed = await new Parser().parseString(text);
    const entries = parsed.items.slice(0, source.maxItemsPerFeed);
    for (const entry of entries) {
      const publishedAt = entry.isoDate || entry.pubDate;
      if (
        !inWindow(publishedAt, context) ||
        source.excludedUrlPrefixes?.some((prefix) =>
          entry.link?.startsWith(prefix),
        )
      )
        continue;
      items.push(
        contentItem(
          {
            title: entry.title,
            url: entry.link,
            kind: "Article",
            publisher: entry.creator || feed.name,
            publishedAt,
          },
          source.id,
          context.collectedAt,
        ),
      );
    }
    coverage.push({
      url: feed.url,
      examined: entries.length,
      available: parsed.items.length,
    });
  }
  return {
    status: "collected",
    items,
    evidence: { feeds: coverage, items },
    message:
      "Feed entries only; dated items in this window, subject to publisher feed retention. No full article text collected.",
  };
}
export async function collectCurated(source, context) {
  return {
    status: "collected",
    items: source.items.map((item) =>
      contentItem(item, source.id, context.collectedAt),
    ),
    evidence: {
      items: source.items.map((item) =>
        contentItem(item, source.id, context.collectedAt),
      ),
    },
    message:
      "Manually selected public links; not an exhaustive sample. Undated and older links may be included.",
  };
}
export async function collectDiscordAggregate(source, context) {
  // No message scraping: only explicitly publishable, non-identifying totals.
  const data = JSON.parse(await readFile(source.path, "utf8"));
  if (
    data.publishable !== true ||
    !publicUrl(data.sourceUrl) ||
    !Number.isFinite(Date.parse(data.window?.start)) ||
    !Number.isFinite(Date.parse(data.window?.end)) ||
    Date.parse(data.window?.end) <= Date.parse(data.window?.start)
  )
    throw new Error(
      "Discord import requires publishable:true, a public source URL, and exact window bounds.",
    );
  const aggregates = data.aggregates?.map((row) => {
    if (
      typeof row.label !== "string" ||
      !Number.isInteger(row.count) ||
      row.count < 0
    )
      throw new Error(
        "Aggregate rows require label and nonnegative integer count.",
      );
    return { label: row.label.slice(0, 100), count: row.count };
  });
  if (!aggregates?.length) throw new Error("No aggregate rows supplied.");
  return {
    status: "imported",
    items: [],
    evidence: { sourceUrl: data.sourceUrl, window: data.window, aggregates },
    aggregates,
    window: {
      ...data.window,
      days:
        (Date.parse(data.window.end) - Date.parse(data.window.start)) / 864e5,
    },
    message:
      "Imported publishable aggregate totals only. No message text, user IDs, or member lists collected.",
    collectedAt: context.collectedAt,
  };
}
