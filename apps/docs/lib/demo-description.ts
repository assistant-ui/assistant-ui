// Kept out of get-llm-text so page components (PreviewCode) can use it without
// pulling the markdown pipeline into their module graph.

/** `TurnAnchorSample` → `Turn anchor sample`. */
function humanizeComponentName(name: string): string {
  const words = name
    .replace(/[._]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/);
  return words
    .map((word, i) =>
      i === 0 || /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase(),
    )
    .join(" ");
}

/**
 * The one line an agent reads in place of a live demo: the demo's own
 * `description` (or `title`) prop when the page gives one, otherwise its
 * component name.
 */
export function describeDemo(
  name: string,
  props: Record<string, unknown> = {},
): string {
  for (const key of ["description", "title", "aria-label"] as const) {
    const value = props[key];
    if (typeof value === "string" && value.trim())
      return `Live demo: ${value.trim().replace(/\.?$/, ".")}`;
  }
  return name
    ? `Live demo: ${humanizeComponentName(name)} (interactive on the web page).`
    : "Live demo (interactive on the web page).";
}
