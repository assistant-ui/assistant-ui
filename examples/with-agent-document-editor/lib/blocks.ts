import { $createLinkNode, $isLinkNode } from "@lexical/link";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListNode,
} from "@lexical/list";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { isBlockType, type Block, type BlockType } from "./document-state";

export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
  code?: boolean;
  href?: string;
};

type Marks = Omit<InlineRun, "text" | "code">;

const FLAGS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "highlight",
  "code",
] as const;

// Marks that wrap their text in an opening and a closing tag. Underline and
// highlight have no markdown syntax, so they use the HTML a model already knows.
const WRAPPERS = [
  { open: "~~", close: "~~", mark: "strike" },
  { open: "<u>", close: "</u>", mark: "underline" },
  { open: "<mark>", close: "</mark>", mark: "highlight" },
] as const;

const ESCAPABLE = new Set(["\\", "*", "`", "[", "~", "<"]);
const LINK = /^\[((?:\\.|[^\]\\])+)\]\(([^()\s]+)\)/;

const isSpace = (char: string | undefined) =>
  char === undefined || /\s/.test(char);

const countSingleStars = (source: string) => {
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") i++;
    else if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end !== -1) i = end;
    } else if (char === "*") {
      if (source[i + 1] === "*") i++;
      else count++;
    }
  }
  return count;
};

const findClosing = (source: string, from: number, marker: string) => {
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end !== -1) i = end;
      continue;
    }
    if (char !== "*") continue;
    const closes = i > from && !isSpace(source[i - 1]);

    if (marker === "*") {
      if (closes) return i;
      if (source[i + 1] === "*") {
        const end = source.indexOf("**", i + 2);
        i = end === -1 ? i + 1 : end + 1;
      }
      continue;
    }

    if (!source.startsWith(marker, i)) continue;
    if (!closes) {
      i += marker.length - 1;
      continue;
    }
    const nestedItalicIsOpen =
      marker === "**" &&
      source[i + 2] === "*" &&
      countSingleStars(source.slice(from, i)) % 2 === 1;
    return nestedItalicIsOpen ? i + 1 : i;
  }
  return -1;
};

// The first `marker` at or after `from` that is not part of an escape.
const findUnescaped = (source: string, marker: string, from: number) => {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\" && ESCAPABLE.has(source[i + 1] ?? "")) i++;
    else if (source.startsWith(marker, i)) return i;
  }
  return -1;
};

const pushRun = (runs: InlineRun[], run: InlineRun) => {
  const last = runs[runs.length - 1];
  if (
    last &&
    last.href === run.href &&
    FLAGS.every((flag) => !!last[flag] === !!run[flag])
  ) {
    last.text += run.text;
    return;
  }
  runs.push(run);
};

const parseInto = (source: string, marks: Marks, runs: InlineRun[]) => {
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    pushRun(runs, { ...marks, text: buffer });
    buffer = "";
  };

  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    const next = source[i + 1];

    if (char === "\\" && next !== undefined && ESCAPABLE.has(next)) {
      buffer += next;
      i += 2;
      continue;
    }

    if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        pushRun(runs, {
          ...marks,
          code: true,
          text: source.slice(i + 1, end),
        });
        i = end + 1;
        continue;
      }
    }

    if (char === "[" && !marks.href) {
      const match = LINK.exec(source.slice(i));
      if (match) {
        flush();
        parseInto(match[1]!, { ...marks, href: match[2]! }, runs);
        i += match[0].length;
        continue;
      }
    }

    const wrapper = WRAPPERS.find(
      ({ open, mark }) => !marks[mark] && source.startsWith(open, i),
    );
    if (wrapper) {
      const start = i + wrapper.open.length;
      const end = findUnescaped(source, wrapper.close, start);
      if (end > start) {
        flush();
        parseInto(
          source.slice(start, end),
          { ...marks, [wrapper.mark]: true },
          runs,
        );
        i = end + wrapper.close.length;
        continue;
      }
    }

    if (char === "*") {
      let matched = false;
      for (const marker of ["***", "**", "*"]) {
        if (!source.startsWith(marker, i)) continue;
        const start = i + marker.length;
        if (isSpace(source[start])) continue;
        const end = findClosing(source, start, marker);
        if (end === -1) continue;
        flush();
        parseInto(
          source.slice(start, end),
          {
            ...marks,
            ...(marker !== "*" && { bold: true }),
            ...(marker !== "**" && { italic: true }),
          },
          runs,
        );
        i = end + marker.length;
        matched = true;
        break;
      }
      if (matched) continue;
    }

    buffer += char;
    i++;
  }
  flush();
};

export function parseInline(source: string): InlineRun[] {
  const runs: InlineRun[] = [];
  parseInto(source, {}, runs);
  return runs;
}

