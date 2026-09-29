import { excerptAround, tokenize } from "./query";
import type { SearchHit } from "./types";

const SKIP_CLOSEST =
  "nav, aside, footer, button, [role='dialog'], [role='menu'], [data-search-ignore], .not-prose, pre, code";

function normalizeText(value: string | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function pageRoot(): Element | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector("[data-page-content]") ??
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body
  );
}

function isSkipped(element: Element): boolean {
  return element.closest(SKIP_CLOSEST) !== null;
}

function headingAnchor(element: Element): string {
  const scoped = element.closest("h1, h2, h3, h4, [id]");
  if (scoped instanceof HTMLElement && scoped.id) return scoped.id;

  let current: Element | null = element;
  while (current) {
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.matches("h1, h2, h3, h4") && sibling.id) return sibling.id;
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
  }

  return "";
}

export function collectPageEntries(
  pathname: string,
): Omit<SearchHit, "score">[] {
  const root = pageRoot();
  if (!root) return [];

  const entries: Omit<SearchHit, "score">[] = [];
  const seen = new Set<string>();

  const push = (entry: Omit<SearchHit, "score">) => {
    if (seen.has(entry.id) || seen.has(entry.content)) return;
    seen.add(entry.id);
    seen.add(entry.content);
    entries.push(entry);
  };

  for (const heading of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4")) {
    if (isSkipped(heading)) continue;
    const content = normalizeText(heading.textContent);
    if (!content || /^[$#>]/.test(content)) continue;
    const hash = heading.id ? `#${heading.id}` : "";
    push({
      id: hash ? `${pathname}${hash}` : `heading:${content}`,
      url: `${pathname}${hash}`,
      content,
      type: "heading",
      element: heading,
    });
  }

  return entries;
}

export function collectPageTextMatches(
  pathname: string,
  query: string,
): Omit<SearchHit, "score">[] {
  const root = pageRoot();
  const tokens = tokenize(query);
  if (!root || tokens.length === 0) return [];

  const entries: Omit<SearchHit, "score">[] = [];
  const seen = new Set<string>();

  for (const element of root.querySelectorAll<HTMLElement>("p, li, td, th")) {
    if (isSkipped(element)) continue;
    if (element.closest("h1, h2, h3, h4")) continue;
    const content = normalizeText(element.textContent);
    if (content.length < 12 || content.length > 400) continue;
    const hay = content.toLowerCase();
    if (!tokens.every((token) => hay.includes(token))) continue;

    const hash = headingAnchor(element);
    const url = hash ? `${pathname}#${hash}` : pathname;
    const excerpt = excerptAround(content, tokens);
    if (seen.has(excerpt)) continue;
    seen.add(excerpt);
    entries.push({
      id: `text:${url}:${excerpt}`,
      url,
      content: excerpt,
      type: "text",
      element,
    });
    if (entries.length >= 8) break;
  }

  return entries;
}
