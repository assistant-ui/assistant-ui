import markdownIt, { type MarkdownIt, type Token } from "markdown-it";
import type {
  BlockNode,
  CodeBlockNode,
  HeadingNode,
  ImageNode,
  InlineNode,
  LineRange,
  LinkNode,
  ListItemNode,
  ListNode,
  TableAlign,
  TableNode,
  TableRowNode,
} from "../ast";
import type { Tokenizer } from "./types";

type MarkdownItTokenizerOptions = {
  /** Enables tables, strikethrough, task lists, and autolinks. */
  gfm: boolean;
};

type Context = {
  md: MarkdownIt;
  gfm: boolean;
};

const TASK_MARKER = /^\[([ xX])\](?:[ \t]+|$)/;
const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const WWW_PREFIX = /^www\./i;
const TEXT_ALIGN = /text-align:\s*(left|center|right)/;

const linesOf = (token: Token): LineRange => {
  const [start, end] = token.map ?? [0, 0];
  return { start, end };
};

const closeIndexOf = (tokens: Token[], open: number): number => {
  if (tokens[open]!.nesting !== 1) return open;
  let depth = 0;
  for (let index = open; index < tokens.length; index++) {
    depth += tokens[index]!.nesting;
    if (depth === 0) return index;
  }
  return tokens.length - 1;
};

const appendText = (siblings: InlineNode[], value: string) => {
  if (!value) return;
  const last = siblings.at(-1);
  if (last?.type === "text") last.value += value;
  else siblings.push({ type: "text", value });
};

