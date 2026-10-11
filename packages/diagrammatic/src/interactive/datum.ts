/**
 * The datum a mark identifies — an address into the consumer's own data,
 * never the data itself. Charts stamp up to four seams on every drawn mark,
 * and every chart shape resolves to some combination of them:
 *
 * - `index` — the primary ordinal: category, time step, row, or link order.
 * - `index2` — the secondary ordinal of two-dimensional shapes (a grid
 *   cell's row where `index` is its column).
 * - `series` — the identity: series name, node id, or a flow's source.
 * - `series2` — the counterparty identity of edges and flows: the target.
 *
 * A bar is `(index)`, a multi-series point `(series, index)`, a matrix cell
 * `(index, index2)`, a named node `(series)`, a flow ribbon
 * `(index, series, series2)`. `element` is the mark node itself, for
 * measuring, anchoring, or reading rendered style.
 */
export type MarkDatum = {
  index: number | undefined;
  index2: number | undefined;
  series: string | undefined;
  series2: string | undefined;
  element: Element;
};

/**
 * Resolves an event target to the mark it landed on, or null. This is the
 * official decoder for the mark seams and the lowest layer of the action
 * system: `Root` builds its hover and click wiring on it, and a consumer can
 * do the same from any handler — including a plain `onClick` passed straight
 * to a chart — without adopting the wrapper.
 */
export function getMarkDatum(target: EventTarget | null): MarkDatum | null {
  if (!(target instanceof Element)) return null;
  const mark = target.closest?.('[data-part="mark"], [data-part="region"]');
  if (!mark) return null;
  const index = mark.getAttribute("data-i");
  const index2 = mark.getAttribute("data-i2");
  return {
    index: index === null ? undefined : Number(index),
    index2: index2 === null ? undefined : Number(index2),
    series: mark.getAttribute("data-series") ?? undefined,
    series2: mark.getAttribute("data-series2") ?? undefined,
    element: mark,
  };
}

/**
 * Resolves the rendered color of a series from any element inside the same
 * SVG, so tooltip swatches and cross-chart legends can match the live theme
 * without configuration. Reads the first mark stamped with the series,
 * preferring computed fill, then computed stroke, then the raw attributes —
 * transparent hit pads never match because they carry no series.
 */
export function getSeriesColor(
  from: Element,
  series: string,
): string | undefined {
  const svg = from.closest("svg");
  const mark = svg?.querySelector(`[data-series="${CSS.escape(series)}"]`);
  if (!mark) return undefined;
  const computed =
    typeof getComputedStyle === "function" ? getComputedStyle(mark) : null;
  for (const value of [
    computed?.fill,
    computed?.stroke,
    mark.getAttribute("fill"),
    mark.getAttribute("stroke"),
  ]) {
    if (value && value !== "none" && value !== "transparent") return value;
  }
  return undefined;
}
