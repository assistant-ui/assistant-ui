import { test } from "@playwright/test";
import { compareGeometry, comparePixels, settle, VARIANT } from "./helpers.js";

/** A cross-section of layout cases at fractional and high device pixel ratios. */
/**
 * Known differences, in differing pixels. Chromium, remote served from the
 * `vite build` output: geometry is identical to 1/64 px, but anti-aliased
 * pixels on the top edge of a rounded corner are rasterised differently
 * inside the frame. pixelmatch 8's OKLab metric counts three of them in
 * flex-wrap@2x and one in flex-grow@1.5x, all in the first two pixel rows.
 */
const ALLOWED: Record<string, number> = {
  "flex-wrap@2x": 3,
  "flex-grow@1.5x": 1,
};

const CASES = [
  "auto-height-card",
  "fractional-width",
  "flex-grow",
  "flex-wrap",
  "grid-tracks",
  "custom-font",
  "theme-tokens",
  "rtl",
  "nested",
  "container-query",
];

for (const dpr of [1.5, 2]) {
  test.describe(`dpr ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const name of CASES) {
      test(name, async ({ page }) => {
        await page.goto(`/?case=${name}${VARIANT}`);
        await settle(page);
        await compareGeometry(page);
        await comparePixels(
          page,
          `${name}@${dpr}x`,
          ALLOWED[`${name}@${dpr}x`] ?? 0,
        );
      });
    }
  });
}

test.describe("dpr change (browser zoom)", () => {
  test("slots re-snap to the new device-pixel grid", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "needs CDP device metrics");
    await page.goto(`/?case=fractional-width${VARIANT}`);
    await settle(page);
    const cdp = await page.context().newCDPSession(page);
    for (const deviceScaleFactor of [1.25, 2, 1]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor,
        mobile: false,
      });
      await settle(page);
      await compareGeometry(page);
      await comparePixels(page, `zoom-${deviceScaleFactor}`);
    }
  });
});