const plainText = (nodes: InlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "codeSpan":
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

const withTitle = <T extends LinkNode | ImageNode>(
  node: T,
  token: Token,
): T => {
  const title = token.attrGet("title");
  if (title) node.title = String(title);
  return node;
};

// The linkify rule also links bare domains such as `example.com`; only links
// that spell out a scheme, start with `www.`, or are email addresses are kept.
const isAutolinkKept = (token: Token, text: string): boolean =>
  URL_SCHEME.test(text) ||
  WWW_PREFIX.test(text) ||
  String(token.attrGet("href")).startsWith("mailto:");

const convertInline = (tokens: Token[]): InlineNode[] => {
  const root: InlineNode[] = [];
  const stack: InlineNode[][] = [root];

  tokens.forEach((token, index) => {
    const siblings = stack.at(-1)!;
    const open = (node: InlineNode & { children: InlineNode[] }) => {
      siblings.push(node);
      stack.push(node.children);
    };

    switch (token.type) {
      case "text":
      case "text_special":
        appendText(siblings, token.content);
        break;
      case "softbreak":
        siblings.push({ type: "softBreak" });
        break;
      case "hardbreak":
        siblings.push({ type: "hardBreak" });
        break;
      case "code_inline":
        siblings.push({ type: "codeSpan", value: token.content });
        break;
      case "html_inline":
        siblings.push({ type: "htmlInline", value: token.content });
        break;
      case "image":
        siblings.push(
          withTitle(
            {
              type: "image",
              url: String(token.attrGet("src") ?? ""),
              alt: plainText(convertInline(token.children ?? [])),
            },
            token,
          ),
        );
        break;
      case "em_open":
        open({ type: "emphasis", children: [] });
        break;
      case "strong_open":
        open({ type: "strong", children: [] });
        break;
      case "s_open":
        open({ type: "strikethrough", children: [] });
        break;
      case "link_open":
        if (
          token.markup === "linkify" &&
          !isAutolinkKept(token, tokens[index + 1]?.content ?? "")
        ) {
          stack.push(siblings);
        } else {
          open(
            withTitle(
              {
                type: "link",
                url: String(token.attrGet("href") ?? ""),
                children: [],
              },
              token,
            ),
          );
        }
        break;
      case "em_close":
      case "strong_close":
      case "s_close":
      case "link_close":
        stack.pop();
        break;
    }
  });

  return root;
};

const convertListItem = (
  token: Token,
  children: BlockNode[],
  { gfm }: Context,
): ListItemNode => {
  const item: ListItemNode = {
    type: "listItem",
    children,
    lines: linesOf(token),
  };
  const first = children[0];
  if (!gfm || first?.type !== "paragraph") return item;
  const text = first.children[0];
  if (text?.type !== "text") return item;
  const marker = TASK_MARKER.exec(text.value);
  const next = first.children[1];
  if (
    !marker ||
    (marker[0] === text.value &&
      next !== undefined &&
      next.type !== "softBreak" &&
      next.type !== "hardBreak")
  ) {
    return item;
  }

  item.checked = marker[1] !== " ";
  text.value = text.value.slice(marker[0].length);
  if (!text.value) {
    first.children.shift();
    if (next?.type === "softBreak" || next?.type === "hardBreak") {
      first.children.shift();
    }
  }
  return item;
};

const convertList = (
  tokens: Token[],
  open: number,
  close: number,
  context: Context,
): ListNode => {
  const token = tokens[open]!;
  const children: ListItemNode[] = [];
  let tight = true;

  for (let index = open + 1; index < close;) {
    const itemClose = closeIndexOf(tokens, index);
    const itemToken = tokens[index]!;
    const inner = tokens.slice(index + 1, itemClose);
    if (
      inner.some(
        (t) =>
          t.type === "paragraph_open" &&
          t.level === itemToken.level + 1 &&
          !t.hidden,
      )
    ) {
      tight = false;
    }
    children.push(
      convertListItem(itemToken, convertBlocks(inner, context), context),
    );
    index = itemClose + 1;
  }

  const list: ListNode = {
    type: "list",
    ordered: token.type === "ordered_list_open",
    tight,
    children,
    lines: linesOf(token),
  };
  if (list.ordered) list.start = Number(token.attrGet("start") ?? 1);
  return list;
};

const alignOf = (token: Token): TableAlign => {
  const align = TEXT_ALIGN.exec(String(token.attrGet("style") ?? ""))?.[1];
  return align === "left" || align === "center" || align === "right"
    ? align
    : null;
};

const convertTable = (
  tokens: Token[],
  open: number,
  close: number,
): TableNode => {
  const children: TableRowNode[] = [];
  const align: TableAlign[] = [];

  for (let index = open + 1; index < close; index++) {
    const token = tokens[index]!;
    if (token.type === "tr_open") {
      children.push({ type: "tableRow", children: [], lines: linesOf(token) });
    } else if (token.type === "th_open" || token.type === "td_open") {
      if (children.length === 1) align.push(alignOf(token));
      children.at(-1)?.children.push({
        type: "tableCell",
        children: convertInline(tokens[index + 1]?.children ?? []),
      });
    }
  }

  return { type: "table", align, children, lines: linesOf(tokens[open]!) };
};

const convertCodeBlock = (token: Token, { md }: Context): CodeBlockNode => {
  const node: CodeBlockNode = {
    type: "codeBlock",
    value: token.content,
    lines: linesOf(token),
  };
  const info = md.utils.unescapeAll(token.info).trim();
  if (!info) return node;

  const space = info.search(/\s/);
  node.lang = space === -1 ? info : info.slice(0, space);
  const meta = space === -1 ? "" : info.slice(space).trim();
  if (meta) node.meta = meta;
  return node;
};

const convertBlock = (
  tokens: Token[],
  open: number,
  close: number,
  context: Context,
): BlockNode | undefined => {
  const token = tokens[open]!;
  switch (token.type) {
    case "paragraph_open":
      return {
        type: "paragraph",
        children: convertInline(tokens[open + 1]?.children ?? []),
        lines: linesOf(token),
      };
    case "heading_open":
      return {
        type: "heading",
        depth: Number(token.tag.slice(1)) as HeadingNode["depth"],
        children: convertInline(tokens[open + 1]?.children ?? []),
        lines: linesOf(token),
      };
    case "hr":
      return { type: "thematicBreak", lines: linesOf(token) };
    case "blockquote_open":
      return {
        type: "blockquote",
        children: convertBlocks(tokens.slice(open + 1, close), context),
        lines: linesOf(token),
      };
    case "bullet_list_open":
    case "ordered_list_open":
      return convertList(tokens, open, close, context);
    case "fence":
    case "code_block":
      return convertCodeBlock(token, context);
    case "html_block":
      return { type: "htmlBlock", value: token.content, lines: linesOf(token) };
    case "table_open":
      return convertTable(tokens, open, close);
    default:
      return undefined;
  }
};

const convertBlocks = (tokens: Token[], context: Context): BlockNode[] => {
  const blocks: BlockNode[] = [];
  for (let index = 0; index < tokens.length;) {
    const close = closeIndexOf(tokens, index);
    const block = convertBlock(tokens, index, close, context);
    if (block) blocks.push(block);
    index = close + 1;
  }
  return blocks;
};

export const createMarkdownItTokenizer = ({
  gfm,
}: MarkdownItTokenizerOptions): Tokenizer => {
  const md = markdownIt("commonmark");
  if (gfm) {
    md.set({ linkify: true });
    md.linkify.set({ fuzzyLink: true });
    md.enable(["table", "strikethrough", "linkify"]);
  }
  const context: Context = { md, gfm };
  return { parse: (source) => convertBlocks(md.parse(source, {}), context) };
};
