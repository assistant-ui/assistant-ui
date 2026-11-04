import { expect, type Frame, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export const OUT = path.resolve(import.meta.dirname, "../.out");

/** `RC_VARIANT=static` renders every remote as its component in static HTML (no React in the frame). */
export const VARIANT = process.env.RC_VARIANT
  ? `&variant=${process.env.RC_VARIANT}`
  : "";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Waits until `n` remote slots are revealed, fonts are loaded everywhere, and geometry is stable. */
export async function settle(page: Page, n?: number): Promise<void> {
  const count = n ?? (await page.locator("#inline .subject").count());
  await expect(
    page.locator("#remote [data-rc-slot][data-rc-revealed]"),
  ).toHaveCount(count, { timeout: 15_000 });
  // Every slot in every frame (nested remotes, remotes in the inline column) is revealed.
  await expect
    .poll(
      async () => {
        let pending = 0;
        for (const f of page.frames())
          pending += await f
            .evaluate(
              () =>
                document.querySelectorAll(
                  "[data-rc-slot]:not([data-rc-revealed])",
                ).length,
            )
            .catch(() => 0);
        return pending;
      },
      { timeout: 15_000 },
    )
    .toBe(0);
  // Every remote has laid out at its slot's current width and sub-pixel
  // position (a change that keeps the height sends no size report, so host
  // geometry alone can look settled while a remote is a frame behind).
  await expect
    .poll(
      async () => {
        let behind = 0;
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue;
          const el = await f.frameElement().catch(() => null);
          if (el === null) continue;
          const host = await el
            .evaluate((e) => {
              if (!(e as Element).parentElement?.hasAttribute("data-rc-sizer"))
                return null;
              const s = (e as Element).parentElement!.getBoundingClientRect();
              const f = (e as Element).getBoundingClientRect();
              // The remote lays out at the sizer's width, or at the slot's
              // content width when the sizer is wider (SPEC §7.3).
              const slot = (e as Element).parentElement!.parentElement!;
              const cs = getComputedStyle(slot);
              const px = (v: string): number => parseFloat(v) || 0;
              const content =
                slot.getBoundingClientRect().width -
                px(cs.borderLeftWidth) -
                px(cs.borderRightWidth) -
                px(cs.paddingLeft) -
                px(cs.paddingRight);
              return {
                x: s.x - f.x,
                y: s.y - f.y,
                width: content < s.width - 0.5 ? Math.max(0, content) : s.width,
              };
            })
            .catch(() => null);
          if (host === null) continue;
          // <html> is the remote's root (the slot).
          const root = await f
            .evaluate(() =>
              "rc" in window
                ? (document.documentElement
                    .getBoundingClientRect()
                    .toJSON() as { x: number; y: number; width: number })
                : undefined,
            )
            .catch(() => undefined);
          // Same width as the sizer, and placed on the sizer's sub-pixel position inside the frame.
          if (
            root !== undefined &&
            (Math.abs(root.width - host.width) > 0.01 ||
              Math.abs(root.x - host.x) > 0.01 ||
              Math.abs(root.y - host.y) > 0.01)
          )
            behind++;
        }
        return behind;
      },
      { timeout: 15_000 },
    )
    .toBe(0);
  // Remote frames render in their own process: let each produce two frames
  // so the screenshot does not catch a compositor frame from before settling.
  for (const f of page.frames()) {
    if (f !== page.mainFrame())
      await f
        .evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        )
        .catch(() => undefined);
  }
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  for (const f of await remoteFrames(page))
    await f.evaluate(() => document.fonts.ready.then(() => undefined));
  let prev = "";
  for (let i = 0; i < 40; i++) {
    const snap = await page.evaluate(
      () =>
        new Promise<string>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve(
                JSON.stringify(
                  [...document.querySelectorAll(".subject, iframe")].map((e) =>
                    e.getBoundingClientRect().toJSON(),
                  ),
                ),
              ),
            ),
          ),
        ),
    );
    if (snap === prev) return;
    prev = snap;
  }
  throw new Error("Layout did not settle");
}

export async function remoteFrames(page: Page): Promise<Frame[]> {
  const handles = await page
    .locator("#remote .subject iframe")
    .elementHandles();
  const frames: Frame[] = [];
  for (const h of handles) {
    const f = await h.contentFrame();
    if (f !== null) frames.push(f);
  }
  return frames;
}

/** Rects of `.subject` elements relative to their column. */
export async function subjectRects(
  page: Page,
  column: "inline" | "remote",
): Promise<Box[]> {
  return page.evaluate((col) => {
    const c = document.getElementById(col)!.getBoundingClientRect();
    return [...document.querySelectorAll(`#${col} .subject`)].map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x - c.x, y: r.y - c.y, width: r.width, height: r.height };
    });
  }, column);
}

