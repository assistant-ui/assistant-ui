"use client";

import { unstable_useInteractable, useAuiState } from "@assistant-ui/react";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import {
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from "@lexical/mark";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import {
  LexicalComposer,
  type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $nodesOfType,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  KEY_ARROW_UP_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
  TextNode,
  type EditorState,
  type EditorThemeClasses,
  type EditorUpdateOptions,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type RefObject,
} from "react";
import {
  advance,
  classifyEdit,
  commentChanges,
  commentsDescription,
  commentsSchema,
  COMMENTS_NAME,
  displayBlocks,
  documentActions,
  documentDescription,
  documentSchema,
  documentStore,
  DOCUMENT_NAME,
  findPage,
  isListType,
  mintId,
  normalizeBlock,
  parseInline,
  receive,
  remaining,
  sameBlock,
  serializeInline,
  settled,
  STREAMING_ID,
  streamMarks,
  TEMPLATES,
  threadsToComments,
  UPDATE_DOCUMENT_TOOL,
  useCurrentPage,
  useDocumentStore,
  useHydrated,
  writingBlockId,
  type Block,
  type PendingReview,
  type BlockType,
  type DocumentComment,
  type DocumentState,
  type InlineRun,
  type Page,
  type Stream,
  type StreamMarks,
  type Template,
  type TextBlockType,
} from "../lib/document";
import { BlockHandle } from "./block-handle";
import { CommentMarks } from "./comments";
import { AssistantFlag, EditReview } from "./edit-review";
import { PageIcon } from "./icon-picker";
import { SelectionToolbar } from "./selection-toolbar";
import { SlashMenu } from "./slash-menu";
import { TableControls } from "./table";
import { chipClass, glyphFor, Icon, PageGlyph } from "./ui";

/* -------------------------------------------------------------------------- */
/* Lexical setup.                                                             */
/* -------------------------------------------------------------------------- */

type SerializedPageLinkNode = Spread<
  { pageId: string; title: string },
  SerializedLexicalNode
>;

function PageLinkChip({ pageId, title }: { pageId: string; title: string }) {
  const page = useDocumentStore((state) => findPage(state.pages, pageId));
  // The page a link points at can be deleted. What is left is its name.
  if (!page) {
    return (
      <span data-missing className="doc-page-link-chip">
        {title}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="doc-page-link-chip"
      onClick={() => documentActions.selectPage(page.id)}
    >
      <PageGlyph icon={page.icon} className="size-[0.9em] text-[0.8em]" />
      {page.title || "Untitled"}
    </button>
  );
}

/**
 * A link to another page, inline in the text. It shows the page's icon and
 * its title as they are now, and opens the page. In a block's text it is
 * written `[[page:<page id>|<title>]]`, with the title it was inserted with.
 */
export class PageLinkNode extends DecoratorNode<ReactElement> {
  __pageId: string;
  __title: string;

  static override getType() {
    return "page-link";
  }

  static override clone(node: PageLinkNode) {
    return new PageLinkNode(node.__pageId, node.__title, node.__key);
  }

  static override importJSON(serialized: SerializedPageLinkNode) {
    return $createPageLinkNode(serialized.pageId, serialized.title);
  }

  constructor(pageId: string, title: string, key?: NodeKey) {
    super(key);
    this.__pageId = pageId;
    this.__title = title;
  }

  override exportJSON(): SerializedPageLinkNode {
    return {
      ...super.exportJSON(),
      pageId: this.__pageId,
      title: this.__title,
    };
  }

  override createDOM() {
    return document.createElement("span");
  }

  override updateDOM() {
    return false;
  }

  override isInline() {
    return true;
  }

  override getTextContent() {
    return this.__title;
  }

  getPageId() {
    return this.__pageId;
  }

  getTitle() {
    return this.__title;
  }

  override decorate() {
    return <PageLinkChip pageId={this.__pageId} title={this.__title} />;
  }
}

/** A link to the page with that id. `title` is what it reads as in plain text. */
export const $createPageLinkNode = (pageId: string, title: string) =>
  new PageLinkNode(pageId, title || "Untitled");

export const $isPageLinkNode = (
  node: LexicalNode | null | undefined,
): node is PageLinkNode => node instanceof PageLinkNode;

/**
 * Every node class the editor registers. `MarkNode` anchors comments, and
 * `PageLinkNode` is the chip the "@" menu inserts.
 */
export const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  HorizontalRuleNode,
  MarkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  PageLinkNode,
];

/** Class names the editor puts on its nodes; document-editor.css styles them. */
export const editorTheme: EditorThemeClasses = {
  paragraph: "doc-p",
  heading: { h1: "doc-h1", h2: "doc-h2", h3: "doc-h3" },
  quote: "doc-quote",
  list: {
    ul: "doc-ul",
    ol: "doc-ol",
    checklist: "doc-checklist",
    listitem: "doc-li",
    listitemChecked: "doc-li-checked",
    listitemUnchecked: "doc-li-unchecked",
    nested: { listitem: "doc-li-nested" },
  },
  hr: "doc-hr",
  hrSelected: "doc-hr-selected",
  table: "doc-table",
  tableRow: "doc-tr",
  tableCell: "doc-td",
  tableCellHeader: "doc-th",
  tableCellSelected: "doc-cell-selected",
  tableSelection: "doc-table-selecting",
  tableScrollableWrapper: "doc-table-wrap",
  mark: "doc-mark",
  markOverlap: "doc-mark-overlap",
  text: {
    bold: "doc-bold",
    italic: "doc-italic",
    underline: "doc-underline",
    strikethrough: "doc-strike",
    underlineStrikethrough: "doc-underline-strike",
    code: "doc-code",
  },
};

const SAVED_NODE_TYPES = new Set([
  "root",
  "paragraph",
  "heading",
  "quote",
  "list",
  "listitem",
  "horizontalrule",
  "mark",
  "table",
  "tablerow",
  "tablecell",
  "page-link",
  "text",
  "linebreak",
  "tab",
]);

// A saved state holding a node this editor does not register would throw
// when it is parsed, so such a state is dropped and the page built from blocks.
function usableState(saved: string | null): string | null {
  if (!saved) return null;
  try {
    const visit = (node: unknown): boolean => {
      if (!node || typeof node !== "object") return false;
      const { type, children } = node as {
        type?: unknown;
        children?: unknown;
      };
      if (typeof type !== "string" || !SAVED_NODE_TYPES.has(type)) return false;
      return !Array.isArray(children) || children.every(visit);
    };
    const parsed = JSON.parse(saved) as { root?: unknown };
    return visit(parsed.root) ? saved : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Blocks in the editor. A block is a top-level node, or one list item.       */
/* -------------------------------------------------------------------------- */

/**
 * Block ids live outside the editor, keyed by node key. Entries are never
 * removed, so an undo that brings a node back also brings its id back.
 */
export type BlockIds = Map<NodeKey, string>;

const blockIds = new WeakMap<LexicalEditor, BlockIds>();

export function idsOf(editor: LexicalEditor): BlockIds {
  let ids = blockIds.get(editor);
  if (!ids) {
    ids = new Map();
    blockIds.set(editor, ids);
  }
  return ids;
}

const mintBlockId = () => `b-${mintId()}`;

type ListBlockType = "bullet" | "numbered" | "check";

const listBlockType = (list: ListNode): ListBlockType => {
  const type = list.getListType();
  return type === "number" ? "numbered" : type === "check" ? "check" : "bullet";
};

const lexicalListType = (type: ListBlockType) =>
  type === "numbered" ? "number" : type;

export type BlockNode =
  | { node: ElementNode; type: Exclude<BlockType, "divider"> }
  | { node: LexicalNode; type: "divider" };

/** Every block of the page, in order. Call inside `editor.read` or `update`. */
export function $collectBlockNodes(): BlockNode[] {
  const found: BlockNode[] = [];

  const visitList = (list: ListNode) => {
    const type = listBlockType(list);
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
    } else if ($isTableNode(child)) {
      found.push({ node: child, type: "table" });
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

/**
 * The key of the block a node sits in: its list item, or its top-level node,
 * which for a table cell is the table.
 */
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

/** The type of the block a node sits in. */
export function $blockTypeOf(node: LexicalNode): BlockType {
  for (let current: LexicalNode | null = node; current;) {
    if ($isListNode(current)) return listBlockType(current);
    if ($isHeadingNode(current)) {
      const tag = current.getTag();
      return tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3";
    }
    if ($isQuoteNode(current)) return "quote";
    if ($isHorizontalRuleNode(current)) return "divider";
    if ($isTableNode(current)) return "table";
    current = current.getParent();
  }
  return "paragraph";
}

function $readRuns(node: ElementNode, runs: InlineRun[]) {
  for (const child of node.getChildren()) {
    if ($isTextNode(child)) {
      runs.push({
        text: child.getTextContent(),
        ...(child.hasFormat("bold") && { bold: true }),
        ...(child.hasFormat("italic") && { italic: true }),
        ...(child.hasFormat("underline") && { underline: true }),
        ...(child.hasFormat("strikethrough") && { strike: true }),
        ...(child.hasFormat("code") && { code: true }),
      });
    } else if ($isLineBreakNode(child)) {
      runs.push({ text: "\n" });
    } else if ($isPageLinkNode(child)) {
      runs.push({ text: child.getTitle(), page: child.getPageId() });
    } else if ($isElementNode(child) && !$isListNode(child)) {
      $readRuns(child, runs);
    }
  }
}

const mergeRuns = (runs: readonly InlineRun[]) => {
  const merged: InlineRun[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      !last.page &&
      !run.page &&
      !!last.bold === !!run.bold &&
      !!last.italic === !!run.italic &&
      !!last.underline === !!run.underline &&
      !!last.strike === !!run.strike &&
      !!last.code === !!run.code
    ) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
};

function $textNodes(run: InlineRun): LexicalNode[] {
  if (run.page) return [$createPageLinkNode(run.page, run.text)];
  const nodes: LexicalNode[] = [];
  run.text.split("\n").forEach((line, index) => {
    if (index > 0) nodes.push($createLineBreakNode());
    if (!line) return;
    const text = $createTextNode(line);
    if (run.bold) text.toggleFormat("bold");
    if (run.italic) text.toggleFormat("italic");
    if (run.underline) text.toggleFormat("underline");
    if (run.strike) text.toggleFormat("strikethrough");
    if (run.code) text.toggleFormat("code");
    nodes.push(text);
  });
  return nodes;
}

function $writeRuns(node: ElementNode, runs: readonly InlineRun[]) {
  node.clear();
  for (const run of runs) node.append(...$textNodes(run));
}

const $blockText = (node: LexicalNode) => {
  if (!$isElementNode(node)) return "";
  const runs: InlineRun[] = [];
  $readRuns(node, runs);
  return serializeInline(mergeRuns(runs));
};

// A cell reads as one text. The paragraphs a person makes in it are its lines.
const $readRows = (table: TableNode): string[][] =>
  table
    .getChildren()
    .filter($isTableRowNode)
    .map((row) =>
      row
        .getChildren()
        .filter($isTableCellNode)
        .map((cell) => cell.getChildren().map($blockText).join("\n")),
    );

const $writeCell = (cell: TableCellNode, text: string) => {
  const paragraph = $createParagraphNode();
  $writeRuns(paragraph, parseInline(text));
  cell.clear();
  cell.append(paragraph);
};

/**
 * Fills a table from rows of cell text, the first row as its header. While
 * the table keeps its shape only the cells that changed are rewritten, which
 * keeps the comment anchors in the others.
 */
function $writeRows(table: TableNode, rows: readonly (readonly string[])[]) {
  const grid = rows.some((row) => row.length > 0) ? rows : [[""]];
  const current = $readRows(table);
  const sameShape =
    current.length === grid.length &&
    current.every((row, index) => row.length === grid[index]!.length);

  if (sameShape) {
    table.getChildren().forEach((row, rowIndex) => {
      if (!$isTableRowNode(row)) return;
      row.getChildren().forEach((cell, cellIndex) => {
        const text = grid[rowIndex]![cellIndex]!;
        if ($isTableCellNode(cell) && current[rowIndex]![cellIndex] !== text) {
          $writeCell(cell, text);
        }
      });
    });
    return;
  }

  table.clear();
  grid.forEach((cells, rowIndex) => {
    const row = $createTableRowNode();
    for (const text of cells) {
      const cell = $createTableCellNode(
        rowIndex === 0
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS,
      );
      $writeCell(cell, text);
      row.append(cell);
    }
    table.append(row);
  });
}

const $createBlockElement = (type: BlockType): ElementNode => {
  if (type === "h1" || type === "h2" || type === "h3") {
    return $createHeadingNode(type);
  }
  if (type === "quote") return $createQuoteNode();
  return $createParagraphNode();
};

/** The page as blocks. A block without an id yet is given one. */
export function $readBlocks(ids: BlockIds, mint = mintBlockId): Block[] {
  const seen = new Set<string>();
  return $collectBlockNodes().map(({ node, type }) => {
    const key = node.getKey();
    let id = ids.get(key);
    if (!id || id.startsWith(STREAMING_ID) || seen.has(id)) {
      id = mint();
      ids.set(key, id);
    }
    seen.add(id);
    if ($isTableNode(node)) {
      return { id, type: "table", text: "", rows: $readRows(node) };
    }
    return {
      id,
      type,
      text: $blockText(node),
      ...(type === "check" &&
        $isListItemNode(node) && { checked: !!node.getChecked() }),
    };
  });
}

// A list item, a divider and a table cannot turn into another kind of block
// in place.
const keepsItsNode = (type: BlockType) =>
  isListType(type) || type === "divider" || type === "table";

const $setChecked = (node: LexicalNode, block: Block) => {
  if (block.type !== "check" || !$isListItemNode(node)) return;
  if (!!node.getChecked() !== !!block.checked) node.setChecked(!!block.checked);
};

/**
 * Writes blocks into the editor. While the list keeps its shape, only the
 * blocks whose text or type changed are touched, which is what lets a streamed
 * edit type itself into one block. Any other change rebuilds the page around
 * the blocks that stayed the same, so their comment anchors survive.
 */
export function $writeBlocks(
  incoming: readonly (Partial<Block> | undefined)[],
  ids: BlockIds,
) {
  const blocks = incoming.map(normalizeBlock);
  const current = $collectBlockNodes();

  // No blocks at all is never a patch: the rebuild below is what gives an
  // empty page its one paragraph.
  const patchable =
    blocks.length > 0 &&
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
      if ($isTableNode(existing.node)) {
        ids.set(existing.node.getKey(), block.id);
        $writeRows(existing.node, block.rows ?? []);
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
      $setChecked(element, block);
    });
    return;
  }

  const byId = new Map<string, BlockNode>();
  for (const item of current) {
    const id = ids.get(item.node.getKey());
    if (id) byId.set(id, item);
  }

  const root = $getRoot();
  const next: LexicalNode[] = [];
  let list: ListNode | undefined;
  let listType: BlockType | undefined;
  for (const block of blocks) {
    const existing = byId.get(block.id);
    const kept = existing?.type === block.type ? existing.node : undefined;

    if (
      block.type === "bullet" ||
      block.type === "numbered" ||
      block.type === "check"
    ) {
      if (!list || listType !== block.type) {
        list = $createListNode(lexicalListType(block.type));
        listType = block.type;
        next.push(list);
      }
      const item = $isListItemNode(kept) ? kept : $createListItemNode();
      list.append(item);
      if ($blockText(item) !== block.text) {
        $writeRuns(item, parseInline(block.text));
      }
      $setChecked(item, block);
      ids.set(item.getKey(), block.id);
      continue;
    }

    list = undefined;
    if (block.type === "divider") {
      const rule = kept ?? $createHorizontalRuleNode();
      next.push(rule);
      ids.set(rule.getKey(), block.id);
      continue;
    }
    if (block.type === "table") {
      const table = $isTableNode(kept) ? kept : $createTableNode();
      $writeRows(table, block.rows ?? []);
      next.push(table);
      ids.set(table.getKey(), block.id);
      continue;
    }
    const element = $isElementNode(kept)
      ? kept
      : $createBlockElement(block.type);
    if ($blockText(element) !== block.text) {
      $writeRuns(element, parseInline(block.text));
    }
    next.push(element);
    ids.set(element.getKey(), block.id);
  }
  if (next.length === 0) next.push($createParagraphNode());
  root.splice(0, root.getChildrenSize(), next);
}

// A page loaded from its saved editor state has new node keys, so the ids its
// blocks were saved with are matched back to the nodes by position.
function $adoptIds(blocks: readonly Block[], ids: BlockIds) {
  const nodes = $collectBlockNodes();
  if (nodes.length !== blocks.length) return;
  nodes.forEach(({ node }, index) => ids.set(node.getKey(), blocks[index]!.id));
}

function $blockKeys(ids: BlockIds): Map<string, NodeKey> {
  const keys = new Map<string, NodeKey>();
  for (const { node } of $collectBlockNodes()) {
    const id = ids.get(node.getKey());
    if (id) keys.set(id, node.getKey());
  }
  return keys;
}

/* -------------------------------------------------------------------------- */
/* Commands the menus and toolbars call.                                      */
/* -------------------------------------------------------------------------- */

/**
 * The blocks a selection covers. A selection that ends at the very start of a
 * block, as a triple click does, does not cover that block.
 */
function $selectedBlocks(selection: RangeSelection): ElementNode[] {
  const blocks = new Set($collectBlockNodes().map(({ node }) => node.getKey()));
  const keys: NodeKey[] = [];
  for (const node of selection.getNodes()) {
    const key = $blockKeyOf(node);
    if (key && blocks.has(key) && !keys.includes(key)) keys.push(key);
  }
  const end = selection.isBackward() ? selection.anchor : selection.focus;
  if (keys.length > 1 && end.offset === 0) {
    const endNode = end.getNode();
    const endKey = $blockKeyOf(endNode);
    const block = endKey ? $getNodeByKey(endKey) : null;
    const atStart =
      end.type === "element"
        ? endNode.is(block)
        : $isElementNode(block) && endNode.is(block.getFirstDescendant());
    if (endKey && atStart && keys.includes(endKey)) {
      keys.splice(keys.indexOf(endKey), 1);
    }
  }
  return keys.flatMap((key) => {
    const node = $getNodeByKey(key);
    return $isElementNode(node) ? [node] : [];
  });
}

// Lists of one kind that sit side by side read as one list, and a numbered
// list would otherwise start counting again, so they are joined.
function $joinLists() {
  let node = $getRoot().getFirstChild();
  while (node) {
    const next = node.getNextSibling();
    if (
      $isListNode(node) &&
      $isListNode(next) &&
      node.getListType() === next.getListType()
    ) {
      node.append(...next.getChildren());
      next.remove();
      continue;
    }
    node = next;
  }
}

const $createBlock = (
  type: BlockType,
): { top: LexicalNode; focus: ElementNode | null } => {
  if (type === "bullet" || type === "numbered" || type === "check") {
    const list = $createListNode(lexicalListType(type));
    const item = $createListItemNode(type === "check" ? false : undefined);
    list.append(item);
    return { top: list, focus: item };
  }
  if (type === "divider")
    return { top: $createHorizontalRuleNode(), focus: null };
  if (type === "table") {
    const table = $createTableNodeWithDimensions(3, 3, {
      rows: true,
      columns: false,
    });
    const row = table.getFirstChild();
    const cell = $isTableRowNode(row) ? row.getFirstChild() : null;
    return { top: table, focus: $isTableCellNode(cell) ? cell : null };
  }
  const element = $createBlockElement(type);
  return { top: element, focus: element };
};

// A new block starts plain: the caret would otherwise carry the bold or
// italic of the text it was last in.
const $caretIn = (node: ElementNode) => {
  const selection = node.selectStart();
  selection.setFormat(0);
  selection.setStyle("");
};

/**
 * Adds a block and puts the caret in it. With `afterKey` it goes below that
 * block. Without, it goes at the caret: an empty text block there becomes the
 * new block, anything else gets it below; with no caret it goes at the end.
 */
export function insertBlock(
  editor: LexicalEditor,
  type: BlockType,
  options: { afterKey?: NodeKey } = {},
) {
  editor.update(() => {
    let target: LexicalNode | null = null;
    let atCaret = false;
    if (options.afterKey) {
      target = $getNodeByKey(options.afterKey);
    } else {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const key = $blockKeyOf(selection.anchor.getNode());
        target = key ? $getNodeByKey(key) : null;
        atCaret = true;
      } else if ($isNodeSelection(selection)) {
        target = selection.getNodes()[0] ?? null;
      }
    }

    if (target && $isListItemNode(target) && isListType(type)) {
      const parent = target.getParent();
      if ($isListNode(parent) && listBlockType(parent) === type) {
        if (atCaret && target.getTextContentSize() === 0) {
          target.selectStart();
          return;
        }
        const item = $createListItemNode(type === "check" ? false : undefined);
        target.insertAfter(item);
        $caretIn(item);
        return;
      }
    }

    const top = target ? (target.getTopLevelElement() ?? target) : null;
    const { top: created, focus } = $createBlock(type);
    const replaces =
      atCaret &&
      top !== null &&
      top === target &&
      $isElementNode(top) &&
      !$isTableNode(top) &&
      top.getTextContentSize() === 0;

    if (replaces && type === "divider") {
      top.insertBefore(created);
      top.selectStart();
      return;
    }
    if (replaces) top.replace(created);
    else if (top) top.insertAfter(created);
    else $getRoot().append(created);

    // A table at the end of the page would leave nowhere to write after it.
    if (type === "table" && !created.getNextSibling()) {
      created.insertAfter($createParagraphNode());
    }

    if (focus) {
      $caretIn(focus);
      return;
    }
    let after = created.getNextSibling();
    if (!$isElementNode(after)) {
      after = $createParagraphNode();
      created.insertAfter(after);
    }
    if ($isElementNode(after)) $caretIn(after);
  });
  editor.focus();
}

// Turns one block into another kind, keeping its text and its id. A list is
// split around an item that leaves it. A table stays a table.
function $turnInto(node: ElementNode, type: TextBlockType, ids: BlockIds) {
  if ($isTableNode(node) || $blockTypeOf(node) === type) return;
  const id = ids.get(node.getKey());
  const { top, focus } = $createBlock(type);
  if (!focus) return;
  focus.append(...node.getChildren());

  if ($isListItemNode(node)) node.setIndent(0);
  const list = node.getParent();
  if ($isListItemNode(node) && $isListNode(list)) {
    const after = node.getNextSiblings();
    if (after.length > 0) {
      const rest = $createListNode(list.getListType());
      rest.append(...after);
      list.insertAfter(rest);
    }
    list.insertAfter(top);
    node.remove();
    if (list.isAttached() && list.getChildrenSize() === 0) list.remove();
  } else {
    node.replace(top);
  }
  if (id) ids.set(focus.getKey(), id);
}

/**
 * Turns the selected blocks into another kind of block, keeping their text.
 * Only those blocks change.
 */
export function setBlockType(editor: LexicalEditor, type: TextBlockType) {
  const ids = idsOf(editor);
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    for (const node of $selectedBlocks(selection)) $turnInto(node, type, ids);
    $joinLists();
  });
}

