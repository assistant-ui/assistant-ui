import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  LINK,
  ORDERED_LIST,
  QUOTE,
  TEXT_FORMAT_TRANSFORMERS,
  UNORDERED_LIST,
  type Transformer,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

/** The node types the editor renders; each one has a transformer below. */
export const DOCUMENT_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
];

/** The Markdown the editor reads, writes, and turns into formatting as you type. */
export const DOCUMENT_TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  ...TEXT_FORMAT_TRANSFORMERS,
  LINK,
];

export const $setMarkdown = (markdown: string) =>
  $convertFromMarkdownString(markdown, DOCUMENT_TRANSFORMERS);

export const $getMarkdown = () =>
  $convertToMarkdownString(DOCUMENT_TRANSFORMERS);
