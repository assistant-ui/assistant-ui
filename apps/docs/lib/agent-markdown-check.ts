// Finds what a docs page shows a human but loses on its way to the agent
// markdown (`.md`, llms-full.txt, the MCP `read_page` tool): placeholders for
// omitted elements, raw JSX tags, and headings left with nothing under them.

export type AgentMarkdownProblem = {
  url: string;
  kind: "placeholder" | "raw-jsx" | "empty-section";
  detail: string;
};

export type AgentMarkdownPage = { url: string; markdown: string };

const PAGE_START = /^# .*\nURL: (\S+)/gm;

/** Splits llms-full.txt back into its pages. */
export function splitLLMsFull(text: string): AgentMarkdownPage[] {
  const starts = [...text.matchAll(PAGE_START)];
  return starts.map((match, i) => ({
    url: match[1]!,
    markdown: text.slice(match.index, starts[i + 1]?.index ?? text.length),
  }));
}

/** The page with fenced code blocks and inline code spans removed. */
function proseLines(markdown: string): string[] {
  const lines: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker) {
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence === null)
      lines.push(line.replace(/``.*?``/g, "").replace(/`[^`\n]*`/g, ""));
  }
  return lines;
}

const PLACEHOLDER = /\[interactive preview[^\]]*omitted\]/g;
// `<Thread>`, `</Tabs>`, `\<MenuPrimitive.Root`: a capitalized tag is a React
// component that reached the text unrendered.
const RAW_JSX = /\\?<\/?([A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*)*)(?=[\s/>])/g;
const HEADING = /^(#{2,6}) (.*)$/;

export function findAgentMarkdownProblems(
  page: AgentMarkdownPage,
): AgentMarkdownProblem[] {
  const problems: AgentMarkdownProblem[] = [];
  const { url, markdown } = page;

  for (const match of markdown.matchAll(PLACEHOLDER))
    problems.push({ url, kind: "placeholder", detail: match[0] });

  const lines = proseLines(markdown);
  for (const line of lines) {
    for (const match of line.matchAll(RAW_JSX))
      problems.push({ url, kind: "raw-jsx", detail: `<${match[1]}>` });
  }

  // A heading whose section ends before any content: the component that
  // filled it on the page rendered to nothing.
  const fullLines = markdown.split("\n");
  let inFence = false;
  const headings: Array<{ index: number; level: number; text: string }> = [];
  fullLines.forEach((line, index) => {
    if (/^\s*(`{3,}|~{3,})/.test(line)) inFence = !inFence;
    if (inFence) return;
    const heading = line.match(HEADING);
    if (heading)
      headings.push({ index, level: heading[1]!.length, text: heading[2]! });
  });
  headings.forEach((heading, i) => {
    const next = headings[i + 1];
    const end = next?.index ?? fullLines.length;
    const body = fullLines
      .slice(heading.index + 1, end)
      .join("\n")
      .trim();
    if (body) return;
    // A parent heading directly followed by its first child is fine.
    if (next && next.level > heading.level) return;
    problems.push({ url, kind: "empty-section", detail: heading.text });
  });

  return problems;
}

export function summarizeAgentMarkdownProblems(
  problems: AgentMarkdownProblem[],
): string {
  const byKind = new Map<string, { count: number; pages: Set<string> }>();
  for (const problem of problems) {
    const entry = byKind.get(problem.kind) ?? { count: 0, pages: new Set() };
    entry.count++;
    entry.pages.add(problem.url);
    byKind.set(problem.kind, entry);
  }
  return [...byKind]
    .map(
      ([kind, { count, pages }]) =>
        `${kind}: ${count} on ${pages.size} page${pages.size === 1 ? "" : "s"}`,
    )
    .join("\n");
}
