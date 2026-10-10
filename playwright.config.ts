import { defineConfig, devices } from "@playwright/test";

// End-to-end tests of every launch flow against the real app: npm run test:e2e
// Needs .env.local with Clerk dev keys (sign-ups use Clerk's +clerk_test emails) and DEV_FAKE_PAYMENTS=1.
// Starts the local database and `next dev` unless they're already running (or E2E_BASE_URL is set).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1, // one shared dev database and Clerk dev instance
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./tests/global-setup.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // A fake microphone so the voice recorder can be tested.
    launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        { command: "node scripts/dev-db.mjs", port: 54329, reuseExistingServer: true },
        { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
      ],
});
