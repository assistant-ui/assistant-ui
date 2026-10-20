import type { BlockNode, InlineNode, TableCellNode } from "./ast";
import { plainText } from "./plain-text";

type Wrapper = "strong" | "emphasis" | "strikethrough";

const OPENERS: [string, Wrapper[]][] = [
  ["***", ["strong", "emphasis"]],
  ["___", ["strong", "emphasis"]],
  ["**", ["strong"]],
  ["__", ["strong"]],
  ["~~", ["strikethrough"]],
  ["*", ["emphasis"]],
  ["_", ["emphasis"]],
];

// Each opener on the final line nests one wrapper, so a line of unpaired
// openers stops nesting here, as markdown-it bounds its own output.
const MAX_DEPTH = 4;

const isWordChar = (char: string | undefined) =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);
const isSpace = (char: string | undefined) =>
  char === undefined || /\s/.test(char);

const text = (value: string): InlineNode[] =>
  value ? [{ type: "text", value }] : [];

const mergeText = (nodes: InlineNode[]): InlineNode[] =>
  nodes.reduce<InlineNode[]>((merged, node) => {
    const last = merged.at(-1);
    if (last?.type === "text" && node.type === "text") {
      merged[merged.length - 1] = {
        type: "text",
        value: last.value + node.value,
      };
    } else {
      merged.push(node);
    }
    return merged;
  }, []);

type Opener = { index: number; run: string; wrappers: Wrapper[] | "code" };

// A run that a space follows, or that follows a word character (`n*m`,
// `vary*.`), stays literal; a run at the very end may still be an opener.
const canOpen = (previous: string | undefined, next: string | undefined) =>
  next === undefined || (!isSpace(next) && !isWordChar(previous));

// The parser already paired every delimiter it could, so a run left in a text
// node on the final line opens something the stream has not closed yet.
const findOpener = (value: string): Opener | undefined => {
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "`") {
      let end = index;
      while (value[end] === "`") end++;
      if (end === value.length || !isSpace(value[end])) {
        return { index, run: value.slice(index, end), wrappers: "code" };
      }
      index = end - 1;
      continue;
    }
    const opener = OPENERS.find(([run]) => value.startsWith(run, index));
    if (!opener) continue;
    const [run, wrappers] = opener;
    index += run.length - 1;
    if (!canOpen(value[index - run.length], value[index + 1])) continue;
    return { index: index - run.length + 1, run, wrappers };
  }
  return undefined;
};

const wrap = (wrappers: Wrapper[], children: InlineNode[]): InlineNode[] =>
  wrappers.reduceRight<InlineNode[]>(
    (inner, type) => [{ type, children: inner }],
    children,
  );

// A link whose destination is still streaming shows its label; the label may
// span formatted nodes, and the destination may already be an autolink node.
const closeIncompleteLink = (nodes: InlineNode[]): InlineNode[] | undefined => {
  let tail = "";
  for (let position = nodes.length - 1; position >= 0; position--) {
    const node = nodes[position]!;
    if (node.type !== "text") {
      tail = plainText([node]) + tail;
      continue;
    }
    const marker = node.value.lastIndexOf("](");
    const destination =
      (marker === -1 ? node.value : node.value.slice(marker + 2)) + tail;
    if (/[\s)]/.test(destination)) return undefined;
    if (marker === -1) {
      tail = destination;
      continue;
    }

    for (let start = position; start >= 0; start--) {
      const candidate = nodes[start]!;
      if (candidate.type !== "text") continue;
      const end = start === position ? marker : candidate.value.length;
      const open = candidate.value.lastIndexOf("[", end - 1);
      if (open === -1) continue;
      const image = candidate.value[open - 1] === "!";
      const label =
        start === position
          ? text(candidate.value.slice(open + 1, marker))
          : [
              ...text(candidate.value.slice(open + 1)),
              ...nodes.slice(start + 1, position),
              ...text(node.value.slice(0, marker)),
            ];
      return mergeText([
        ...nodes.slice(0, start),
        ...text(candidate.value.slice(0, image ? open - 1 : open)),
        ...(image ? [] : label),
      ]);
    }
    return undefined;
  }
  return undefined;
};

/** Closes the constructs left open at the end of a streaming inline run. */
const closeOpenInlines = (nodes: InlineNode[], depth = 0): InlineNode[] => {
  if (depth >= MAX_DEPTH) return nodes;
  const linked = closeIncompleteLink(nodes);
  if (linked) return closeOpenInlines(linked, depth);

  const lineStart =
    nodes.findLastIndex(
      (node) => node.type === "softBreak" || node.type === "hardBreak",
    ) + 1;
  for (let position = lineStart; position < nodes.length; position++) {
    const node = nodes[position]!;
    if (node.type !== "text") continue;
    const opener = findOpener(node.value);
    if (!opener) continue;

    const before = node.value.slice(0, opener.index);
    const rest = [
      ...text(node.value.slice(opener.index + opener.run.length)),
      ...nodes.slice(position + 1),
    ];
    const head = [...nodes.slice(0, position), ...text(before)];
    if (rest.length === 0) return head;
    if (opener.wrappers === "code") {
      return [...head, { type: "codeSpan", value: plainText(rest) }];
    }
    return [
      ...head,
      ...wrap(opener.wrappers, closeOpenInlines(rest, depth + 1)),
    ];
  }
  return nodes;
};

const closeCell = (cell: TableCellNode): TableCellNode => ({
  ...cell,
  children: closeOpenInlines(cell.children),
});

/** Returns the block with the inline run at its end closed, or the block itself when nothing there is open; a table row whose final line ends in `|` has finished its last cell. */
export const closeOpenBlock = (
  block: BlockNode,
  finalLine: string,
): BlockNode => {
  // A heading and a table row take one line, so a blank final line (or a setext
  // underline) means their text has ended.
  const lineEnded = finalLine.trim() === "" || /^[=-]+$/.test(finalLine.trim());
  switch (block.type) {
    case "paragraph":
    case "heading": {
      if (block.type === "heading" && lineEnded) return block;
      const children = closeOpenInlines(block.children);
      return children === block.children ? block : { ...block, children };
    }
    case "blockquote": {
      const last = block.children.at(-1);
      if (!last) return block;
      const closed = closeOpenBlock(last, finalLine);
      return closed === last
        ? block
        : { ...block, children: [...block.children.slice(0, -1), closed] };
    }
    case "list": {
      const item = block.children.at(-1);
      const last = item?.children.at(-1);
      if (!item || !last) return block;
      const closed = closeOpenBlock(last, finalLine);
      if (closed === last) return block;
      return {
        ...block,
        children: [
          ...block.children.slice(0, -1),
          { ...item, children: [...item.children.slice(0, -1), closed] },
        ],
      };
    }
    case "table": {
      if (lineEnded || finalLine.trimEnd().endsWith("|")) return block;
      const row = block.children.at(-1);
      const cell =
        row?.children.findLast((candidate) => candidate.children.length > 0) ??
        row?.children.at(-1);
      if (!row || !cell) return block;
      const closed = closeCell(cell);
      if (closed.children === cell.children) return block;
      return {
        ...block,
        children: [
          ...block.children.slice(0, -1),
          {
            ...row,
            children: row.children.map((candidate) =>
              candidate === cell ? closed : candidate,
            ),
          },
        ],
      };
    }
    default:
      return block;
  }
};
