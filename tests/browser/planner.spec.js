import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { buildPlan, demoSnapshot } from "../../lib/air.js";
import { now } from "../fixtures.js";

const require = createRequire(import.meta.url);

test("a mismatched AI response can be retried and only the matching plan can be downloaded", async ({
  page,
}) => {
  const snapshot = { ...demoSnapshot(now), kind: "modelled" };
  await page.route("**/api/analyze", (route) => {
    const household = route.request().postDataJSON();
    return route.fulfill({
      json: buildPlan(household, snapshot, ["community"], true),
    });
  });
  await page.route(
    "**/api/analyze",
    (route) => {
      const different = {
        ...route.request().postDataJSON(),
        city: "Different city",
      };
      return route.fulfill({
        json: buildPlan(different, snapshot, ["community"], true),
      });
    },
    { times: 1 },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Personalize with Gemini" }).click();
  await expect(page.locator("#status")).toContainText("different household");
  await expect(page.locator("#output")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Download family plan" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Personalize with Gemini" }).click();
  await expect(page.locator("#badge")).toHaveText("LIVE DATA · GEMINI");
  await expect(
    page.getByRole("button", { name: "Download family plan" }),
  ).toBeEnabled();
});

async function checkAccessibility(page) {
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    }));
  });
  expect(violations).toEqual([]);
}

test("keyboard demo, accessible forecast, download and profile editing", async ({
  page,
}) => {
  await page.goto("/");
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  await checkAccessibility(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to planner" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator("#demo")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#badge")).toHaveText("FICTIONAL DEMO");
  await expect(
    page.getByText("80 km of solo driving could be replaced weekly"),
  ).toBeVisible();
  await page.getByText("Explore the fictional hourly scenario").click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(25);
  await checkAccessibility(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download family plan" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("airwise-family-plan.md");
  expect(await readFile(await download.path(), "utf8")).toContain(
    "fictional winter-smog scenario",
  );
  await page.getByLabel("One-way journey").fill("2");
  await expect(page.locator("#output")).toBeEmpty();
  await expect(page.locator("#export")).toBeDisabled();
  await page.locator("#demo").click();
  await expect(
    page.getByText("20 km of solo driving could be replaced weekly"),
  ).toBeVisible();
});

test("city search, public forecast, authenticated personalization and failed refresh", async ({
  page,
}) => {
  const city = { name: "Pune, India", latitude: 18.52, longitude: 73.86 };
  const snapshot = { ...demoSnapshot(now), kind: "modelled" };
  await page.route("**/api/locations", (route) =>
    route.fulfill({ json: { locations: [city] } }),
  );
  await page.route("**/api/air", (route) => route.fulfill({ json: snapshot }));
  await page.route("**/api/analyze", (route) => {
    const profile = route.request().postDataJSON();
    return route.fulfill({
      json: buildPlan(profile, snapshot, ["community"], true),
    });
  });
  await page.goto("/");
  await page.getByLabel("Find your city").fill("Pune");
  await page.getByLabel("Find your city").press("Enter");
  await expect(
    page.getByLabel("Choose a city").locator("option:checked"),
  ).toHaveText(city.name);
  await page
    .getByLabel("What should your plan prioritize?")
    .fill("No-cost school pickup");
  const airRequest = page.waitForRequest("**/api/air");
  await page.locator("#guidance").click();
  const air = await airRequest;
  expect(air.postDataJSON()).toEqual({
    latitude: city.latitude,
    longitude: city.longitude,
  });
  expect(air.headers().authorization).toBeUndefined();
  await expect(page.locator("#badge")).toHaveText("LIVE DATA · GUIDANCE");
  await page.getByText("AI personalization access").click();
  await page.getByLabel("App access token").fill("browser-fixture");
  const modelRequest = page.waitForRequest("**/api/analyze");
  await page.locator("#ai").click();
  const model = await modelRequest;
  expect(model.headers().authorization).toBe("Bearer browser-fixture");
  expect(model.postDataJSON().goal).toBe("No-cost school pickup");
  await expect(page.locator("#badge")).toHaveText("LIVE DATA · GEMINI");
  await expect(page.locator("#output article").first()).toContainText(
    "Move strenuous activity indoors",
  );
  await page.route("**/api/air", (route) =>
    route.fulfill({ status: 502, json: { error: "Forecast unavailable" } }),
  );
  await page.locator("#guidance").click();
  await expect(page.locator("#status")).toHaveText("Forecast unavailable");
  await expect(page.locator("#output")).toBeEmpty();
  await expect(page.locator("#export")).toBeDisabled();
});