const escapeText = (text: string) =>
  text.replace(/[\\*`[]|~(?=~)|<(?=\/?(?:u|mark)>)/g, "\\$&");

const serializeRun = (run: InlineRun) => {
  const [, lead = "", core = "", trail = ""] =
    /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text) ?? [];
  if (!core) return run.text;

  let body = run.code && !core.includes("`") ? `\`${core}\`` : escapeText(core);
  // A tilde right before the closing `~~` would be read as part of it.
  if (run.strike && body.endsWith("~")) body = `${body.slice(0, -1)}\\~`;
  if (run.bold && run.italic) body = `***${body}***`;
  else if (run.bold) body = `**${body}**`;
  else if (run.italic) body = `*${body}*`;
  for (const { open, close, mark } of WRAPPERS) {
    if (run[mark]) body = `${open}${body}${close}`;
  }
  return lead + body + trail;
};

export function serializeInline(runs: readonly InlineRun[]): string {
  let out = "";
  for (let i = 0; i < runs.length;) {
    const href = runs[i]!.href;
    if (!href) {
      out += serializeRun(runs[i]!);
      i++;
      continue;
    }
    let end = i;
    while (end < runs.length && runs[end]!.href === href) end++;
    out += `[${runs.slice(i, end).map(serializeRun).join("")}](${href})`;
    i = end;
  }
  return out;
}

/** The runs between two offsets, counted in characters of plain text. */
export function sliceRuns(
  runs: readonly InlineRun[],
  from: number,
  to = Number.POSITIVE_INFINITY,
): InlineRun[] {
  const sliced: InlineRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const start = Math.max(from - offset, 0);
    const end = Math.min(to - offset, run.text.length);
    if (start < end)
      pushRun(sliced, { ...run, text: run.text.slice(start, end) });
    offset += run.text.length;
    if (offset >= to) break;
  }
  return sliced;
}

export const plainText = (source: string) =>
  parseInline(source)
    .map((run) => run.text)
    .join("");

const PREFIX: Record<BlockType, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  paragraph: "",
  bullet: "- ",
  numbered: "1. ",
  quote: "> ",
  divider: "---",
};

const isListType = (type: BlockType) =>
  type === "bullet" || type === "numbered";

// A list item and a divider cannot turn into another kind of block in place.
const keepsItsNode = (type: BlockType) =>
  isListType(type) || type === "divider";

export const blockToMarkdown = (block: Partial<Block>) =>
  `${PREFIX[block.type ?? "paragraph"]}${block.text ?? ""}`;

type BlockNode =
  | { node: ElementNode; type: Exclude<BlockType, "divider"> }
  | { node: LexicalNode; type: "divider" };

function $collectBlockNodes(): BlockNode[] {
  const found: BlockNode[] = [];

  const visitList = (list: ListNode) => {
    const type = list.getListType() === "number" ? "numbered" : "bullet";
    for (const item of list.getChildren()) {
      if (!$isListItemNode(item)) continue;
      const nested = item.getChildren().filter($isListNode);
      const holdsOnlyLists =
        nested.length > 0 && nested.length === item.getChildrenSize();
      if (!holdsOnlyLists) found.push({ node: item, type });
      nested.forEach(visitList);
    }
  };

  for (const child of $getRoot().getChildren()) {
    if ($isListNode(child)) {
      visitList(child);
    } else if ($isHorizontalRuleNode(child)) {
      found.push({ node: child, type: "divider" });
    } else if ($isHeadingNode(child)) {
      const tag = child.getTag();
      found.push({
        node: child,
        type: tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3",
      });
    } else if ($isQuoteNode(child)) {
      found.push({ node: child, type: "quote" });
    } else if ($isElementNode(child)) {
      found.push({ node: child, type: "paragraph" });
    }
  }
  return found;
}

function $readRuns(
  node: ElementNode,
  href: string | undefined,
  runs: InlineRun[],
) {
  for (const child of node.getChildren()) {
    if ($isTextNode(child)) {
      pushRun(runs, {
        text: child.getTextContent(),
        ...(child.hasFormat("bold") && { bold: true }),
        ...(child.hasFormat("italic") && { italic: true }),
        ...(child.hasFormat("underline") && { underline: true }),
        ...(child.hasFormat("strikethrough") && { strike: true }),
        ...(child.hasFormat("highlight") && { highlight: true }),
        ...(child.hasFormat("code") && { code: true }),
        ...(href && { href }),
      });
    } else if ($isLineBreakNode(child)) {
      pushRun(runs, { text: "\n", ...(href && { href }) });
    } else if ($isLinkNode(child)) {
      $readRuns(child, child.getURL(), runs);
    } else if ($isElementNode(child) && !$isListNode(child)) {
      $readRuns(child, href, runs);
    }
  }
}

function $textNodes(run: InlineRun): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  run.text.split("\n").forEach((line, index) => {
    if (index > 0) nodes.push($createLineBreakNode());
    if (!line) return;
    const text = $createTextNode(line);
    if (run.bold) text.toggleFormat("bold");
    if (run.italic) text.toggleFormat("italic");
    if (run.underline) text.toggleFormat("underline");
    if (run.strike) text.toggleFormat("strikethrough");
    if (run.highlight) text.toggleFormat("highlight");
    if (run.code) text.toggleFormat("code");
    nodes.push(text);
  });
  return nodes;
}

