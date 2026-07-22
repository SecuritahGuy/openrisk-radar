import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function blockExternalRequests(page: Page, options: { tsunamiFallback?: boolean } = {}) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
    } else if (url.hostname === "nominatim.openstreetmap.org" && url.pathname === "/search") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{
          lat: "42.3443070",
          lon: "-88.0335501",
          display_name: "60030, Grayslake, Lake County, Illinois, United States",
          address: {
            postcode: "60030",
            town: "Grayslake",
            county: "Lake County",
            state: "Illinois",
            country: "United States",
            country_code: "us",
          },
        }]),
      });
    } else if (options.tsunamiFallback && url.hostname === "tsunami.gov") {
      await route.fulfill({ status: 502, body: "Bad gateway" });
    } else if (options.tsunamiFallback && url.hostname === "www.tsunami.gov" && url.pathname.endsWith("Atom.xml")) {
      await route.fulfill({
        contentType: "application/atom+xml",
        body: url.pathname.includes("PAAQ") ? `<feed xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"><entry>
          <title>Browser fallback event</title><updated>${new Date().toISOString()}</updated>
          <geo:lat>42.35</geo:lat><geo:long>-88.05</geo:long>
          <summary><strong>Category:</strong> Warning<br/>Move inland.</summary>
          <id>urn:uuid:browser-fallback</id>
        </entry></feed>` : "<feed></feed>",
      });
    } else {
      await route.abort("blockedbyclient");
    }
  });
}

async function openZip(page: Page) {
  await blockExternalRequests(page);
  await page.goto("/app?q=60030");
  await expect(page.getByText("Grayslake, IL", { exact: false }).first()).toBeVisible();
}

test("ZIP search is accessible and overflow-free on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openZip(page);

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Live risk radar dashboard" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Search by ZIP code or city" })).toHaveValue("60030");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const targets = page.locator("button:visible, input:not([type=checkbox]):not([type=radio]):visible, select:visible");
  const undersized = await targets.evaluateAll((elements) => elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName, width: rect.width, height: rect.height };
    })
    .filter((target) => target.width < 44 || target.height < 44));
  expect(undersized).toEqual([]);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("short desktop view keeps the map reachable through scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await openZip(page);
  const main = page.locator(".app-main");
  const map = page.locator(".map-view");
  await expect(map).toBeVisible();
  expect(await map.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(360);
  expect(await main.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("monitored-place collapse state survives reload", async ({ page }) => {
  await openZip(page);
  await page.getByRole("button", { name: /Save Location/ }).click();
  const overview = page.getByTestId("saved-location-overview");
  await expect(overview).toBeVisible();
  const toggle = page.getByTestId("saved-location-overview-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(page.getByTestId("saved-location-overview-toggle")).toHaveAttribute("aria-expanded", "false");
});

test("NASA imagery layer and opacity preferences survive reload", async ({ page }) => {
  await openZip(page);
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("checkbox", { name: "NASA satellite imagery" }).check();
  await page.getByLabel("NASA GIBS layer").selectOption("Snow_Cover");
  await page.getByLabel("NASA GIBS opacity").fill("55");
  await expect(page.getByText("Snow-cover fraction")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("checkbox", { name: "NASA satellite imagery" })).toBeChecked();
  await expect(page.getByLabel("NASA GIBS layer")).toHaveValue("Snow_Cover");
  await expect(page.getByLabel("NASA GIBS opacity")).toHaveValue("55");
});

test("a NOAA JSON outage activates the official tsunami fallback without a hard source error", async ({ page }) => {
  await blockExternalRequests(page, { tsunamiFallback: true });
  await page.goto("/app?q=60030");
  await expect(page.getByText("Grayslake, IL", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Official NTWC\/PTWC feed fallback active with 1 signal/)).toBeVisible();
  await expect(page.getByText(/NOAA Tsunami API returned 502/)).toHaveCount(0);
});
