import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "pnpm dev --port 3010",
    url: "http://127.0.0.1:3010/internal/component-lab",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