/** Turns one block into another kind, by the key of its list item or top-level node. */
export function turnBlockInto(
  editor: LexicalEditor,
  key: NodeKey,
  type: TextBlockType,
) {
  const ids = idsOf(editor);
  editor.update(() => {
    const node = $getNodeByKey(key);
    if (!$isElementNode(node)) return;
    $turnInto(node, type, ids);
    $joinLists();
  });
}

/** Removes one block, by the key of its list item or top-level node. */
export function deleteBlock(editor: LexicalEditor, key: NodeKey) {
  editor.update(() => {
    $getNodeByKey(key)?.remove();
    const root = $getRoot();
    if (root.getChildrenSize() === 0) root.append($createParagraphNode());
  });
}

// Splits a list so that something can sit before or after one of its items,
// and returns the node to insert after.
function $splitListAt(item: ListItemNode, position: "before" | "after") {
  const list = item.getParent();
  if (!$isListNode(list)) return item;
  const moving =
    position === "after"
      ? item.getNextSiblings()
      : [item, ...item.getNextSiblings()];
  if (moving.length === 0) return list;
  if (moving.length === list.getChildrenSize()) {
    const placeholder = $createParagraphNode();
    list.insertBefore(placeholder);
    return placeholder;
  }
  const rest = $createListNode(list.getListType());
  list.insertAfter(rest);
  rest.append(...moving);
  return list;
}