function $writeRuns(node: ElementNode, runs: readonly InlineRun[]) {
  node.clear();
  for (let i = 0; i < runs.length;) {
    const href = runs[i]!.href;
    if (!href) {
      node.append(...$textNodes(runs[i]!));
      i++;
      continue;
    }
    const link = $createLinkNode(href);
    while (i < runs.length && runs[i]!.href === href) {
      link.append(...$textNodes(runs[i]!));
      i++;
    }
    node.append(link);
  }
}

const $blockText = (node: BlockNode["node"]) => {
  if (!$isElementNode(node)) return "";
  const runs: InlineRun[] = [];
  $readRuns(node, undefined, runs);
  return serializeInline(runs);
};

const $createBlockElement = (type: BlockType): ElementNode => {
  if (type === "h1" || type === "h2" || type === "h3") {
    return $createHeadingNode(type);
  }
  if (type === "quote") return $createQuoteNode();
  return $createParagraphNode();
};

/**
 * Block ids live outside the editor, keyed by node key. Entries are never
 * removed, so an undo that brings a node back also brings its id back.
 */
export type BlockIds = Map<NodeKey, string>;

export const STREAMING_ID = "streaming-";

export const normalizeBlock = (
  block: Partial<Block>,
  index: number,
): Block => ({
  id: block.id ?? `${STREAMING_ID}${index}`,
  type: isBlockType(block.type) ? block.type : "paragraph",
  text: block.text ?? "",
});

export function $readBlocks(ids: BlockIds, mintId: () => string): Block[] {
  const seen = new Set<string>();
  return $collectBlockNodes().map(({ node, type }) => {
    const key = node.getKey();
    let id = ids.get(key);
    if (!id || id.startsWith(STREAMING_ID) || seen.has(id)) {
      id = mintId();
      ids.set(key, id);
    }
    seen.add(id);
    return { id, type, text: $blockText(node) };
  });
}

/**
 * Writes blocks into the editor. While the block list keeps its shape, only
 * the blocks whose text or type changed are touched, which is what lets a
 * streamed edit type itself into one paragraph; any other change rebuilds
 * the document.
 */
export function $writeBlocks(
  incoming: readonly Partial<Block>[],
  ids: BlockIds,
) {
  const blocks = incoming.map(normalizeBlock);
  const current = $collectBlockNodes();

  const patchable =
    current.length === blocks.length &&
    blocks.every((block, index) => {
      const existing = current[index]!;
      const id = ids.get(existing.node.getKey());
      const sameId = id === block.id || !!id?.startsWith(STREAMING_ID);
      return (
        sameId &&
        (keepsItsNode(block.type) || keepsItsNode(existing.type)
          ? existing.type === block.type
          : true)
      );
    });

  if (patchable) {
    blocks.forEach((block, index) => {
      const existing = current[index]!;
      if (existing.type === "divider") {
        ids.set(existing.node.getKey(), block.id);
        return;
      }
      let element = existing.node;
      if (existing.type !== block.type) {
        const replacement = $createBlockElement(block.type);
        element.replace(replacement, true);
        element = replacement;
      }
      ids.set(element.getKey(), block.id);
      if ($blockText(element) !== block.text) {
        $writeRuns(element, parseInline(block.text));
      }
    });
    return;
  }

  const root = $getRoot();
  root.clear();
  let list: ListNode | undefined;
  let listType: BlockType | undefined;
  for (const block of blocks) {
    if (isListType(block.type)) {
      if (!list || listType !== block.type) {
        list = $createListNode(block.type === "numbered" ? "number" : "bullet");
        listType = block.type;
        root.append(list);
      }
      const item = $createListItemNode();
      $writeRuns(item, parseInline(block.text));
      list.append(item);
      ids.set(item.getKey(), block.id);
      continue;
    }
    list = undefined;
    if (block.type === "divider") {
      const rule = $createHorizontalRuleNode();
      root.append(rule);
      ids.set(rule.getKey(), block.id);
      continue;
    }
    const element = $createBlockElement(block.type);
    $writeRuns(element, parseInline(block.text));
    root.append(element);
    ids.set(element.getKey(), block.id);
  }
  if (blocks.length === 0) root.append($createParagraphNode());
}

export function $blockKeys(ids: BlockIds): Map<string, NodeKey> {
  const keys = new Map<string, NodeKey>();
  for (const { node } of $collectBlockNodes()) {
    const id = ids.get(node.getKey());
    if (id) keys.set(id, node.getKey());
  }
  return keys;
}

export function $findBlockKey(ids: BlockIds, id: string): NodeKey | undefined {
  for (const { node } of $collectBlockNodes()) {
    if (ids.get(node.getKey()) === id) return node.getKey();
  }
  return undefined;
}

export function $blockKeyOf(node: LexicalNode): NodeKey | undefined {
  let current: LexicalNode | null = node;
  while (current) {
    if ($isListItemNode(current)) return current.getKey();
    const parent: ElementNode | null = current.getParent();
    if (parent && parent.getKey() === "root") return current.getKey();
    current = parent;
  }
  return undefined;
}
