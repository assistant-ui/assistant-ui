import type { BlockNode, InlineNode, TableCellNode } from "./ast";

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

const INCOMPLETE_LINK = /(!?)\[([^\]]*)\]\([^)]*$/;

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

const plainText = (nodes: InlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "codeSpan":
        case "mathInline":
        case "htmlInline":
          return node.value;
        case "image":
          return node.alt;
        case "softBreak":
        case "hardBreak":
          return "\n";
        default:
          return plainText(node.children);
      }
    })
    .join("");

type Opener = { index: number; run: string; wrappers: Wrapper[] | "code" };

// The parser already paired every delimiter it could, so a flanking run left in
// a text node opens something the stream has not closed yet.
const findOpener = (value: string): Opener | undefined => {
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === "`") {
      let end = index;
      while (value[end] === "`") end++;
      return { index, run: value.slice(index, end), wrappers: "code" };
    }
    const opener = OPENERS.find(([run]) => value.startsWith(run, index));
    if (!opener) continue;
    const [run, wrappers] = opener;
    const next = value[index + run.length];
    const previous = value[index - 1];
    if (next !== undefined && isSpace(next)) {
      index += run.length - 1;
      continue;
    }
    if (run.startsWith("_") && isWordChar(previous)) {
      index += run.length - 1;
      continue;
    }
    return { index, run, wrappers };
  }
  return undefined;
};

const wrap = (wrappers: Wrapper[], children: InlineNode[]): InlineNode[] =>
  wrappers.reduceRight<InlineNode[]>(
    (inner, type) => [{ type, children: inner }],
    children,
  );

/** Closes the constructs left open at the end of a streaming inline run. */
export const closeOpenInlines = (nodes: InlineNode[]): InlineNode[] => {
  // An unfinished destination may already have become an autolink node, so the
  // label is searched for in the last text node before it.
  for (let position = nodes.length - 1; position >= 0; position--) {
    const node = nodes[position]!;
    if (node.type !== "text") continue;
    const link = INCOMPLETE_LINK.exec(node.value);
    const destination = plainText(nodes.slice(position + 1));
    if (!link || /[\s)]/.test(destination)) break;
    const before = node.value.slice(0, link.index);
    const label = link[1] ? [] : closeOpenInlines(text(link[2] ?? ""));
    return closeOpenInlines(
      mergeText([...nodes.slice(0, position), ...text(before), ...label]),
    );
  }

  for (let position = 0; position < nodes.length; position++) {
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
    return [...head, ...wrap(opener.wrappers, closeOpenInlines(rest))];
  }
  return nodes;
};

const closeCell = (cell: TableCellNode): TableCellNode => ({
  ...cell,
  children: closeOpenInlines(cell.children),
});

/** Returns the block with the inline run at its end closed, or the block itself when nothing there is open. */
export const closeOpenBlock = (block: BlockNode): BlockNode => {
  switch (block.type) {
    case "paragraph":
    case "heading": {
      const children = closeOpenInlines(block.children);
      return children === block.children ? block : { ...block, children };
    }
    case "blockquote": {
      const last = block.children.at(-1);
      if (!last) return block;
      const closed = closeOpenBlock(last);
      return closed === last
        ? block
        : { ...block, children: [...block.children.slice(0, -1), closed] };
    }
    case "list": {
      const item = block.children.at(-1);
      const last = item?.children.at(-1);
      if (!item || !last) return block;
      const closed = closeOpenBlock(last);
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
      const row = block.children.at(-1);
      const cell = row?.children.at(-1);
      if (!row || !cell) return block;
      const closed = closeCell(cell);
      if (closed.children === cell.children) return block;
      return {
        ...block,
        children: [
          ...block.children.slice(0, -1),
          { ...row, children: [...row.children.slice(0, -1), closed] },
        ],
      };
    }
    default:
      return block;
  }
};
