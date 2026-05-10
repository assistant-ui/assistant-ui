import { mkdir, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

// X/Twitter recommended image: 16:9 ratio
// Using 1600x900 for high quality
const WIDTH = 1600;
const HEIGHT = 900;

const OUTPUT_DIR = new URL("../dist", import.meta.url).pathname;

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff",
  );
  return res.arrayBuffer();
}

let fontCache: ArrayBuffer | null = null;

export async function renderCard(
  name: string,
  element: React.ReactElement,
): Promise<void> {
  if (!fontCache) {
    fontCache = await loadFont();
  }

  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: "Inter",
        data: fontCache,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  await mkdir(OUTPUT_DIR, { recursive: true });

  const svgPath = `${OUTPUT_DIR}/${name}.svg`;
  const pngPath = `${OUTPUT_DIR}/${name}.png`;

  await writeFile(svgPath, svg);
  await writeFile(pngPath, pngBuffer);

  console.log(`✔ ${name} → ${pngPath}`);
}
