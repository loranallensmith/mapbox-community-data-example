// One bounded request helper. No credential-bearing URLs are logged.
export async function request(url, options = {}, fetcher = fetch) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** attempt),
        );
        continue;
      }
      throw new Error(
        "Network request failed or timed out; previous source snapshot retained.",
      );
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retry = response.headers.get("retry-after");
      const seconds = retry
        ? Number.isFinite(Number(retry))
          ? Number(retry)
          : (Date.parse(retry) - Date.now()) / 1000
        : 2 ** attempt;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, Math.min(30000, seconds * 1000))),
      );
      continue;
    }
    return response;
  }
}
export async function jsonRequest(url, options = {}, fetcher) {
  const response = await request(url, options, fetcher);
  if (!response.ok)
    throw new Error(
      `Public API returned HTTP ${response.status}. Check access, quota, or source configuration.`,
    );
  return response.json();
}
export function publicUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
