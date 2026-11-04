import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Performance numbers, not pass/fail checks (bounds are loose). Runs only
 * with RC_PERF=1 and writes .out/perf-<project>.json:
 *   RC_PERF=1 RC_REMOTE=build pnpm conformance tests/perf.spec.ts
 * Startup: time from mounting `n` remotes to all ready / all revealed.
 * Chromium also reports main-thread time (CDP Performance metrics) spent
 * while a clock mutates the page next to 50 slots, and host heap per slot.
 */
test.skip(!process.env.RC_PERF, "RC_PERF=1 runs the performance numbers");
test.describe.configure({ mode: "serial" });

async function mount(
  page: Page,
  n: number,
): Promise<{ ready: number; revealed: number }> {
  return page.evaluate(async (n) => {
    window.__events.length = 0;
    const t0 = performance.now();
    window.__case.set({ n });
    let ready = -1;
    for (;;) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now() - t0;
      if (
        ready < 0 &&
        window.__events.filter((e) => e.type === "ready").length >= n
      )
        ready = now;
      if (
        ready >= 0 &&
        document.querySelectorAll("[data-rc-slot][data-rc-revealed]").length >=
          n
      )
        return { ready, revealed: now };
      if (now > 20_000) throw new Error("not ready in 20s");
    }
  }, n);
}

async function unmount(page: Page): Promise<void> {
  await page.evaluate(() => window.__case.set({ n: 0, tick: false }));
  await expect(page.locator("[data-rc-slot]")).toHaveCount(0);
}

const out: Record<string, unknown> = {};

test("startup and position-watch cost", async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  await page.goto("/?case=perf");
  await page.waitForTimeout(500);
  const cold1 = await mount(page, 1);
  await unmount(page);
  const warm1 = await mount(page, 1);
  await unmount(page);
  const warm20 = await mount(page, 20);
  await unmount(page);
  const warm50 = await mount(page, 50);
  out.startupMs = { cold1, warm1, warm20, warm50 };

  if (browserName === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const metrics = async (): Promise<Record<string, number>> =>
      Object.fromEntries(
        (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
          m.name,
          m.value,
        ]),
      );
    /** Main-thread ms per second over `ms`, by kind. */
    const busy = async (ms: number): Promise<Record<string, number>> => {
      const a = await metrics();
      await page.waitForTimeout(ms);
      const b = await metrics();
      // Metrics are cumulative seconds.
      const per = (k: string): number =>
        Math.round((((b[k] ?? 0) - (a[k] ?? 0)) * 1000 * 1000) / ms);
      return {
        task: per("TaskDuration"),
        script: per("ScriptDuration"),
        layout: per("LayoutDuration"),
        style: per("RecalcStyleDuration"),
      };
    };
    // Calibration: 20ms of script every 100ms is 200ms/s.
    await page.evaluate(() => {
      const t = setInterval(() => {
        const end = performance.now() + 20;
        while (performance.now() < end);
      }, 100);
      setTimeout(() => clearInterval(t), 3200);
    });
    out.calibration200 = await busy(3000);
    out.oopifs = (await cdp.send("Target.getTargets")).targetInfos.filter(
      (t) => t.type === "iframe",
    ).length;
    await page.waitForTimeout(1000);
    const idle50 = await busy(3000);
    await page.evaluate(() => window.__case.set({ tick: true }));
    await page.waitForTimeout(500);
    const tick50 = await busy(3000);
    await unmount(page);
    await page.evaluate(() => window.__case.set({ tick: true }));
    await page.waitForTimeout(500);
    const tick0 = await busy(3000);
    await unmount(page);
    out.mainThreadMsPerSecond = { idle50, tick50, tick0 };

    await cdp.send("HeapProfiler.enable");
    const heap = async (): Promise<number> => {
      await cdp.send("HeapProfiler.collectGarbage");
      return (await cdp.send("Runtime.getHeapUsage")).usedSize;
    };
    const h0 = await heap();
    await mount(page, 50);
    const h50 = await heap();
    out.hostHeapKBPerSlot = Math.round((h50 - h0) / 50 / 102.4) / 10;
  }
  console.log(`PERF ${info.project.name} ${JSON.stringify(out)}`);
  mkdirSync(".out", { recursive: true });
  writeFileSync(
    `.out/perf-${info.project.name.replace("/", "-")}.json`,
    JSON.stringify(out, null, 2),
  );
  expect(
    (out.startupMs as { warm1: { revealed: number } }).warm1.revealed,
  ).toBeLessThan(10_000);
});
