import { defineConfig, devices } from "@playwright/test";

const DEVICE = {
  chromium: "Desktop Chrome",
  firefox: "Desktop Firefox",
  webkit: "Desktop Safari",
} as const;
type Engine = keyof typeof DEVICE;
const engines = (process.env.RC_ENGINES || "chromium,firefox,webkit")
  .split(",")
  .filter((e): e is Engine => e in DEVICE);
/** "dev": remotes from the Vite dev server. "build": from `vite build` output, served by `vite preview`. */
const mode = process.env.RC_REMOTE === "build" ? "build" : "dev";

/**
 * Headless only. Playwright starts the servers and kills them when the run
 * ends (nothing is left listening).
 */
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"], ["json", { outputFile: `.out/results-${mode}.json` }]],
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  },
  // RC_ENGINES=chromium,firefox,webkit (default: all three).
  projects: engines.map((name) => ({
    name: mode === "dev" ? name : `${name}/build`,
    use: {
      ...devices[DEVICE[name]],
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      headless: true,
      ...(name === "chromium"
        ? {
            // Text in a transparent iframe cannot use LCD (subpixel) anti-aliasing;
            // inline text on an opaque page can. Grayscale everywhere makes the
            // pixel comparison measure layout/theme fidelity, not AA policy.
            // (Documented in SPEC.md §7.7.)
            launchOptions: { args: ["--disable-lcd-text"] },
          }
        : {}),
    },
  })),
  webServer: [
    {
      command: "pnpm exec vite --config vite.host.config.ts",
      url: "http://localhost:5180/",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    mode === "dev"
      ? {
          command: "pnpm exec vite --config vite.remote.config.ts",
          url: "http://127.0.0.1:5181/text/",
          reuseExistingServer: false,
          timeout: 60_000,
        }
      : {
          command:
            "pnpm exec vite build --config vite.remote.config.ts && pnpm exec vite preview --config vite.remote.config.ts",
          url: "http://127.0.0.1:5181/text/",
          reuseExistingServer: false,
          timeout: 300_000,
        },
    // Safe Content Frame test shim (HTTPS on *.rc.localhost:443). Container only.
    ...(process.env.RC_DOCKER
      ? [
          {
            command: "node scf-shim/server.mjs",
            port: 443,
            reuseExistingServer: false,
            timeout: 30_000,
          },
        ]
      : []),
  ],
});
