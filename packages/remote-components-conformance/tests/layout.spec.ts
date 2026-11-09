import { test, type Page } from "@playwright/test";
import { cases } from "../host/cases.js";
import {
  compareGeometry,
  comparePixels,
  remoteFrames,
  settle,
  VARIANT,
} from "./helpers.js";

/** Extra steps for cases that need an interaction before comparing. */
const steps: Record<string, (page: Page) => Promise<void>> = {
  "resize-container": async (page) => {
    await page.evaluate(() => window.__case.set({ width: 190 }));
  },
  dynamic: async (page) => {
    await page.click("#inline [data-probe=add]");
    const [f] = await remoteFrames(page);
    await f!.click("[data-probe=add]");
    await page.mouse.move(0, 0);
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur(),
    );
  },
  "scrollbar-appears": async (page) => {
    await page.evaluate(() => window.__case.set({ long: true }));
  },
  "many-resize": async (page) => {
    // Several widths in quick succession (one per frame), then settle.
    for (const width of [500, 430, 560, 380, 470, 520]) {
      await page.evaluate(
        (w) =>
          new Promise((r) =>
            requestAnimationFrame(() => r(window.__case.set({ width: w }))),
          ),
        width,
      );
    }
    await page.waitForTimeout(Number(process.env.RC_EXTRA_WAIT || 0));
  },
  "container-query": async (page) => {
    await page.evaluate(() => window.__case.set({ width: 360 }));
  },
  "theme-transition": async (page) => {
    await page.evaluate(() => window.__case.set({ dark: true }));
    // Let the 300ms transitions finish in both columns.
    await page.waitForTimeout(600);
  },
  "dark-mode-light": async (page) => {
    await page.evaluate(() => window.__case.set({ light: true }));
  },
};

const compareCases = cases.filter((c) => c.mode === "compare");

for (const c of compareCases) {
  test.describe(c.name, () => {
    test(`geometry`, async ({ page }) => {
      await page.goto(`/?case=${c.name}${VARIANT}`);
      await settle(page);
      await compareGeometry(page);
      const step = steps[c.name];
      if (step) {
        await step(page);
        await settle(page);
        await compareGeometry(page);
      }
    });

    test(`pixels`, async ({ page }) => {
      await page.goto(`/?case=${c.name}${VARIANT}`);
      await settle(page);
      await comparePixels(page, c.name);
      const step = steps[c.name];
      if (step) {
        await step(page);
        await settle(page);
        await comparePixels(page, `${c.name}-after`);
      }
    });
  });
}

test.describe("dark-mode (switch to light)", () => {
  test("pixels", async ({ page }) => {
    await page.goto(`/?case=dark-mode${VARIANT}`);
    await settle(page);
    await steps["dark-mode-light"]!(page);
    await settle(page);
    await page.waitForTimeout(100);
    await comparePixels(page, "dark-mode-light");
  });
});
