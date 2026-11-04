import { test, expect } from "@playwright/test";
for (const width of [1280, 390]) {
  test(`all pages render without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/explorer",
      "/ecosystem",
      "/field-notes",
      "/opportunities",
      "/methodology",
    ]) {
      const response = await page.goto(path);
      expect(response.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      if (path === "/")
        await page.screenshot({
          path: `/tmp/mapbox-overview-${width}.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator('nav [aria-current="page"]')).toHaveCount(1);
    }
  });
}
test("no-token setup and accessible filter path", async ({ page }) => {
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
  await expect(page.locator("#count")).toHaveText("0 locations");
});
test("downloaded evidence exists and snapshot totals agree", async ({
  request,
}) => {
  const response = await request.get("/data/ecosystem.json");
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.repositories).toHaveLength(3);
  expect(
    data.repositories.reduce(
      (n, r) => n + r.metrics.issuesOpened + r.metrics.prsOpened,
      0,
    ),
  ).toBe(84);
});
test("all venue cards remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4321/explorer");
  await expect(page.locator(".location")).toHaveCount(4);
  await expect(page.locator(".location").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Verify venue source ↗" }),
  ).toHaveCount(4);
  await context.close();
});