/** Moves one block before or after another, both given by block key. */
export function moveBlock(
  editor: LexicalEditor,
  key: NodeKey,
  targetKey: NodeKey,
  position: "before" | "after",
  options?: EditorUpdateOptions,
) {
  if (key === targetKey) return;
  editor.update(() => {
    const node = $getNodeByKey(key);
    const target = $getNodeByKey(targetKey);
    if (!node || !target) return;
    const oldParent = node.getParent();

    const targetParent = target.getParent();
    const sameList =
      $isListItemNode(node) &&
      $isListItemNode(target) &&
      $isListNode(oldParent) &&
      $isListNode(targetParent) &&
      oldParent.getListType() === targetParent.getListType();

    if (sameList) {
      if (position === "before") target.insertBefore(node);
      else target.insertAfter(node);
    } else {
      let moved: LexicalNode = node;
      if ($isListItemNode(node) && $isListNode(oldParent)) {
        const wrapper = $createListNode(oldParent.getListType());
        wrapper.append(node);
        moved = wrapper;
      }
      if ($isListItemNode(target)) {
        const anchor = $splitListAt(target, position);
        if ($isParagraphNode(anchor) && anchor.getChildrenSize() === 0) {
          anchor.replace(moved);
        } else {
          anchor.insertAfter(moved);
        }
      } else if (position === "before") {
        target.insertBefore(moved);
      } else {
        target.insertAfter(moved);
      }
    }

    if ($isListNode(oldParent) && oldParent.getChildrenSize() === 0) {
      oldParent.remove();
    }
    $joinLists();
  }, options);
}

export type SelectionFormat = {
  block: BlockType;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
};

const NO_FORMAT: SelectionFormat = {
  block: "paragraph",
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
};

