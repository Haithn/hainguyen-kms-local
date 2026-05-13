import { defineConfig, devices } from "@playwright/test";
import Env from "./env/env.global";
import timeouts from "./utils/helpers/timeouts";

Env.validateConfig();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }]],
  use: {
    baseURL: Env.WEB_URL,
    actionTimeout: timeouts.THIRTY_SECONDS,
    navigationTimeout: timeouts.ONE_MINUTE,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
