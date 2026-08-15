/**
 * The atlas identity: drafting-paper ground, ink, hairlines, and a figure-red
 * accent, deliberately apart from the rest of the site. Charts keep their own
 * --dg tokens; --dg-surface is bridged to the plate color so occlusion fills
 * (ridgeline, separators) match the surface they sit on.
 */
export const atlasTokens = [
  "bg-(--da-paper) text-(--da-ink)",
  "[--da-paper:#f4f4f2] [--da-plate:#fbfbfa] [--da-ink:#1a1b1e] [--da-line:#dddcd6] [--da-red:#b23a1a]",
  "dark:[--da-paper:#0d0e10] dark:[--da-plate:#131518] dark:[--da-ink:#e8e9e4] dark:[--da-line:#26272b] dark:[--da-red:#e4633b]",
  "[--font-mono:var(--font-atlas-mono)]",
  "[--dg-surface:var(--da-plate)] [--dg-font:var(--font-mono)]",
  "selection:bg-(--da-red) selection:text-(--da-paper)",
].join(" ");

/** Display face, loaded by the layout as --font-atlas; large sizes only. */
export const serif = "font-[family-name:var(--font-atlas)] font-normal";

/**
 * Editorial label register: chapter eyebrows, figure numbers, section tags.
 * Small caps carry the print voice; mono is reserved for the data world.
 */
export const eyebrow = "text-[10.5px] font-medium tracking-[0.14em] uppercase";

/** Quiet interface register: navigation, crumbs, counts, links. */
export const meta = "text-[12.5px]";

/**
 * Data register, and the only mono on the page: identifiers (slugs, the
 * import line), chart-internal text, and micro-chart readouts.
 */
export const mono =
  "font-[family-name:var(--font-mono)] text-[11.5px] tracking-[0.03em]";

export const gutter = "px-5 sm:px-8 lg:px-12";
