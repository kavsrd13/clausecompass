import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4186";
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./node_modules/.cache/airwise-browser-results",
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  use: { baseURL, channel: process.env.AIRWISE_BROWSER_CHANNEL },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    {
      name: "phone",
      use: {
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node scripts/dev.mjs",
    url: baseURL,
    env: { PORT: "4186" },
    reuseExistingServer: false,
  },
});
