import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { JSDOM } from "jsdom";
import { unzipSync, strFromU8 } from "fflate";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildBrandKit } from "./build-brand-kit.mts";

const assetRoot = new URL("../", import.meta.url);
const assets = [
  ["public/favicon/icon.svg", 24, 24],
  ["public/brand/logotype.svg", 150, 25],
  ["app/icon0.svg", 24, 24],
  ["app/icon.svg", 32, 32],
  ["public/favicon/favicon.svg", 24, 24],
  ["public/favicon.preview.svg", 32, 32],
  ["public/favicon.development.svg", 32, 32],
];

describe("brand assets", () => {
  it.each(assets)(
    "%s keeps its geometry in one scalable viewport",
    async (name, width, height) => {
      const source = await readFile(new URL(name, assetRoot), "utf8");
      const document = new JSDOM(source, { contentType: "image/svg+xml" })
        .window.document;
      const svg = document.documentElement;
      expect(svg.getAttribute("viewBox")).toBe(`0 0 ${width} ${height}`);
      expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
      expect(document.querySelectorAll("svg")).toHaveLength(1);
      expect(
        document.querySelector(
          "mask, clipPath, text, image, use, [stroke], [stroke-width]",
        ),
      ).toBeNull();
      expect(document.querySelectorAll("path").length).toBeGreaterThanOrEqual(
        2,
      );
    },
  );

  it("uses the same bubble outlines in the mark, logotype and adaptive favicon", async () => {
    const sources = await Promise.all(
      assets.slice(0, 3).map(async ([name]) => {
        const source = await readFile(new URL(name, assetRoot), "utf8");
        return new JSDOM(source, { contentType: "image/svg+xml" }).window
          .document;
      }),
    );
    const [mark, logotype, favicon] = sources;
    expect(
      Array.from(favicon.querySelectorAll("path"), (path) =>
        path.getAttribute("d"),
      ),
    ).toEqual(
      Array.from(mark.querySelectorAll("path"), (path) =>
        path.getAttribute("d"),
      ),
    );
    const joined = logotype.querySelectorAll("path");
    expect(joined).toHaveLength(3);
    expect(joined[2].getAttribute("d")).toMatch(/^M34 12\.64/);
  });

  it("keeps visible mark bounds proportional at small, large and non-square sizes", async () => {
    const source = await readFile(
      new URL("public/favicon/icon.svg", assetRoot),
      "utf8",
    );
    for (const [width, height] of [
      [16, 16],
      [24, 24],
      [144, 144],
      [512, 512],
      [144, 96],
      [96, 144],
    ]) {
      const sized = source.replace(
        'width="24" height="24"',
        `width="${width}" height="${height}"`,
      );
      const { data, info } = await sharp(Buffer.from(sized))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const bounds = { left: width, top: height, right: 0, bottom: 0 };
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          if (data[(y * info.width + x) * 4 + 3] < 128) continue;
          bounds.left = Math.min(bounds.left, x);
          bounds.top = Math.min(bounds.top, y);
          bounds.right = Math.max(bounds.right, x + 1);
          bounds.bottom = Math.max(bounds.bottom, y + 1);
        }
      const scale = Math.min(width, height) / 24;
      const offsetX = (width - scale * 24) / 2;
      const offsetY = (height - scale * 24) / 2;
      for (const [actual, expected] of [
        [bounds.left, offsetX + 0.5 * scale],
        [bounds.top, offsetY + 0.5 * scale],
        [bounds.right, offsetX + 23.5 * scale],
        [bounds.bottom, offsetY + 23.5 * scale],
      ])
        expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
    }
  });

  it("preserves bubble weight and letter spacing when an editor resizes path coordinates", async () => {
    const source = await readFile(
      new URL("public/brand/logotype.svg", assetRoot),
      "utf8",
    );
    const document = new JSDOM(source, { contentType: "image/svg+xml" }).window
      .document;
    const svg = document.documentElement;
    svg.setAttribute("width", "300");
    svg.setAttribute("height", "50");
    svg.setAttribute("viewBox", "0 0 300 50");
    for (const path of document.querySelectorAll("path")) {
      path.setAttribute(
        "d",
        path
          .getAttribute("d")
          .replace(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi, (value) =>
            String(Number(value) * 2),
          ),
      );
    }
    for (const rect of document.querySelectorAll("rect")) {
      for (const name of ["width", "height"])
        rect.setAttribute(name, String(Number(rect.getAttribute(name)) * 2));
      rect.setAttribute("transform", "translate(0 2)");
    }
    const original = await sharp(Buffer.from(source), { density: 144 })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const resized = await sharp(Buffer.from(svg.outerHTML))
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(resized.length).toBe(original.length);
    const difference =
      original.reduce(
        (sum, pixel, index) => sum + Math.abs(pixel - resized[index]),
        0,
      ) / original.length;
    expect(difference).toBeLessThan(0.01);
  });

  it("ships exactly one current copy of each SVG and matching transparent PNG", async () => {
    const archive = await readFile(
      new URL("public/assistant-ui-brand.zip", assetRoot),
    );
    const rebuilt = unzipSync(await buildBrandKit());
    const files = unzipSync(archive);
    expect(Object.keys(files).sort()).toEqual([
      "logo black.png",
      "logo black.svg",
      "logo white.png",
      "logo white.svg",
      "logo+name black.png",
      "logo+name black.svg",
      "logo+name white.png",
      "logo+name white.svg",
    ]);
    for (const name of ["logo", "logo+name"])
      for (const color of ["black", "white"]) {
        const svg = strFromU8(files[`${name} ${color}.svg`]);
        const canonical = await readFile(
          new URL(
            name === "logo"
              ? "public/favicon/icon.svg"
              : "public/brand/logotype.svg",
            assetRoot,
          ),
          "utf8",
        );
        expect(svg).toBe(
          canonical.replace(
            /fill="(?:currentColor|black)"/g,
            `fill="${color}"`,
          ),
        );
        const pngFile = `${name} ${color}.png`;
        const storedPixels = await sharp(files[pngFile]).raw().toBuffer();
        const rebuiltPixels = await sharp(rebuilt[pngFile]).raw().toBuffer();
        expect(storedPixels.length).toBe(rebuiltPixels.length);
        const difference =
          storedPixels.reduce(
            (sum, pixel, index) => sum + Math.abs(pixel - rebuiltPixels[index]),
            0,
          ) / storedPixels.length;
        expect(difference).toBeLessThan(0.1);
        const png = await sharp(files[pngFile]).metadata();
        expect(png.width).toBe(512);
        expect(png.height).toBe(name === "logo" ? 512 : 86);
        expect(png.hasAlpha).toBe(true);
      }
  });
});