const FORMAT_KEYS = Object.keys(NO_FORMAT) as (keyof SelectionFormat)[];

function $selectionFormat(): SelectionFormat | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  return {
    block: $blockTypeOf(
      $selectedBlocks(selection)[0] ?? selection.anchor.getNode(),
    ),
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    underline: selection.hasFormat("underline"),
    strike: selection.hasFormat("strikethrough"),
    code: selection.hasFormat("code"),
  };
}

/** The block type and text formats at the selection. Use inside the composer. */
export function useSelectionFormat() {
  const [editor] = useLexicalComposerContext();
  const [format, setFormat] = useState(NO_FORMAT);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const next = editorState.read($selectionFormat);
      if (!next) return;
      setFormat((previous) =>
        FORMAT_KEYS.every((key) => previous[key] === next[key])
          ? previous
          : next,
      );
    });
  }, [editor]);

  return format;
}

/** Whether the page can be changed, which it cannot while the assistant writes. */
export function useIsEditable() {
  const [editor] = useLexicalComposerContext();
  return useSyncExternalStore(
    (onChange) => editor.registerEditableListener(onChange),
    () => editor.isEditable(),
    () => true,
  );
}

/* -------------------------------------------------------------------------- */
/* Comment anchors: a MarkNode around the passage, with the thread's markId.  */
/* -------------------------------------------------------------------------- */

/**
 * Highlights the selected text and starts an empty thread on it, open and
 * ready for its first message. Returns the thread id, or null with no text
 * selected. A thread closed without a message should be deleted again, with
 * `removeCommentMark`.
 */
export function commentOnSelection(editor: LexicalEditor, pageId: string) {
  const id = `c-${mintId()}`;
  let quote = "";
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
    quote = selection.getTextContent().trim();
    if (!quote) return;
    $wrapSelectionInMarkNode(selection, selection.isBackward(), id);
  });
  if (!quote) return null;
  return documentActions.addThread({ id, markId: id, pageId, quote });
}

/**
 * Highlights the first place the page holds `quote`, as the anchor of the
 * thread with that `markId`. Returns false when the page does not hold it.
 */
export function markQuote(
  editor: LexicalEditor,
  quote: string,
  markId: string,
  options?: EditorUpdateOptions,
) {
  let marked = false;
  const wanted = quote.trim();
  if (!wanted) return false;
  editor.update(() => {
    for (const { node } of $collectBlockNodes()) {
      if (!$isElementNode(node)) continue;
      const texts = node.getAllTextNodes();
      const start = texts
        .map((text) => text.getTextContent())
        .join("")
        .indexOf(wanted);
      if (start === -1) continue;
      const end = start + wanted.length;
      const selection = $createRangeSelection();
      let offset = 0;
      let anchored = false;
      for (const text of texts) {
        const size = text.getTextContentSize();
        if (!anchored && start < offset + size) {
          selection.anchor.set(text.getKey(), start - offset, "text");
          anchored = true;
        }
        if (anchored && end <= offset + size) {
          selection.focus.set(text.getKey(), end - offset, "text");
          $wrapSelectionInMarkNode(selection, false, markId);
          marked = true;
          return;
        }
        offset += size;
      }
    }
  }, options);
  return marked;
}

/** Takes a thread's highlight off the page, leaving the text. */
export function removeCommentMark(editor: LexicalEditor, markId: string) {
  editor.update(() => {
    for (const mark of $nodesOfType(MarkNode)) {
      if (!mark.hasID(markId)) continue;
      mark.deleteID(markId);
      if (mark.getIDs().length === 0) $unwrapMarkNode(mark);
    }
  });
}

/** The highlighted elements of one thread, in page order. Empty once edited away. */
export function getMarkElements(editor: LexicalEditor, markId: string) {
  const keys = editor.getEditorState().read(() =>
    $nodesOfType(MarkNode)
      .filter((mark) => mark.hasID(markId))
      .map((mark) => mark.getKey()),
  );
  return keys.flatMap((key) => editor.getElementByKey(key) ?? []);
}

/** The mark ids at a DOM node inside the editor, innermost thread first. */
export function markIdsAt(editor: LexicalEditor, target: Node) {
  const element =
    target instanceof HTMLElement ? target : (target.parentElement ?? null);
  const mark = element?.closest("mark");
  if (!mark) return [];
  return editor.getEditorState().read(() =>
    $nodesOfType(MarkNode)
      .filter((node) => editor.getElementByKey(node.getKey()) === mark)
      .flatMap((node) => node.getIDs()),
  );
}

/* -------------------------------------------------------------------------- */
/* The mounted editor, for the pieces outside the composer.                   */
/* -------------------------------------------------------------------------- */

type Mounted = {
  editor: LexicalEditor | null;
  pageId: string | null;
  /** The content column. Floating pieces position against it. */
  anchor: HTMLElement | null;
  /** The element the page scrolls in. */
  scroller: HTMLElement | null;
};

let mounted: Mounted = {
  editor: null,
  pageId: null,
  anchor: null,
  scroller: null,
};
const mountedListeners = new Set<() => void>();

const setMounted = (patch: Partial<Mounted>) => {
  mounted = { ...mounted, ...patch };
  for (const listener of mountedListeners) listener();
};

const subscribeMounted = (listener: () => void) => {
  mountedListeners.add(listener);
  return () => {
    mountedListeners.delete(listener);
  };
};

/** The editor of the open page, from outside the composer. Null before it mounts. */
export const getActiveEditor = () => mounted.editor;

export const useActiveEditor = () =>
  useSyncExternalStore(subscribeMounted, getActiveEditor, () => null);

/** The content column, `position: relative`, that floating pieces anchor to. */
export const useEditorAnchor = () =>
  useSyncExternalStore(
    subscribeMounted,
    () => mounted.anchor,
    () => null,
  );

/** The scrolling element around the page. */
export const useEditorScroller = () =>
  useSyncExternalStore(
    subscribeMounted,
    () => mounted.scroller,
    () => null,
  );

/** How the assistant side reads the open page outside React. */
export type EditorBridge = {
  editor: LexicalEditor;
  pageId: string;
  /** The `id` argument of an update_document call for this page. */
  documentId: string;
  /** The `id` argument of an update_comments call for this page. */
  commentsId: string;
  /** The page as the model sees it. Do not call while an edit is streaming. */
  getDocument(): DocumentState;
  getComments(): DocumentComment[];
};

export const commentsIdOf = (pageId: string) => `${pageId}-comments`;

export function getEditorBridge(): EditorBridge | null {
  const { editor, pageId } = mounted;
  if (!editor || !pageId) return null;
  return {
    editor,
    pageId,
    documentId: pageId,
    commentsId: commentsIdOf(pageId),
    getDocument: () => ({
      title:
        documentStore.getState().pages.find((page) => page.id === pageId)
          ?.title ?? "",
      blocks: editor.getEditorState().read(() => $readBlocks(idsOf(editor))),
    }),
    getComments: () =>
      threadsToComments(documentStore.getState().threads, pageId),
  };
}

/** Fills the page with blocks, as one step that undo takes back. */
export function replaceBlocks(editor: LexicalEditor, blocks: readonly Block[]) {
  editor.update(
    () => {
      $writeBlocks(blocks, idsOf(editor));
      $setSelection(null);
    },
    { tag: HISTORY_PUSH_TAG },
  );
}

/**
 * The editor's own state from before the edit that waits for review. Blocks
 * cannot say where a comment is anchored, so this is what brings the anchors
 * back. It lasts as long as the editor, which a reload replaces.
 */
const reviewOrigins = new WeakMap<LexicalEditor, EditorState>();

const $markIds = () =>
  new Set($nodesOfType(MarkNode).flatMap((mark) => mark.getIDs()));

/**
 * Puts back the editor state held from before the edit, when it reads as the
 * review says the page did. A comment made since the edit is anchored again.
 */
function restoreOrigin(editor: LexicalEditor, review: PendingReview) {
  const origin = reviewOrigins.get(editor);
  if (!origin) return false;
  const keys: BlockIds = new Map();
  const blocks = origin.read(() => $readBlocks(keys));
  if (
    blocks.length !== review.before.length ||
    !blocks.every((block, index) => sameBlock(block, review.before[index]!))
  ) {
    return false;
  }
  const ids = idsOf(editor);
  [...keys.keys()].forEach((key, index) =>
    ids.set(key, review.before[index]!.id),
  );
  const since = editor.getEditorState().read($markIds);
  editor.setEditorState(origin.clone(null), { tag: HISTORY_PUSH_TAG });
  const held = editor.getEditorState().read($markIds);
  for (const thread of documentStore.getState().threads) {
    if (
      thread.pageId === review.pageId &&
      since.has(thread.markId) &&
      !held.has(thread.markId)
    ) {
      markQuote(editor, thread.quote, thread.markId, {
        tag: HISTORY_MERGE_TAG,
      });
    }
  }
  return true;
}

