export type DiffLineType = "add" | "del" | "normal";

export interface ParsedLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ParsedFile {
  oldName?: string | undefined;
  newName?: string | undefined;
  lines: ParsedLine[];
  additions: number;
  deletions: number;
}

export interface FoldedRegion {
  type: "fold";
  hiddenCount: number;
}

export type DisplayLine = ParsedLine | FoldedRegion;

export interface DiffFileInput {
  content: string;
  name?: string | undefined;
}
