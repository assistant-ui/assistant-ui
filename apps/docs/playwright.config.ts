import { defineConfig, devices } from "@playwright/test";

const port = 3105;
const host = "localhost";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: `http://${host}:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter @assistant-ui/docs exec next dev -p ${port}`,
    url: `http://${host}:${port}/docs`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
