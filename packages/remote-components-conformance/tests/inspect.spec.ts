/**
 * Debug utility (skipped unless INSPECT=<case>[:x,y,w,h]): writes a zoomed
 * side-by-side crop (inline | remote) to .out/inspect-<case>.png and prints
 * every differing pixel's coordinates (column-relative).
 * INSPECT_STATE='{"width":190}' applies window.__case.set(...) first; INSPECT_DPR=2 sets the device pixel ratio.
 *   INSPECT=dynamic:0,0,300,200 pnpm conformance tests/inspect.spec.ts
 */
import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { OUT, settle, VARIANT } from "./helpers.js";

const spec = process.env.INSPECT ?? "";
test.skip(spec === "", "set INSPECT=<case>[:x,y,w,h]");
test.use({ deviceScaleFactor: Number(process.env.INSPECT_DPR || 1) });

test("inspect", async ({ page }) => {
  const [name, region] = spec.split(":");
  const [x, y, w, h] = (region ?? "0,0,600,300").split(",").map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const dpr = Number(process.env.INSPECT_DPR || 1);
  await page.goto(`/?case=${name}${VARIANT}`);
  await settle(page);
  const state = process.env.INSPECT_STATE;
  if (state) {
    if (process.env.INSPECT_PRESHOT)
      await page.screenshot({ animations: "disabled", caret: "hide" });
    await page.evaluate(
      (s) => window.__case.set(JSON.parse(s) as Record<string, unknown>),
      state,
    );
    await settle(page);
  }
  const shot = async (ox: number) =>
    PNG.sync.read(
      await page.screenshot({
        clip: { x: ox + x, y: 40 + y, width: w, height: h },
        animations: "disabled",
        caret: "hide",
      }),
    );
  const a = await shot(20);
  const b = await shot(660);
  const W = a.width;
  const H = a.height;
  const S = Math.max(1, Math.floor(1200 / (W * 2)));
  const out = new PNG({ width: W * S * 2 + 4, height: H * S });
  const diffs: string[] = [];
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4;
      if (
        a.data[i] !== b.data[i] ||
        a.data[i + 1] !== b.data[i + 1] ||
        a.data[i + 2] !== b.data[i + 2]
      )
        diffs.push(`${x + xx / dpr},${y + yy / dpr}`);
      for (const [img, off] of [
        [a, 0],
        [b, W * S + 4],
      ] as const)
        for (let dy = 0; dy < S; dy++)
          for (let dx = 0; dx < S; dx++) {
            const o = ((yy * S + dy) * out.width + off + xx * S + dx) * 4;
            for (let k = 0; k < 4; k++) out.data[o + k] = img.data[i + k]!;
          }
    }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `inspect-${name}.png`), PNG.sync.write(out));
  console.log(`${diffs.length} differing pixels`, diffs.slice(0, 40).join(" "));
});
