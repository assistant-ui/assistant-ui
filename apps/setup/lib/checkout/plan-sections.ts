export type PlanFact = { label: string; value: string };

/** A list entry: its first line, and the whole block with any indented continuation. */
export type PlanItem = { text: string; markdown: string };

export type PlanSection = {
  heading: string;
  /** The section body without its heading. */
  markdown: string;
  /** `- **Label:** value` bullets. */
  facts: PlanFact[];
  /** Every other bullet or numbered entry. */
  items: PlanItem[];
  /** Whatever is neither a fact nor an item. */
  rest: string;
};

export type PlanSectionKind = "found" | "install" | "steps" | "questions";

export type ParsedPlan = Partial<Record<PlanSectionKind, PlanSection>> & {
  /** The preamble and every section under a heading that is none of the four, in order. */
  other: string;
};

const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const FACT = /^\s*[-*+]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/;
const CONTINUATION = /^\s+\S/;

const kindOf = (heading: string): PlanSectionKind | undefined => {
  if (/\bfound\b/i.test(heading)) return "found";
  if (/\binstall\b/i.test(heading)) return "install";
  if (/\bsteps?\b/i.test(heading)) return "steps";
  if (/\bquestions?\b/i.test(heading)) return "questions";
  return undefined;
};

const sectionOf = (heading: string, lines: string[]): PlanSection => {
  const facts: PlanFact[] = [];
  const items: PlanItem[] = [];
  const rest: string[] = [];
  let open: PlanItem | undefined;
  for (const line of lines) {
    const fact = FACT.exec(line);
    if (fact) {
      open = undefined;
      const label = fact[1]!.replace(/:$/, "").trim();
      facts.push({ label, value: fact[2]!.trim() });
      continue;
    }
    if (MARKER.test(line) && !CONTINUATION.test(line)) {
      open = { text: line.replace(MARKER, "").trim(), markdown: line };
      items.push(open);
      continue;
    }
    if (open && (CONTINUATION.test(line) || line.trim() === "")) {
      open.markdown += `\n${line}`;
      continue;
    }
    open = undefined;
    rest.push(line);
  }
  for (const item of items) item.markdown = item.markdown.trimEnd();
  return {
    heading,
    markdown: lines.join("\n").trim(),
    facts,
    items,
    rest: rest.join("\n").trim(),
  };
};

/** Splits a plan into the sections the agent is asked to write; anything else lands in `other`, so nothing is lost. */
export const parsePlan = (markdown: string): ParsedPlan => {
  const plan: ParsedPlan = { other: "" };
  const other: string[] = [];
  let heading: string | undefined;
  let lines: string[] = [];
  let fence = false;
  const flush = () => {
    if (heading === undefined) {
      other.push(...lines);
      return;
    }
    const kind = kindOf(heading);
    if (kind === undefined || plan[kind] !== undefined) {
      other.push(`## ${heading}`, ...lines);
      return;
    }
    plan[kind] = sectionOf(heading, lines);
  };
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const match = fence ? null : HEADING.exec(line);
    if (match) {
      flush();
      heading = match[1]!;
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  plan.other = other.join("\n").trim();
  return plan;
};
