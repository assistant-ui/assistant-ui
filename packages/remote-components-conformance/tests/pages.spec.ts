import { expect, test, type Frame, type Page } from "@playwright/test";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OUT } from "./helpers.js";

/**
 * Arbitrary pages as remote components: 11 edge-case pages (pages/) and 36
 * LLM-written pages (corpus/: no guidance, a page contract, fragments).
 * Each renders in a 480px slot (block, and inside a fit-content box) and
 * must show, settle (no growth) and not clip. Numbers go to .out/pages
 * (summary: node conformance/pages-report.mjs).
 *
 * RC_PAGES=1 runs it (it is slow); RC_PAGES=full adds the comparison
 * baseline with no runtime at all (C).
 */
const R = "http://127.0.0.1:5181";
const ROOT = path.resolve(import.meta.dirname, "..");
const full = process.env.RC_PAGES === "full";

type Layout = "block" | "fit" | "raw" | "scf";
interface Subject {
  name: string;
  src: string;
  layouts: Layout[];
  /** Must show, settle and not clip. */
  strict: boolean;
}
const subjects: Subject[] = [];
for (const dir of ["pages", "corpus"]) {
  for (const f of readdirSync(path.join(ROOT, dir)).filter((f) =>
    f.endsWith(".html"),
  )) {
    subjects.push({
      name: `A/${dir}/${f}`,
      src: `${R}/__html/${dir}/${f}`,
      layouts: ["block", "fit"],
      strict: true,
    });
    if (f.startsWith("page-")) {
      // The tag placed by the author: no doctype added (quirks mode for most).
      subjects.push({
        name: `Aq/${dir}/${f}`,
        src: `${R}/__htmlq/${dir}/${f}`,
        layouts: ["block"],
        strict: true,
      });
      // Safe Content Frame: the host fetches the page and inlines the runtime.
      subjects.push({
        name: `Ascf/${dir}/${f}`,
        src: `${R}/__html/${dir}/${f}`,
        layouts: ["scf"],
        strict: true,
      });
    }
    if (full) {
      subjects.push({
        name: `C/${dir}/${f}`,
        src: `${R}/__raw/${dir}/${f}`,
        layouts: ["raw"],
        strict: false,
      });
    }
  }
}
subjects.push({
  name: "E/app/vite-template",
  src: `${R}/__app/vite-template/`,
  layouts: ["block", "fit"],
  strict: true,
});

/** Content extent inside the frame: lowest/rightmost visible box, not descending into scrollers. */
async function extent(f: Frame) {
  return f.evaluate(() => {
    const html = document.documentElement;
    const top = html.getBoundingClientRect().top;
    const left = html.getBoundingClientRect().left;
    let bottom = 0;
    let right = 0;
    let fixed = 0;
    const walk = (el: Element): void => {
      for (const c of el.children) {
        if (c.tagName === "RC-PROBE") continue;
        const cs = getComputedStyle(c);
        if (
          cs.display === "none" ||
          c.tagName === "SCRIPT" ||
          c.tagName === "STYLE"
        )
          continue;
        if (cs.position === "fixed") {
          fixed++;
          continue;
        }
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && cs.visibility !== "hidden") {
          bottom = Math.max(bottom, r.bottom - top);
          right = Math.max(right, r.right - left);
        }
        if (cs.overflowY === "visible" && cs.overflowX === "visible") walk(c);
      }
    };
    const body = document.body;
    if (body) {
      const cs = getComputedStyle(body);
      // A page that scrolls its own body is not clipped: count the scroller's box.
      if (cs.overflowX === "visible" && cs.overflowY === "visible") walk(body);
      else {
        const r = body.getBoundingClientRect();
        bottom = r.bottom - top;
        right = r.right - left;
      }
    }
    return {
      bottom,
      right,
      fixed,
      htmlH: html.getBoundingClientRect().height,
      quirks: document.compatMode === "BackCompat",
      page: "rc" in window,
    };
  });
}

async function measure(
  page: Page,
  s: Subject,
  layout: Layout,
  project: string,
) {
  const t0 = Date.now();
  await page.goto(
    `/?case=page&layout=${layout}&width=480&src=${encodeURIComponent(s.src)}`,
  );
  const out: Record<string, unknown> = { name: s.name, layout, project };
  if (layout === "raw") {
    await page.waitForTimeout(1500);
    const f = page.frames().find((fr) => fr !== page.mainFrame())!;
    Object.assign(out, {
      revealed: true,
      slotH: 300,
      slotW: 480,
      ...(await extent(f)),
    });
  } else {
    const ok = await page
      .locator("[data-rc-slot][data-rc-revealed]")
      .waitFor({ timeout: 9000 })
      .then(
        () => true,
        () => false,
      );
    out.revealed = ok;
    out.revealMs = Date.now() - t0;
    if (!ok) {
      out.error = await page.evaluate(() =>
        window.__events
          .filter((e) => e.type === "error")
          .map((e) => `${e.code}: ${e.message}`)
          .join(" | "),
      );
      return out;
    }
    const slot = page.locator("[data-rc-slot]");
    await page.waitForTimeout(700);
    const b1 = (await slot.boundingBox())!;
    await page.waitForTimeout(1300);
    const b2m = (await slot.boundingBox())!;
    // A loop keeps changing; a page that changes once (a late fetch result) does not.
    await page.waitForTimeout(1300);
    const b2 = (await slot.boundingBox())!;
    const settledLate = Math.abs(b2.height - b2m.height) < 1;
    const f = page
      .frames()
      .find((fr) => fr !== page.mainFrame() && fr.url() !== "about:blank")!;
    // Content wider than the slot paints past it, as inline, up to the
    // sizer (min-content wide); only what is cut beyond that is clipped.
    const sizer = (await page.locator("[data-rc-sizer]").boundingBox())!;
    Object.assign(out, {
      slotH: b2.height,
      slotW: b2.width,
      visibleW: Math.max(b2.width, sizer.width),
      growth: settledLate ? b2.height - b2m.height : b2.height - b1.height,
      change: b2m.height - b1.height,
      ...(await extent(f)),
    });
  }
  const slotH = out.slotH as number;
  out.clippedY = Math.max(0, (out.bottom as number) - slotH);
  out.wastedY = Math.max(0, slotH - (out.bottom as number));
  out.clippedX = Math.max(
    0,
    (out.right as number) -
      ((out.visibleW as number | undefined) ?? (out.slotW as number)),
  );
  return out;
}

