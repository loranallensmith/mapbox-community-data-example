import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const snapshot = JSON.parse(
  await readFile("data/processed/ecosystem.json", "utf8"),
);
const channels = JSON.parse(
  await readFile("data/processed/channels.json", "utf8"),
);
for (const width of [1280, 390])
  test(`portal routes fit ${width}px without document overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/projects",
      "/explorer",
      "/image-diff",
      "/ecosystem",
      "/community",
      "/sources",
      "/field-notes",
      "/opportunities",
      "/methodology",
    ]) {
      const response = await page.goto(path);
      expect(response.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator('nav [aria-current="page"]')).toHaveCount(1);
      if (path === "/")
        await page.screenshot({
          path: `/tmp/mapbox-portal-${width}.png`,
          fullPage: true,
        });
    }
  });
test("map list filters and missing-token setup work", async ({ page }) => {
  await page.goto("/explorer");
  await expect(page.locator("#map-status")).toContainText("Map setup");
  await page
    .getByLabel("Community category")
    .selectOption("Language communities");
  await expect(page.locator(".location:visible")).toHaveCount(2);
  await page.getByLabel("Find an event or city").fill("Pittsburgh");
  await expect(page.locator(".location:visible")).toHaveCount(1);
  await page.getByLabel("Find an event or city").fill("no such event");
  await expect(page.locator("#empty")).toBeVisible();
});
test("downloads reflect the current repository and channel snapshots", async ({
  request,
}) => {
  const response = await request.get("/data/ecosystem.json");
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.repositories).toHaveLength(snapshot.repositories.length);
  expect(data.collectedAt).toBe(snapshot.collectedAt);
  expect(
    (await (await request.get("/data/channels.json")).json()).items,
  ).toHaveLength(channels.items.length);
  expect((await request.get("/data/source-config.json")).ok()).toBe(true);
});
test("repository search and archived filter agree with stored metadata", async ({
  page,
}) => {
  await page.goto("/ecosystem");
  await page
    .getByLabel("Repository status", { exact: true })
    .selectOption("archived");
  await expect(page.locator(".repo-row:visible")).toHaveCount(
    snapshot.repositories.filter((r) => r.archived).length,
  );
  await page.getByLabel("Find a repository").fill("no-such-repo");
  await expect(page.locator("#repo-empty")).toBeVisible();
});
test("community cards filter by search and publisher", async ({ page }) => {
  await page.goto("/community");
  await expect(page.locator(".content-card")).toHaveCount(
    channels.items.length,
  );
  if (channels.items.length) {
    const publisher = channels.items[0].publisher;
    await page.getByLabel("Publisher", { exact: true }).selectOption(publisher);
    await expect(page.locator(".content-card:visible")).toHaveCount(
      channels.items.filter((i) => i.publisher === publisher).length,
    );
  }
  await page.getByLabel("Search resources").fill("zz-no-matching-resource");
  await expect(page.locator("#content-empty")).toBeVisible();
});
test("pixelmatch computes a live difference and responds to threshold changes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/image-diff");
  await expect(page.locator("#diff-result strong")).toHaveText(/\d+\.\d+%/);
  const initial = await page.locator("#diff-result strong").textContent();
  expect(initial).not.toBe("0.00%");
  await page.locator("#threshold").fill("1");
  await expect(page.locator("#diff-result strong")).toHaveText("0.00%");
  await page.getByRole("button", { name: "Reset sample" }).click();
  expect(errors).toEqual([]);
});
test("mismatched image sizes show an accessible error without losing reset", async ({
  page,
}) => {
  await page.goto("/image-diff");
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const image = Buffer.from(encoded, "base64");
  await page
    .locator("#original-file")
    .setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: image });
  await expect(page.locator("#diff-error")).toContainText(
    "identical dimensions",
  );
  await page
    .locator("#changed-file")
    .setInputFiles({
      name: "matching.png",
      mimeType: "image/png",
      buffer: image,
    });
  await expect(page.locator("#diff-result strong")).toHaveText("0.00%");
  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(page.locator("#diff-error")).toBeHidden();
});
test("location and resource links remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/explorer");
  await expect(page.locator(".location")).toHaveCount(4);
  await expect(
    page.getByRole("link", { name: "Verify venue source ↗" }),
  ).toHaveCount(4);
  await page.goto("http://127.0.0.1:4322/community");
  await expect(page.locator(".content-card")).toHaveCount(
    channels.items.length,
  );
  await context.close();
});
