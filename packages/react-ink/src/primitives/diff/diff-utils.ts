import { diffLines } from "diff";
import parseDiff from "parse-diff";
import type {
  ParsedLine,
  ParsedFile,
  DisplayLine,
  FoldedRegion,
} from "./types";

export function parsePatch(patch: string): ParsedFile[] {
  const files = parseDiff(patch);
  return files.map((file) => {
    const lines: ParsedLine[] = [];
    let additions = 0;
    let deletions = 0;
    for (const chunk of file.chunks) {
      let oldLine = chunk.oldStart;
      let newLine = chunk.newStart;
      for (const change of chunk.changes) {
        if (change.type === "add") {
          additions++;
          lines.push({
            type: "add",
            content: change.content.slice(1),
            newLineNumber: newLine++,
          });
        } else if (change.type === "del") {
          deletions++;
          lines.push({
            type: "del",
            content: change.content.slice(1),
            oldLineNumber: oldLine++,
          });
        } else {
          lines.push({
            type: "normal",
            content: change.content.slice(1),
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      }
    }
    return {
      oldName: file.from,
      newName: file.to,
      lines,
      additions,
      deletions,
    };
  });
}

export function computeDiff(
  oldContent: string,
  newContent: string,
): { lines: ParsedLine[]; additions: number; deletions: number } {
  const changes = diffLines(oldContent, newContent);
  const lines: ParsedLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    const raw = change.value.replace(/\n$/, "");
    const contentLines = raw.length > 0 ? raw.split("\n") : [];
    for (const content of contentLines) {
      if (change.added) {
        additions++;
        lines.push({ type: "add", content, newLineNumber: newLine++ });
      } else if (change.removed) {
        deletions++;
        lines.push({ type: "del", content, oldLineNumber: oldLine++ });
      } else {
        lines.push({
          type: "normal",
          content,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }
  }
  return { lines, additions, deletions };
}

export function foldContext(
  lines: ParsedLine[],
  contextLines: number,
): DisplayLine[] {
  const ctx = Math.max(0, contextLines);
  const keep = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.type !== "normal") {
      for (
        let j = Math.max(0, i - ctx);
        j <= Math.min(lines.length - 1, i + ctx);
        j++
      ) {
        keep.add(j);
      }
    }
  }

  const result: DisplayLine[] = [];
  let i = 0;
  while (i < lines.length) {
    if (keep.has(i)) {
      result.push(lines[i]!);
      i++;
    } else {
      let hiddenCount = 0;
      while (i < lines.length && !keep.has(i)) {
        hiddenCount++;
        i++;
      }
      result.push({ type: "fold", hiddenCount } satisfies FoldedRegion);
    }
  }

  return result;
}