test.describe("pages", () => {
  test.skip(
    !process.env.RC_PAGES || process.env.RC_REMOTE === "build",
    "RC_PAGES=1, dev remotes only",
  );
  for (const s of subjects) {
    for (const layout of s.layouts) {
      test(`${s.name} [${layout}]`, async ({ page }, info) => {
        const r = await measure(page, s, layout, info.project.name);
        const dir = path.join(
          OUT,
          "pages",
          info.project.name.replace("/", "-"),
        );
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          path.join(dir, `${s.name.replace(/[/]/g, "__")}-${layout}.json`),
          JSON.stringify(r),
        );
        if (!s.strict) return;
        expect(r.revealed, String(r.error ?? "")).toBe(true);
        expect(Math.abs(r.growth as number), "slot keeps growing").toBeLessThan(
          1,
        );
        expect(
          r.clippedY as number,
          "content clipped at the bottom",
        ).toBeLessThanOrEqual(1);
        expect(
          r.clippedX as number,
          "content clipped at the side",
        ).toBeLessThanOrEqual(1);
      });
    }
  }
});

/** Streaming: the serving layer writes the page in 48-byte chunks every 25ms. */
test.describe("pages: streaming", () => {
  test.skip(
    !process.env.RC_PAGES || process.env.RC_REMOTE === "build",
    "RC_PAGES=1, dev remotes only",
  );
  for (const f of readdirSync(path.join(ROOT, "corpus")).filter((f) =>
    f.startsWith("page-"),
  )) {
    test(`stream ${f}`, async ({ page }, info) => {
      test.setTimeout(60_000);
      const src = `${R}/__stream/corpus/${f}?chunk=48&ms=25`;
      const t0 = Date.now();
      await page.goto(
        `/?case=page&layout=block&width=480&src=${encodeURIComponent(src)}`,
        { waitUntil: "commit" },
      );
      await page
        .locator("[data-rc-slot][data-rc-revealed]")
        .waitFor({ timeout: 15_000 });
      const firstReveal = Date.now() - t0;
      // Wait for the stream to end, then compare with the same page served whole.
      let last = -1;
      for (let i = 0; i < 100; i++) {
        await page.waitForTimeout(250);
        const h = (await page.locator("[data-rc-slot]").boundingBox())!.height;
        if (h === last && i > 8) break;
        last = h;
      }
      await page.goto(
        `/?case=page&layout=block&width=480&src=${encodeURIComponent(`${R}/__html/corpus/${f}`)}`,
      );
      await page
        .locator("[data-rc-slot][data-rc-revealed]")
        .waitFor({ timeout: 9000 });
      await page.waitForTimeout(800);
      const whole = (await page.locator("[data-rc-slot]").boundingBox())!
        .height;
      const dir = path.join(
        OUT,
        "pages-stream",
        info.project.name.replace("/", "-"),
      );
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, `${f}.json`),
        JSON.stringify({
          name: f,
          project: info.project.name,
          firstReveal,
          streamed: last,
          whole,
        }),
      );
      expect(Math.abs(last - whole)).toBeLessThan(0.5);
    });
  }
});

/** A page with no build step: rc.props, props-changed, theme-changed and function props. */
test.describe("pages: behaviour", () => {
  test("plain script: rc.props, props-changed, theme-changed, function props", async ({
    page,
  }) => {
    await page.goto(
      `/?case=page&layout=block&width=480&src=${encodeURIComponent(`${R}/__html/pages/vanilla-props.html`)}`,
    );
    await page
      .locator("[data-rc-slot][data-rc-revealed]")
      .waitFor({ timeout: 9000 });
    const f = page.frameLocator("iframe");
    await expect(f.locator("#city")).toHaveText("Berlin");
    await expect(f.locator("#note")).toHaveText("Bring a coat");
    await expect(f.locator("#note")).toBeVisible();
    // The first props-changed fires once, after the document is parsed: the page's own listener sees it.
    await expect(f.locator("#count")).toHaveText("1 updates");
    await expect(f.locator("#theme")).not.toHaveText("0 theme changes");
    await f.locator("[data-probe=mon]").click();
    await f.locator("input[name=q]").fill("snow");
    await f.locator("form button").click();
    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__events
            .filter((e) => e.type === "select" || e.type === "submit")
            .map((e) => `${e.type}:${e.message}`),
        ),
      )
      .toEqual(['select:"mon"', 'submit:{"q":"snow"}']);
    // The public surface of window.rc, and nothing on window.
    const surface = await f.locator("html").evaluate(() => {
      const rc = (window as unknown as { rc: EventTarget & { props: object } })
        .rc;
      return {
        eventTarget: rc instanceof EventTarget,
        keys: Object.keys(rc),
        proto: Object.getOwnPropertyNames(Object.getPrototypeOf(rc)).sort(),
        stable: rc.props === rc.props,
      };
    });
    expect(surface).toEqual({
      eventTarget: true,
      keys: [],
      proto: ["constructor", "overlay", "props"],
      stable: true,
    });
  });
});
