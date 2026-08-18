import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_FONT_SANS = "Inter";
export const OG_FONT_MONO = "IBM Plex Mono";

export async function loadOgFonts() {
  const [sansSemiBold, sansRegular, sansMedium, monoRegular] =
    await Promise.all([
      readFile(join(process.cwd(), "assets/Inter-SemiBold.ttf")),
      readFile(join(process.cwd(), "assets/Inter-Regular.ttf")),
      readFile(join(process.cwd(), "assets/Inter-Medium.ttf")),
      readFile(join(process.cwd(), "assets/IBMPlexMono-Regular.ttf")),
    ]);

  return [
    {
      name: OG_FONT_SANS,
      data: sansSemiBold,
      style: "normal" as const,
      weight: 600 as const,
    },
    {
      name: OG_FONT_SANS,
      data: sansRegular,
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: OG_FONT_SANS,
      data: sansMedium,
      style: "normal" as const,
      weight: 500 as const,
    },
    {
      name: OG_FONT_MONO,
      data: monoRegular,
      style: "normal" as const,
      weight: 400 as const,
    },
  ];
}
