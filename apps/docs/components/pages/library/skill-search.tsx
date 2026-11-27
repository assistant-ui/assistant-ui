"use client";

export const SKILL_SEARCH_MIN = 2;

export type SkillSearchHit = {
  file: string;
  /** The section the line sits under, when it has one. */
  heading: string;
  before: string;
  match: string;
  after: string;
  /** Letters and digits around the match, for finding the same place in the rendered file. */
  context: string;
};

export type SkillSearchGroup = {
  file: string;
  hits: readonly SkillSearchHit[];
};

const SNIPPET_BEFORE = 48;
const SNIPPET_AFTER = 96;
const CONTEXT = 24;

const lettersOf = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** A markdown line as it reads once rendered: no list marker, link target, or emphasis marks. */
const rendered = (line: string) =>
  line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^([-*+]|\d+\.)\s+/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Every line of every file that shows the query, grouped by file in the files' own order. */
export const searchSkillFiles = (
  files: readonly { name: string; text: string }[],
  query: string,
): SkillSearchGroup[] => {
  const needle = query.trim().toLowerCase();
  if (needle.length < SKILL_SEARCH_MIN) return [];

  return files.flatMap(({ name, text }) => {
    const hits: SkillSearchHit[] = [];
    let heading = "";
    let fenced = false;

    for (const line of text.split("\n")) {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        continue;
      }
      const shown = fenced ? line.trim() : rendered(line);
      if (!fenced && /^#{1,6}\s/.test(line.trim())) heading = shown;

      const at = shown.toLowerCase().indexOf(needle);
      if (at === -1) continue;

      const start = Math.max(0, at - SNIPPET_BEFORE);
      const end = Math.min(shown.length, at + needle.length + SNIPPET_AFTER);
      hits.push({
        file: name,
        heading: heading === shown ? "" : heading,
        before: (start > 0 ? "…" : "") + shown.slice(start, at),
        match: shown.slice(at, at + needle.length),
        after:
          shown.slice(at + needle.length, end) +
          (end < shown.length ? "…" : ""),
        context: lettersOf(
          shown.slice(Math.max(0, at - CONTEXT), at + needle.length + CONTEXT),
        ),
      });
    }
    return hits.length > 0 ? [{ file: name, hits }] : [];
  });
};

const HIGHLIGHT = "skill-search";
const HIGHLIGHT_CURRENT = "skill-search-current";
const MAX_HIGHLIGHTS = 400;

/** The page-wide rules for the two highlights; rendered once by the dialog. */
export const SKILL_SEARCH_STYLES = `::highlight(${HIGHLIGHT}){background-color:color-mix(in oklab,var(--foreground) 14%,transparent)}::highlight(${HIGHLIGHT_CURRENT}){background-color:color-mix(in oklab,var(--color-blue-500) 40%,transparent)}`;

export const clearSkillHighlights = () => {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  CSS.highlights.delete(HIGHLIGHT);
  CSS.highlights.delete(HIGHLIGHT_CURRENT);
};

/**
 * Highlights every place `root` shows the query. With `context`, the match it
 * describes becomes the current one and is returned so the caller can scroll
 * to it. Returns `undefined` while `root` has no text to search yet.
 */
export const highlightSkillMatches = (
  root: HTMLElement,
  query: string,
  context?: string,
): Range | null | undefined => {
  const needle = query.trim().toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node: node as Text, start: text.length });
    text += (node.nodeValue ?? "").replace(/\s/g, " ");
  }
  if (!text.trim()) return undefined;
  clearSkillHighlights();
  if (needle.length < SKILL_SEARCH_MIN) return null;

  const pointAt = (offset: number) => {
    let low = 0;
    let high = nodes.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (nodes[middle]!.start <= offset) low = middle;
      else high = middle - 1;
    }
    const found = nodes[low]!;
    return [found.node, offset - found.start] as const;
  };

  const haystack = text.toLowerCase();
  const ranges: Range[] = [];
  let current: Range | null = null;
  for (
    let at = haystack.indexOf(needle);
    at !== -1 && ranges.length < MAX_HIGHLIGHTS;
    at = haystack.indexOf(needle, at + needle.length)
  ) {
    const range = document.createRange();
    range.setStart(...pointAt(at));
    const [endNode, endOffset] = pointAt(at + needle.length - 1);
    range.setEnd(endNode, endOffset + 1);
    ranges.push(range);
    if (
      !current &&
      context &&
      lettersOf(
        text.slice(Math.max(0, at - 80), at + needle.length + 80),
      ).includes(context)
    ) {
      current = range;
    }
  }
  if (context && !current) current = ranges[0] ?? null;

  if ("highlights" in CSS) {
    CSS.highlights.set(
      HIGHLIGHT,
      new Highlight(...ranges.filter((range) => range !== current)),
    );
    if (current) CSS.highlights.set(HIGHLIGHT_CURRENT, new Highlight(current));
  }
  return current;
};

const MAX_SHOWN = 12;

/** The search tab: each file with a match, and the lines that matched; a line opens its file at that place. */
export function SkillSearchResults({
  query,
  groups,
  loading,
  onOpen,
}: {
  query: string;
  groups: readonly SkillSearchGroup[];
  loading: boolean;
  onOpen: (hit: SkillSearchHit) => void;
}) {
  const needle = query.trim();

  if (needle.length < SKILL_SEARCH_MIN) {
    return (
      <p className="text-muted-foreground text-sm">
        Type {SKILL_SEARCH_MIN} or more letters to search every file of this
        skill.
      </p>
    );
  }
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading the files"
        className="flex animate-pulse flex-col gap-3 motion-reduce:animate-none"
      >
        {["w-1/4", "w-full", "w-5/6", "w-1/3", "w-full"].map((width, index) => (
          <span
            key={index}
            className={`bg-foreground/[0.06] h-3.5 rounded-sm ${width}`}
          />
        ))}
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No file mentions “{needle}”.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section
          key={group.file}
          aria-label={group.file}
          className="flex flex-col gap-1"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-mono text-[13px] [font-variant-ligatures:none]">
              {group.file}
            </h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {group.hits.length}
            </span>
          </div>
          <ul className="flex flex-col">
            {group.hits.slice(0, MAX_SHOWN).map((hit, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onOpen(hit)}
                  className="hover:bg-foreground/[0.04] focus-visible:ring-ring -mx-2 flex w-[calc(100%+1rem)] cursor-pointer flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  {hit.heading ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {hit.heading}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground line-clamp-2 text-sm break-words">
                    {hit.before}
                    <mark className="text-foreground bg-foreground/[0.14] rounded-xs font-medium">
                      {hit.match}
                    </mark>
                    {hit.after}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {group.hits.length > MAX_SHOWN ? (
            <p className="text-muted-foreground text-xs">
              {group.hits.length - MAX_SHOWN} more in this file. Open one above
              to see them all highlighted.
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