/**
 * Takes back the edit that waits for review, which is what the Undo button of
 * the review does: the page goes back to what it was before the assistant's
 * edit, as one step that undo in the page takes back. Returns false when
 * there is nothing to take back, or while the assistant is writing.
 */
export function undoPendingReview() {
  const review = documentStore.getState().pendingReview;
  if (!review) return false;
  const { editor, pageId } = mounted;
  if (!editor || pageId !== review.pageId) {
    documentActions.undoReview();
    return true;
  }
  if (!editor.isEditable()) return false;
  if (!restoreOrigin(editor, review)) replaceBlocks(editor, review.before);
  documentActions.acceptReview();
  return true;
}

/* -------------------------------------------------------------------------- */
/* Blocks in the page's DOM. Each block's element has the block's id as its   */
/* `id`, which is what a link to a block points at.                           */
/* -------------------------------------------------------------------------- */

const REVIEW_ATTRIBUTE = "data-doc-review";
const TARGET_ATTRIBUTE = "data-doc-target";

/** How long the block a link points at stays marked. */
const TARGET_MARKED = 1600;

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The element of a block of the open page, by block id. Null when the page has no such block. */
export function getBlockElement(blockId: string): HTMLElement | null {
  const { editor } = mounted;
  if (!editor) return null;
  const key = editor
    .getEditorState()
    .read(() => $blockKeys(idsOf(editor)))
    .get(blockId);
  return key ? editor.getElementByKey(key) : null;
}

/**
 * Scrolls the open page to a block. `mark` tints the block for a moment, to
 * show where a link landed. Returns false when the page has no such block.
 */
