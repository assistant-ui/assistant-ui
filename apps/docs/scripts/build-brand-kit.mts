import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { zipSync } from "fflate";
import sharp from "sharp";

const publicRoot = new URL("../public/", import.meta.url);

export async function buildBrandKit() {
  const mark = await readFile(new URL("favicon/icon.svg", publicRoot), "utf8");
  const logotype = await readFile(
    new URL("brand/logotype.svg", publicRoot),
    "utf8",
  );
  const files: Record<string, Uint8Array> = {};

  for (const [name, source, height] of [
    ["logo", mark, 512],
    ["logo+name", logotype, 86],
  ] as const) {
    for (const color of ["black", "white"] as const) {
      const svg = source.replace(
        /fill="(?:currentColor|black)"/g,
        `fill="${color}"`,
      );
      files[`${name} ${color}.svg`] = Buffer.from(svg);
      files[`${name} ${color}.png`] = await sharp(Buffer.from(svg), {
        density: name === "logo" ? 1536 : 384,
      })
        .resize(512, height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }
  }

  return zipSync(files, { level: 9, mtime: new Date(2024, 0, 1) });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await writeFile(
    new URL("assistant-ui-brand.zip", publicRoot),
    await buildBrandKit(),
  );
}
