import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * CHANGES.md, read into the /changes page. Each "## Title (YYYY-MM-DD)"
 * section is a change: its paragraphs and bullets are the summary, the list
 * after "Files:" names the files, and the paragraph starting "When folding
 * back:" says what to do in apps/docs. The "## To do" section is the plan.
 */

export type ChangeFile = { path: string; note: string };

export type Change = {
  title: string;
  date: string;
  summary: (
    | { kind: "paragraph"; text: string }
    | { kind: "list"; items: string[] }
  )[];
  files: ChangeFile[];
  foldBack: string | null;
};

export type ChangeLog = { intro: string[]; todo: string[]; changes: Change[] };

const FOLD_BACK = "When folding back:";

const blocks = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

const listItems = (block: string) =>
  block
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);

const isList = (block: string) => block.startsWith("- ");

/** A file bullet: "`path` (note): description" becomes its path and the rest. */
const fileEntry = (item: string): ChangeFile => {
  const match = /^`([^`]+)`\s*(.*)$/.exec(item);
  if (!match) return { path: item, note: "" };
  return { path: match[1]!, note: match[2]!.replace(/^:\s*/, "") };
};

export function readChangeLog(): ChangeLog {
  const source = readFileSync(join(process.cwd(), "CHANGES.md"), "utf8");
  const [head = "", ...sections] = source.split(/^## /m);
  const intro = blocks(head.replace(/^# .*$/m, ""));
  let todo: string[] = [];
  const changes: Change[] = [];

  for (const section of sections) {
    const newline = section.indexOf("\n");
    const heading = section.slice(0, newline).trim();
    const body = blocks(section.slice(newline + 1));

    if (heading.toLowerCase() === "to do") {
      todo = body.filter(isList).flatMap(listItems);
      continue;
    }

    const match = /^(.*)\s+\((\d{4}-\d{2}-\d{2})\)$/.exec(heading);
    const change: Change = {
      title: match ? match[1]! : heading,
      date: match ? match[2]! : "",
      summary: [],
      files: [],
      foldBack: null,
    };
    let inFiles = false;
    for (const block of body) {
      if (block === "Files:") {
        inFiles = true;
      } else if (block.startsWith(FOLD_BACK)) {
        change.foldBack = block.slice(FOLD_BACK.length).trim();
        inFiles = false;
      } else if (inFiles && isList(block)) {
        change.files.push(...listItems(block).map(fileEntry));
      } else if (isList(block)) {
        change.summary.push({ kind: "list", items: listItems(block) });
      } else {
        change.summary.push({ kind: "paragraph", text: block });
      }
    }
    changes.push(change);
  }

  return { intro, todo, changes: changes.reverse() };
}
