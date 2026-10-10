/**
 * A query addressing marks by the same keys they are stamped with. Fields
 * combine with AND; an empty query matches nothing. Highlighting is
 * presentation state, not data, so it never appears as a chart prop — the
 * `Root` wrapper applies it to the rendered marks.
 */
export type MarkQuery = {
  series?: string;
  series2?: string;
  index?: number;
  index2?: number;
};

const SLOTS = [
  ["series", "data-series"],
  ["series2", "data-series2"],
  ["index", "data-i"],
  ["index2", "data-i2"],
] as const;

function matches(mark: Element, query: MarkQuery): boolean {
  if (SLOTS.every(([key]) => query[key] === undefined)) return false;
  for (const [key, attr] of SLOTS) {
    const wanted = query[key];
    if (wanted === undefined) continue;
    const actual = mark.getAttribute(attr);
    if (typeof wanted === "number") {
      if (actual === null || Number(actual) !== wanted) return false;
    } else if (actual !== wanted) {
      return false;
    }
  }
  return true;
}

/**
 * Applies a highlight to every mark inside `container`: matching marks get
 * `data-dg-active`, the rest get `data-dg-muted`, and a null highlight clears
 * both. The attributes are the whole contract — the optional stylesheet ships
 * a default fade for muted marks, and consumers restyle either state with
 * their own CSS.
 */
export function applyHighlight(
  container: Element,
  highlight: MarkQuery | readonly MarkQuery[] | null,
): void {
  const queries =
    highlight === null
      ? []
      : Array.isArray(highlight)
        ? highlight
        : [highlight];
  for (const mark of container.querySelectorAll(
    '[data-part="mark"], [data-part="region"]',
  )) {
    if (queries.length === 0) {
      mark.removeAttribute("data-dg-active");
      mark.removeAttribute("data-dg-muted");
    } else if (queries.some((query) => matches(mark, query))) {
      mark.setAttribute("data-dg-active", "");
      mark.removeAttribute("data-dg-muted");
    } else {
      mark.setAttribute("data-dg-muted", "");
      mark.removeAttribute("data-dg-active");
    }
  }
}