export function scrollToBlock(
  blockId: string,
  options: { mark?: boolean } = {},
) {
  const element = getBlockElement(blockId);
  if (!element) return false;
  element.scrollIntoView({
    block: "start",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  if (options.mark) {
    element.setAttribute(TARGET_ATTRIBUTE, "");
    window.setTimeout(
      () => element.removeAttribute(TARGET_ATTRIBUTE),
      TARGET_MARKED,
    );
  }
  return true;
}

/** The address of a block: this page's address with `#<block id>`. */
export function getBlockLink(blockId: string) {
  const url = new URL(window.location.href);
  url.hash = blockId;
  return url.toString();
}

const linkedBlockId = () => {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
};

// The block the address pointed at when it was last followed, so that coming
// back to its page does not scroll there again.
let followedLink: string | null = null;

/**
 * Follows the `#<block id>` in the address: opens the page that holds the
 * block, and scrolls to it once that page's editor is mounted.
 */
function followBlockLink(again = false) {
  const blockId = linkedBlockId();
  if (!blockId || (!again && followedLink === blockId)) return;
  const state = documentStore.getState();
  const page = state.pages.find((item) =>
    item.content.blocks.some((block) => block.id === blockId),
  );
  if (!page) return;
  if (page.id !== state.currentPageId) {
    followedLink = null;
    documentActions.selectPage(page.id);
    return;
  }
  if (scrollToBlock(blockId, { mark: true })) followedLink = blockId;
}

export type Heading = { id: string; level: 1 | 2 | 3; text: string };

const NO_HEADINGS: readonly Heading[] = [];

const HEADING_LEVELS = { h1: 1, h2: 2, h3: 3 } as const;

function $readHeadings(ids: BlockIds): Heading[] {
  const headings: Heading[] = [];
  for (const { node, type } of $collectBlockNodes()) {
    if (type !== "h1" && type !== "h2" && type !== "h3") continue;
    const id = ids.get(node.getKey());
    const text = node.getTextContent().trim();
    if (id && text) headings.push({ id, level: HEADING_LEVELS[type], text });
  }
  return headings;
}

/**
 * The headings of the open page, in order, for the outline. Each `id` is the
 * block's id: pass it to `scrollToBlock` or `getBlockElement`. The list is
 * the same object until a heading changes.
 */
export function useHeadings(): readonly Heading[] {
  const editor = useActiveEditor();
  const [headings, setHeadings] = useState(NO_HEADINGS);

  useEffect(() => {
    if (!editor) return;
    const read = () => {
      const next = editor
        .getEditorState()
        .read(() => $readHeadings(idsOf(editor)));
      setHeadings((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    read();
    const unregister = editor.registerUpdateListener(read);
    return () => {
      unregister();
      setHeadings(NO_HEADINGS);
    };
  }, [editor]);

  return headings;
}

/* -------------------------------------------------------------------------- */
/* Painting the assistant's edit over the page while it streams.              */
/* -------------------------------------------------------------------------- */

const LIVE = "doc-live";
const LIVE_SOFT = "doc-live-soft";
const GHOST = "doc-ghost";
const STREAM_ATTRIBUTE = "data-doc-stream";

const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS;

// A block that holds only a <br> is empty; any other <br> is a line break,
// which the block's text counts as one character.
const isLineBreak = (node: Node) =>
  node.nodeName === "BR" && !!(node.previousSibling || node.nextSibling);

function textOf(root: HTMLElement) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data;
    else if (isLineBreak(node)) text += "\n";
  }
  return text;
}

function textRange(root: HTMLElement, start: number, end: number) {
  if (start >= end) return null;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      const next = offset + text.data.length;
      if (!started && start < next) {
        range.setStart(text, start - offset);
        started = true;
      }
      if (started && end <= next) {
        range.setEnd(text, end - offset);
        return range;
      }
      offset = next;
    } else if (isLineBreak(node)) {
      if (!started && start <= offset) {
        range.setStartBefore(node);
        started = true;
      }
      offset += 1;
      if (started && end <= offset) {
        range.setEndAfter(node);
        return range;
      }
    }
  }
  if (!started) return null;
  range.setEnd(root, root.childNodes.length);
  return range;
}

/** Where the last `count` words before `end` begin. */
function wordsBack(text: string, end: number, count: number) {
  let index = end;
  for (let word = 0; word < count && index > 0; word++) {
    while (index > 0 && /\s/.test(text[index - 1]!)) index--;
    while (index > 0 && !/\s/.test(text[index - 1]!)) index--;
  }
  return index;
}

const highlight = (name: string, range: Range | null) => {
  if (range) CSS.highlights.set(name, new Highlight(range));
  else CSS.highlights.delete(name);
};

/**
 * Draws the assistant's activity over the page without changing it: the
 * blocks it is working on dimmed, the live color on the words it has just
 * typed, the old text it has not overwritten yet faded, and a caret with the
 * assistant's name where it is writing. `writing` is the block it is writing
 * in, which is where the caret waits while nothing is being typed.
 */
function createStreamPainter(
  editor: LexicalEditor,
  ids: BlockIds,
  getCaret: () => HTMLElement | null,
) {
  let marked = new Map<HTMLElement, string>();
  let typingId: string | undefined;

  const paint = (marks: StreamMarks, writing: string | null = null) => {
    const keys = editor.getEditorState().read(() => $blockKeys(ids));
    const elementOf = (id: string) => {
      const key = keys.get(id);
      return key ? editor.getElementByKey(key) : null;
    };

    const wanted = new Map<HTMLElement, string>();
    for (const id of marks.working) {
      const element = elementOf(id);
      if (element) wanted.set(element, "working");
    }
    for (const id of marks.empty) {
      const element = elementOf(id);
      if (element) wanted.set(element, "empty");
    }
    for (const element of marked.keys()) {
      if (!wanted.has(element)) element.removeAttribute(STREAM_ATTRIBUTE);
    }
    for (const [element, kind] of wanted) {
      if (element.getAttribute(STREAM_ATTRIBUTE) !== kind) {
        element.setAttribute(STREAM_ATTRIBUTE, kind);
      }
    }
    marked = wanted;

    const typing = marks.typing;
    const typedIn = typing ? elementOf(typing.id) : null;
    let letter: DOMRect | undefined;
    if (typing && typedIn) {
      const { typed } = typing;
      if (typingId !== typing.id) {
        typingId = typing.id;
        typedIn.scrollIntoView({
          block: "nearest",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
      if (supportsHighlights()) {
        const text = textOf(typedIn);
        const fresh = wordsBack(text, typed, 2);
        const fading = wordsBack(text, fresh, 3);
        highlight(LIVE, textRange(typedIn, fresh, typed));
        highlight(LIVE_SOFT, textRange(typedIn, fading, fresh));
        highlight(GHOST, textRange(typedIn, typed, text.length));
      }
      const rects =
        typed > 0
          ? textRange(typedIn, typed - 1, typed)?.getClientRects()
          : undefined;
      letter = rects?.length ? rects[rects.length - 1] : undefined;
    } else {
      if (supportsHighlights()) {
        highlight(LIVE, null);
        highlight(LIVE_SOFT, null);
        highlight(GHOST, null);
      }
      typingId = undefined;
    }

    const caret = getCaret();
    if (!caret) return;
    const element = typedIn ?? (writing ? elementOf(writing) : null);
    const paper = caret.parentElement?.getBoundingClientRect();
    if (!element || !paper) {
      caret.hidden = true;
      return;
    }
    // A block that is arriving has the caret at its start, and a table, which
    // grows row by row, at its last row.
    const box = (
      element.querySelector(".doc-tr:last-child") ?? element
    ).getBoundingClientRect();
    const lineHeight =
      Number.parseFloat(getComputedStyle(element).lineHeight) || box.height;
    const left = letter ? letter.right : box.left;
    caret.hidden = false;
    caret.style.left = `${left - paper.left}px`;
    caret.style.top = `${(letter ? letter.top : box.top) - paper.top}px`;
    caret.style.height = `${letter ? letter.height : Math.min(lineHeight, box.height)}px`;
    // The name flag opens toward the side of the column that has room for it.
    const flag = caret.firstElementChild;
    caret.dataset["side"] =
      flag instanceof HTMLElement && left + flag.offsetWidth > paper.right
        ? "end"
        : "start";
  };

  const clear = () => paint({ working: [], empty: [] });

  return { paint, clear };
}

/* -------------------------------------------------------------------------- */
/* The bridge: the page and its comments as assistant-ui interactables.       */
/*                                                                            */
/* The model edits them with update_document and update_comments, the tools   */
/* assistant-ui builds from the schemas. What the user types is written to    */
/* the interactable; what the assistant writes there is typed into the page.  */
/* -------------------------------------------------------------------------- */

const SYNC_TAG = "document-sync";

/** Characters a second the assistant's text is typed at. */
const TYPING_SPEED = 150;
/** Seconds any amount of waiting text may take; longer edits type faster. */
const LONGEST_TYPING = 2;

/**
 * What an edit that ended without a result leaves on the page: the blocks the
 * assistant finished writing. A block of `before` it was still writing, or
 * had not reached, is put back as it was.
 */
function finishedBlocks(stream: Stream, before: readonly Block[]): Block[] {
  const old = new Map(before.map((block) => [block.id, block]));
  return stream.entries.flatMap((item) => {
    if (!item.arriving) return [item.next ?? item.page];
    const block = old.get(item.id);
    return block ? [block] : [];
  });
}

function DocumentBridge({
  page,
  caret,
  busy,
  settle,
}: {
  page: Page;
  caret: RefObject<HTMLElement | null>;
  busy: RefObject<boolean>;
  settle: RefObject<() => void>;
}) {
  const [editor] = useLexicalComposerContext();
  const ids = idsOf(editor);
  const [initialBlocks] = useState(() => {
    const state = editor.getEditorState();
    state.read(() => $adoptIds(page.content.blocks, ids));
    return state.read(() => $readBlocks(ids));
  });
  const [state, { setState }] = unstable_useInteractable(DOCUMENT_NAME, {
    id: page.id,
    description: documentDescription,
    stateSchema: documentSchema,
    initialState: { title: page.title, blocks: initialBlocks },
  });
  const blocks: readonly (Partial<Block> | undefined)[] = state.blocks;
  const title = typeof state.title === "string" ? state.title : page.title;

  const isRunning = useAuiState((s) => s.thread.isRunning);
  const inFlight = useAuiState((s) => {
    if (!s.thread.isRunning) return false;
    const last = s.thread.messages.at(-1);
    return (
      last?.role === "assistant" &&
      last.content.some(
        (part) =>
          part.type === "tool-call" &&
          part.toolName === UPDATE_DOCUMENT_TOOL &&
          part.result === undefined,
      )
    );
  });
  // The last edit ended without a result: it was stopped, or its call failed.
  const failed = useAuiState((s) => {
    const call = s.thread.messages
      .at(-1)
      ?.content.findLast(
        (part) =>
          part.type === "tool-call" && part.toolName === UPDATE_DOCUMENT_TOOL,
      );
    return (
      call?.type === "tool-call" &&
      (call.isError === true ||
        (call.result === undefined && !s.thread.isRunning))
    );
  });
  const [typing, setTyping] = useState(false);

  const stream = useRef(settled(initialBlocks));
  const inEditor = useRef<string | null>(JSON.stringify(initialBlocks));
  const adopted = useRef(false);
  const sameUndoStep = useRef(true);
  const wasRunning = useRef(isRunning);
  const wasInFlight = useRef(false);
  const beforeEdit = useRef<readonly Block[]>(initialBlocks);
  // The page as it was when the assistant's run began, or when its last edit
  // landed, to tell what the next edit changes.
  const landing = useRef<readonly Block[] | null>(null);
  const runStart = useRef<EditorState | null>(null);
  const reviewOpen = useRef(false);
  const frame = useRef(0);
  const [painter] = useState(() =>
    createStreamPainter(editor, ids, () => caret.current),
  );

  const show = useCallback(
    (atOnce = false) => {
      const display = displayBlocks(stream.current);
      const paint = () => {
        const blockId = writingBlockId(stream.current);
        painter.paint(streamMarks(stream.current), blockId);
        documentActions.setPresence(
          blockId ? { pageId: page.id, blockId } : null,
        );
      };
      const serialized = JSON.stringify(display);
      if (serialized === inEditor.current) {
        paint();
        return;
      }
      inEditor.current = serialized;
      editor.update(() => $writeBlocks(display, ids), {
        // A whole edit by the assistant is one undo step, not one per frame.
        tag: [
          SYNC_TAG,
          sameUndoStep.current ? HISTORY_MERGE_TAG : HISTORY_PUSH_TAG,
          SKIP_DOM_SELECTION_TAG,
          SKIP_SCROLL_INTO_VIEW_TAG,
        ],
        onUpdate: paint,
        ...(atOnce && ({ discrete: true } as const)),
      });
      sameUndoStep.current = true;
    },
    [editor, ids, page.id, painter],
  );

  // One review holds the edits of one run. The first edit of a later run
  // keeps the edit still waiting on this page, so Undo only ever takes back
  // what the assistant has just done.
  const openReview = useCallback(() => {
    if (reviewOpen.current) return;
    reviewOpen.current = true;
    if (runStart.current) reviewOrigins.set(editor, runStart.current);
    if (documentStore.getState().pendingReview?.pageId === page.id) {
      documentActions.acceptReview();
    }
  }, [editor, page.id]);

  // Once an edit by the assistant is whole on the page, the store is told
  // what the page was before it and what it is now. New blocks get their
  // lasting ids here, so a review can name them.
  const land = useCallback(() => {
    const before = landing.current;
    if (!before || stream.current.active) return;
    // The last frame of typing may still be waiting to be committed, and
    // `editor.read` commits it first.
    const after = editor.read(() => $readBlocks(ids));
    const serialized = JSON.stringify(after);
    landing.current = wasRunning.current ? after : null;
    if (serialized === JSON.stringify(before)) return;
    if (serialized !== inEditor.current) {
      inEditor.current = serialized;
      stream.current = settled(after);
      setState((previous) => ({ ...previous, blocks: after }));
    }
    if (!classifyEdit(before, after)) return;
    openReview();
    documentActions.recordEdit({ pageId: page.id, before, after });
  }, [editor, ids, openReview, page.id, setState]);

  const stopTyping = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    setTyping(false);
    // Typing that starts and ends in one frame never changes `typing`, so
    // the effect below would not run again to hand the editor back.
    if (!wasRunning.current) {
      editor.setEditable(true);
      busy.current = false;
    }
  }, [busy, editor]);

  const type = useCallback(() => {
    if (frame.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const seconds = Math.min(now - last, 100) / 1000;
      last = now;
      setTyping(true);
      const waiting = remaining(stream.current);
      if (waiting > 0) {
        const characters = prefersReducedMotion()
          ? waiting
          : Math.round(
              Math.max(TYPING_SPEED, waiting / LONGEST_TYPING) * seconds,
            );
        stream.current = advance(stream.current, Math.max(1, characters));
        show();
      }
      if (remaining(stream.current) > 0) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      stopTyping();
      land();
    };
    frame.current = requestAnimationFrame(step);
  }, [land, show, stopTyping]);

  // Leaving the page ends the writing at once, so that what is saved is never
  // half-written: an edit that has arrived is typed to its end, and one still
  // arriving is dropped, because its call cannot finish on a page that is gone.
  useEffect(() => {
    settle.current = () => {
      if (!stream.current.active) return;
      stream.current = stream.current.inFlight
        ? settled(beforeEdit.current)
        : advance(stream.current, remaining(stream.current));
      show(true);
      stopTyping();
      land();
    };
  }, [land, settle, show, stopTyping]);

  useEffect(() => {
    // Opening a page again would bring back the state the interactable kept
    // for it. The editor was loaded from what was saved, so that is set here,
    // after the interactable has registered.
    if (!adopted.current) {
      adopted.current = true;
      setState({ title: page.title, blocks: initialBlocks });
    }
    if (!wasRunning.current && isRunning) {
      reviewOpen.current = false;
      runStart.current = editor.getEditorState();
      if (!stream.current.active) sameUndoStep.current = false;
    }
    if (isRunning && !landing.current) {
      landing.current = stream.current.entries.map(
        (item) => item.next ?? item.page,
      );
    }
    wasRunning.current = isRunning;

    let incoming = blocks;
    if (inFlight && !wasInFlight.current) {
      beforeEdit.current = stream.current.entries.map(
        (item) => item.next ?? item.page,
      );
    } else if (wasInFlight.current && !inFlight && failed) {
      // The interactable holds the list as far as the call got, which lacks
      // every block the call had yet to repeat.
      const kept = finishedBlocks(stream.current, beforeEdit.current);
      incoming = kept;
      setState((previous) => ({ ...previous, blocks: kept }));
    }
    wasInFlight.current = inFlight;

    stream.current = receive(stream.current, incoming, inFlight);
    show();
    if (remaining(stream.current) > 0) type();
    else land();
  }, [
    blocks,
    editor,
    failed,
    inFlight,
    initialBlocks,
    isRunning,
    land,
    page.title,
    setState,
    show,
    type,
  ]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(SYNC_TAG)) return;
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        const read = editorState.read(() => $readBlocks(ids));
        const serialized = JSON.stringify(read);
        if (serialized === inEditor.current) return;
        inEditor.current = serialized;
        stream.current = settled(read);
        sameUndoStep.current = false;
        setState((previous) => ({ ...previous, blocks: read }));
        // A change by hand keeps the edit that waits for review. Undo would
        // otherwise take the person's own change back along with it.
        if (documentStore.getState().pendingReview?.pageId === page.id) {
          documentActions.acceptReview();
        }
      },
    );
  }, [editor, ids, page.id, setState]);

  // The title lives in the page list and in the interactable. Whichever one
  // changed last is copied to the other.
  const lastTitle = useRef(page.title);
  useEffect(() => {
    if (!adopted.current || title === page.title) {
      lastTitle.current = page.title;
      return;
    }
    if (page.title !== lastTitle.current) {
      lastTitle.current = page.title;
      setState((previous) => ({ ...previous, title: page.title }));
    } else {
      lastTitle.current = title;
      documentActions.renamePage(page.id, title);
    }
  }, [page.id, page.title, setState, title]);

  // Text can be waiting to be typed before the first frame marks it as typing.
  useEffect(() => {
    const working = isRunning || typing || remaining(stream.current) > 0;
    editor.setEditable(!working);
    busy.current = working;
  }, [busy, editor, isRunning, typing]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      painter.clear();
      documentActions.setPresence(null);
    };
  }, [painter]);

  return null;
}