/** Probe rects (data-probe) per subject, relative to the column. */
export async function probeRects(
  page: Page,
  column: "inline" | "remote",
): Promise<Record<string, Box>[]> {
  if (column === "inline") {
    return page.evaluate(() => {
      const c = document.getElementById("inline")!.getBoundingClientRect();
      return [...document.querySelectorAll("#inline .subject")].map((s) => {
        const out: Record<
          string,
          { x: number; y: number; width: number; height: number }
        > = {};
        for (const p of s.querySelectorAll<HTMLElement>("[data-probe]")) {
          const r = p.getBoundingClientRect();
          out[p.dataset.probe!] = {
            x: r.x - c.x,
            y: r.y - c.y,
            width: r.width,
            height: r.height,
          };
        }
        return out;
      });
    });
  }
  const col = await page.evaluate(
    () =>
      document.getElementById("remote")!.getBoundingClientRect().toJSON() as {
        x: number;
        y: number;
      },
  );
  const dpr = await page.evaluate(() => devicePixelRatio);
  const iframes = await page
    .locator("#remote .subject iframe")
    .elementHandles();
  const result: Record<string, Box>[] = [];
  for (const h of iframes) {
    const fr = (await h.evaluate((e) =>
      (e as Element).getBoundingClientRect().toJSON(),
    )) as Box;
    const frame = await h.contentFrame();
    const inner = frame
      ? await frame.evaluate(() => {
          const out: Record<
            string,
            { x: number; y: number; width: number; height: number }
          > = {};
          for (const p of document.querySelectorAll<HTMLElement>(
            "[data-probe]",
          )) {
            const r = p.getBoundingClientRect();
            out[p.dataset.probe!] = {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
            };
          }
          return out;
        })
      : {};
    const mapped: Record<string, Box> = {};
    // The browser paints the frame at its device-pixel-snapped origin.
    const ox = Math.round(fr.x * dpr) / dpr;
    const oy = Math.round(fr.y * dpr) / dpr;
    for (const [k, r] of Object.entries(inner))
      mapped[k] = {
        x: ox + r.x - col.x,
        y: oy + r.y - col.y,
        width: r.width,
        height: r.height,
      };
    result.push(mapped);
  }
  return result;
}

export const TOLERANCE = 0.5;

export function expectBoxesClose(a: Box[], b: Box[], label: string): void {
  expect(b.length, `${label}: count`).toBe(a.length);
  a.forEach((ra, i) => {
    const rb = b[i]!;
    for (const k of ["x", "y", "width", "height"] as const) {
      expect(
        Math.abs(ra[k] - rb[k]),
        `${label}[${i}].${k}: inline ${ra[k]} vs remote ${rb[k]}`,
      ).toBeLessThanOrEqual(TOLERANCE);
    }
  });
}

export async function compareGeometry(page: Page): Promise<void> {
  expectBoxesClose(
    await subjectRects(page, "inline"),
    await subjectRects(page, "remote"),
    "subject",
  );
  const pi = await probeRects(page, "inline");
  const pr = await probeRects(page, "remote");
  expect(pr.length).toBe(pi.length);
  pi.forEach((probes, i) => {
    for (const [name, box] of Object.entries(probes)) {
      const other = pr[i]?.[name];
      expect(other, `probe ${name} missing in remote ${i}`).toBeDefined();
      expectBoxesClose([box], [other!], `probe ${i}.${name}`);
    }
  });
}

/**
 * Screenshots both columns (same size, integer offsets) and pixel-diffs
 * them. Returns the number of differing pixels; writes a diff PNG.
 */
export async function comparePixels(
  page: Page,
  name: string,
  maxDiffPixels = 0,
): Promise<number> {
  const h = await page.evaluate(() => {
    const cols = ["inline", "remote"].map((id) => document.getElementById(id)!);
    let bottom = 0;
    for (const c of cols)
      for (const el of c.querySelectorAll("*"))
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    return Math.ceil(Math.min(bottom, window.innerHeight) - 40) + 8;
  });
  const shot = async (x: number) =>
    PNG.sync.read(
      await page.screenshot({
        clip: { x, y: 40, width: 600, height: Math.max(h, 1) },
        animations: "disabled",
        caret: "hide",
      }),
    );
  const a = await shot(20);
  const b = await shot(660);
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
  });
  mkdirSync(path.join(OUT, "diffs"), { recursive: true });
  if (n > 0)
    writeFileSync(path.join(OUT, "diffs", `${name}.png`), PNG.sync.write(diff));
  expect(
    n,
    `${name}: ${n} pixels differ (see .out/diffs/${name}.png)`,
  ).toBeLessThanOrEqual(maxDiffPixels);
  return n;
}
