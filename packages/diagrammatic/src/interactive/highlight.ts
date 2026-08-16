/**
 * A query addressing marks by the same keys they are stamped with. Fields
 * combine with AND; an empty query matches nothing. Highlighting is
 * presentation state, not data, so it never appears as a chart prop — the
 * `Root` wrapper applies it to the rendered marks.
 */
export type MarkQuery = {
  series?: string;
  index?: number;
};

function matches(mark: Element, query: MarkQuery): boolean {
  if (query.series === undefined && query.index === undefined) return false;
  if (query.series !== undefined) {
    if (mark.getAttribute("data-series") !== query.series) return false;
  }
  if (query.index !== undefined) {
    if (Number(mark.getAttribute("data-i")) !== query.index) return false;
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