function CommentsBridge({ pageId }: { pageId: string }) {
  const [editor] = useLexicalComposerContext();
  const threads = useDocumentStore((store) => store.threads);
  const derived = useMemo(
    () => threadsToComments(threads, pageId),
    [threads, pageId],
  );
  const [state, { setState }] = unstable_useInteractable(COMMENTS_NAME, {
    id: commentsIdOf(pageId),
    description: commentsDescription,
    stateSchema: commentsSchema,
    initialState: { comments: derived },
  });
  const comments: readonly (Partial<DocumentComment> | undefined)[] =
    state.comments;

  // The threads are the record. A change to them is copied to the list the
  // assistant reads.
  const serialized = JSON.stringify(derived);
  useEffect(() => {
    setState((previous) =>
      JSON.stringify(previous.comments) === serialized
        ? previous
        : { comments: JSON.parse(serialized) as DocumentComment[] },
    );
  }, [serialized, setState]);

  // What the assistant added to that list becomes threads, replies and
  // resolved flags.
  useEffect(() => {
    const store = documentStore.getState();
    const changes = commentChanges(store.threads, pageId, comments);
    let rejected = false;
    let left = false;
    for (const comment of changes.started) {
      if (!markQuote(editor, comment.quote, comment.id)) {
        rejected = true;
        continue;
      }
      left ||= comment.author === "assistant";
      documentActions.addThread({
        id: comment.id,
        markId: comment.id,
        pageId,
        quote: comment.quote,
        text: comment.text,
        author: comment.author,
        open: false,
      });
    }
    for (const { threadId, comment } of changes.replies) {
      documentActions.addThreadMessage(threadId, {
        id: comment.id,
        author: comment.author,
        text: comment.text,
      });
      left ||= comment.author === "assistant";
    }
    if (left) documentActions.recordComment(pageId);
    for (const change of changes.resolved) {
      documentActions.resolveThread(change.threadId, change.resolved);
    }
    // A comment on a passage the page does not hold has nowhere to show, so
    // it is taken back out of the list.
    if (rejected) {
      setState({
        comments: threadsToComments(documentStore.getState().threads, pageId),
      });
    }
  }, [comments, editor, pageId, setState]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Plugins.                                                                   */
/* -------------------------------------------------------------------------- */

const SAVE_DELAY = 400;

let pendingSave: (() => void) | null = null;

/** Saves the open page now, for an action that reads it from the store. */
export const saveOpenPage = () => pendingSave?.();

// Saves the page to the store a moment after it changes, and at once when the
// page is left. A save waits while the assistant is writing; leaving the page
// settles that writing first.
function SavePlugin({
  pageId,
  busy,
  settle,
}: {
  pageId: string;
  busy: RefObject<boolean>;
  settle: RefObject<() => void>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let timer = 0;
    let dirty = false;
    const write = () => {
      dirty = false;
      const state = editor.getEditorState();
      documentActions.setPageContent(pageId, {
        blocks: state.read(() => $readBlocks(idsOf(editor))),
        state: JSON.stringify(state.toJSON()),
      });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (busy.current) schedule();
        else if (dirty) write();
      }, SAVE_DELAY);
    };
    const flush = () => {
      window.clearTimeout(timer);
      if (dirty) write();
    };
    const unregister = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        dirty = true;
        schedule();
      },
    );
    const saveNow = () => {
      if (!busy.current) flush();
    };
    const leave = () => {
      settle.current();
      flush();
    };
    pendingSave = saveNow;
    window.addEventListener("pagehide", leave);
    return () => {
      if (pendingSave === saveNow) pendingSave = null;
      window.removeEventListener("pagehide", leave);
      leave();
      unregister();
    };
  }, [busy, editor, pageId, settle]);

  return null;
}

const SHORTCUTS: readonly [RegExp, BlockType][] = [
  [/^# $/, "h1"],
  [/^## $/, "h2"],
  [/^### $/, "h3"],
  [/^[-*] $/, "bullet"],
  [/^1\. $/, "numbered"],
  [/^\[ ?\] $/, "check"],
  [/^> $/, "quote"],
  [/^--- $/, "divider"],
];

// Typing "# ", "- ", "[] ", "> " or "--- " at the start of a text block turns
// it into that kind of block, and Arrow Up on the first line goes to the title.
function ShortcutsPlugin({
  titleRef,
}: {
  titleRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterTransform = editor.registerNodeTransform(
      TextNode,
      (node) => {
        const parent = node.getParent();
        if (
          !$isParagraphNode(parent) ||
          parent.getParent()?.getKey() !== "root" ||
          node.getPreviousSibling() ||
          node.getNextSibling()
        )
          return;
        const selection = $getSelection();
        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          selection.anchor.key !== node.getKey()
        )
          return;
        const text = node.getTextContent();
        const type = SHORTCUTS.find(([pattern]) => pattern.test(text))?.[1];
        if (!type || selection.anchor.offset !== text.length) return;
        node.remove();
        const { top, focus } = $createBlock(type);
        if (type === "divider") {
          parent.insertBefore(top);
          parent.selectStart();
          return;
        }
        parent.replace(top);
        focus?.selectStart();
      },
    );
    const unregisterArrow = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        const first = $collectBlockNodes()[0]?.node;
        const anchor = selection.anchor;
        if (
          !first ||
          $isTableNode(first) ||
          anchor.offset !== 0 ||
          $blockKeyOf(anchor.getNode()) !== first.getKey() ||
          ($isTextNode(anchor.getNode()) &&
            anchor.getNode().getPreviousSibling() !== null)
        ) {
          return false;
        }
        event?.preventDefault();
        titleRef.current?.focus();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterTransform();
      unregisterArrow();
    };
  }, [editor, titleRef]);

  return null;
}

/** The gap kept between the caret and the assistant bar that floats over it. */
const CARET_ROOM = 24;
const ASSISTANT_BAR = "[data-assistant-bar]";
/** Holds the page and the assistant bar, which sits outside the page's own frame. */
const DOCUMENT_FRAME = "[data-document-frame]";

