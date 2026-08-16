/**
 * The datum a mark identifies. Charts stamp `data-part="mark"`, `data-i`, and
 * `data-series` on every drawn segment; the consumer owns the data arrays
 * those indices point into. `element` is the mark node itself, for measuring
 * or anchoring.
 */
export type MarkDatum = {
  index: number | undefined;
  series: string | undefined;
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
  const mark = target.closest?.('[data-part="mark"]');
  if (!mark) return null;
  const index = mark.getAttribute("data-i");
  return {
    index: index === null ? undefined : Number(index),
    series: mark.getAttribute("data-series") ?? undefined,
    element: mark,
  };
}