// Lexical scrolls the caret to the edge of the page, which is under the
// assistant bar, so typing at the end of a page scrolls a little further.
function CaretRoomPlugin() {
  const [editor] = useLexicalComposerContext();
  const scroller = useEditorScroller();

  useEffect(() => {
    if (!scroller) return;
    return editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, tags }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        if (tags.has(SKIP_SCROLL_INTO_VIEW_TAG)) return;
        const selection = window.getSelection();
        const node = selection?.focusNode;
        if (!selection?.isCollapsed || !node) return;
        if (!editor.getRootElement()?.contains(node)) return;
        const range = selection.getRangeAt(0);
        const caret =
          range.getClientRects()[0] ??
          (node instanceof Element
            ? node
            : node.parentElement
          )?.getBoundingClientRect();
        const bar = scroller
          .closest(DOCUMENT_FRAME)
          ?.querySelector(ASSISTANT_BAR);
        if (!caret || !bar) return;
        const over =
          caret.bottom + CARET_ROOM - bar.getBoundingClientRect().top;
        if (over > 0) scroller.scrollTop += over;
      },
    );
  }, [editor, scroller]);

  return null;
}

function MountPlugin({ pageId }: { pageId: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    setMounted({ editor, pageId });
    return () => {
      if (mounted.editor === editor) setMounted({ editor: null, pageId: null });
    };
  }, [editor, pageId]);
  return null;
}

// A table's first row is its header, wherever a row is inserted or moved to.
function HeaderRowPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TableNode, (table) => {
      table.getChildren().forEach((row, index) => {
        if (!$isTableRowNode(row)) return;
        const state =
          index === 0
            ? TableCellHeaderStates.ROW
            : TableCellHeaderStates.NO_STATUS;
        for (const cell of row.getChildren()) {
          if ($isTableCellNode(cell) && cell.getHeaderStyles() !== state) {
            cell.setHeaderStyles(state);
          }
        }
      });
    });
  }, [editor]);

  return null;
}

// Gives each block's element the block's id, and marks the blocks an edit
// that waits for review changed. It registers after the bridge, which is
// what gives a new block its id.
function BlockDomPlugin({ pageId }: { pageId: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const ids = idsOf(editor);
    const stamp = () => {
      const review = documentStore.getState().pendingReview;
      const changed = new Set(review?.pageId === pageId ? review.changed : []);
      editor.getEditorState().read(() => {
        for (const { node } of $collectBlockNodes()) {
          const id = ids.get(node.getKey());
          const element = editor.getElementByKey(node.getKey());
          if (!id || !element) continue;
          if (!id.startsWith(STREAMING_ID) && element.id !== id) {
            element.id = id;
          }
          if (changed.has(id))
            element.setAttribute(REVIEW_ATTRIBUTE, "changed");
          else element.removeAttribute(REVIEW_ATTRIBUTE);
        }
      });
    };
    stamp();
    let review = documentStore.getState().pendingReview;
    const unsubscribe = documentStore.subscribe(() => {
      const next = documentStore.getState().pendingReview;
      if (next === review) return;
      review = next;
      stamp();
    });
    const unregister = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves }) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) stamp();
      },
    );
    return () => {
      unsubscribe();
      unregister();
    };
  }, [editor, pageId]);

  return null;
}

// Follows a link to a block: when the page opens, and when the address changes.
function BlockLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const frame = requestAnimationFrame(() => followBlockLink());
    const onHashChange = () => followBlockLink(true);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [editor]);

  return null;
}

const $isPageEmpty = () => {
  const root = $getRoot();
  const first = root.getFirstChild();
  return (
    root.getTextContentSize() === 0 &&
    root.getChildrenSize() <= 1 &&
    (first === null || $isParagraphNode(first))
  );
};

function useIsPageEmpty() {
  const [editor] = useLexicalComposerContext();
  return useSyncExternalStore(
    (onChange) => editor.registerUpdateListener(onChange),
    () => editor.getEditorState().read($isPageEmpty),
    () => true,
  );
}

/* -------------------------------------------------------------------------- */
/* The page: title, template chips on an empty page, and the body.            */
/* -------------------------------------------------------------------------- */

function TitleField({
  page,
  titleRef,
}: {
  page: Page;
  titleRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [editor] = useLexicalComposerContext();

  // Browsers without `field-sizing` grow the field to its text here.
  useEffect(() => {
    const field = titleRef.current;
    if (!field || CSS.supports("field-sizing", "content")) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [page.title, titleRef]);

  const toBody = () => {
    editor.update(() => {
      $getRoot().selectStart();
    });
    editor.focus();
  };

  return (
    <textarea
      ref={titleRef}
      rows={1}
      value={page.title}
      placeholder="Untitled"
      aria-label="Page title"
      spellCheck={false}
      className="doc-title"
      onChange={(event) =>
        documentActions.renamePage(
          page.id,
          event.target.value.replace(/\n/g, " "),
        )
      }
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" || event.key === "ArrowDown") {
          event.preventDefault();
          toBody();
        }
      }}
    />
  );
}

function TemplateChips({ page }: { page: Page }) {
  const [editor] = useLexicalComposerContext();

  const apply = (template: Template) => {
    if (!page.title.trim()) documentActions.renamePage(page.id, template.title);
    replaceBlocks(
      editor,
      template.blocks.map((block, index) => ({
        ...block,
        id: `${mintBlockId()}-${index}`,
      })),
    );
    editor.focus();
  };

  return (
    <div
      role="group"
      aria-label="Start from a template"
      className="mt-5 flex flex-wrap gap-2"
    >
      {TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className={chipClass}
          onClick={() => apply(template)}
        >
          <span data-tint={template.color} className="flex">
            <Icon {...glyphFor(template.icon)} />
          </span>
          {template.label}
        </button>
      ))}
    </div>
  );
}

const PLACEHOLDER = "Write something, or type / for blocks";

function PageBody({
  page,
  caret,
}: {
  page: Page;
  caret: RefObject<HTMLSpanElement | null>;
}) {
  const empty = useIsPageEmpty();
  const editable = useIsEditable();

  return (
    <>
      {empty && editable ? <TemplateChips page={page} /> : null}
      <div className="relative mt-5">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label="Page content"
              aria-placeholder={PLACEHOLDER}
              placeholder={<div className="doc-placeholder">{PLACEHOLDER}</div>}
              className="doc-body"
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <span ref={caret} aria-hidden hidden className="doc-stream-caret">
          <AssistantFlag />
        </span>
      </div>
    </>
  );
}

function EditorSurface({ page }: { page: Page }) {
  const caret = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const settle = useRef(() => {});
  const [initialConfig] = useState<InitialConfigType>(() => {
    const saved = usableState(page.content.state);
    return {
      namespace: "document-editor",
      theme: editorTheme,
      nodes: EDITOR_NODES,
      editorState:
        saved ??
        ((editor) => {
          $writeBlocks(page.content.blocks, idsOf(editor));
        }),
      onError: (error) => {
        console.error("[document-editor]", error);
      },
    };
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PageIcon />
      <TitleField page={page} titleRef={titleRef} />
      <PageBody page={page} caret={caret} />
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <TablePlugin
        hasCellMerge={false}
        hasCellBackgroundColor={false}
        hasHorizontalScroll
      />
      <HeaderRowPlugin />
      <ShortcutsPlugin titleRef={titleRef} />
      <MountPlugin pageId={page.id} />
      <CaretRoomPlugin />
      <DocumentBridge page={page} caret={caret} busy={busy} settle={settle} />
      <CommentsBridge pageId={page.id} />
      <SavePlugin pageId={page.id} busy={busy} settle={settle} />
      <BlockDomPlugin pageId={page.id} />
      <BlockLinkPlugin />
      <SelectionToolbar />
      <SlashMenu />
      <BlockHandle />
      <TableControls />
      <CommentMarks />
      <EditReview />
    </LexicalComposer>
  );
}

/**
 * The page: a Lexical editor for the open page, remounted when another page
 * opens so each page has its own undo history. It renders once the saved
 * pages are read, which is after hydration.
 */
export function Editor() {
  const hydrated = useHydrated();
  const page = useCurrentPage();
  const setScroller = useCallback((element: HTMLDivElement | null) => {
    setMounted({ scroller: element });
  }, []);
  const setAnchor = useCallback((element: HTMLDivElement | null) => {
    setMounted({ anchor: element });
  }, []);

  // A page opens at its top, not where the page before it was left.
  useLayoutEffect(() => {
    mounted.scroller?.scrollTo({ top: 0 });
  }, [page.id]);

  return (
    <div
      ref={setScroller}
      className="doc-scroll h-full [scrollbar-gutter:stable_both-edges] overflow-y-auto"
    >
      <div
        ref={setAnchor}
        className="relative mx-auto w-full max-w-[calc(720px+7rem)] px-5 pt-24 pb-[max(18rem,calc(var(--assistant-bar-height,0px)+6rem))] sm:px-14 sm:pt-32"
      >
        {hydrated ? <EditorSurface key={page.id} page={page} /> : null}
      </div>
    </div>
  );
}
