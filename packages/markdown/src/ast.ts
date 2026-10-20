/** The zero-based source lines a block spans, `end` exclusive. */
export type LineRange = {
  start: number;
  end: number;
};

export type RootNode = {
  type: "root";
  children: BlockNode[];
};

export type ParagraphNode = {
  type: "paragraph";
  children: InlineNode[];
  lines: LineRange;
};

export type HeadingNode = {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
  lines: LineRange;
};

export type ThematicBreakNode = {
  type: "thematicBreak";
  lines: LineRange;
};

export type BlockquoteNode = {
  type: "blockquote";
  children: BlockNode[];
  lines: LineRange;
};

export type ListNode = {
  type: "list";
  ordered: boolean;
  /** The number of the first item, present on an ordered list. */
  start?: number;
  /** A tight list renders the paragraphs of its items without paragraph wrappers. */
  tight: boolean;
  children: ListItemNode[];
  lines: LineRange;
};

export type ListItemNode = {
  type: "listItem";
  /** Present on a task list item, whose marker is removed from its first paragraph. */
  checked?: boolean;
  children: BlockNode[];
  lines: LineRange;
};

export type CodeBlockNode = {
  type: "codeBlock";
  /** The first word of a fenced block's info string. */
  lang?: string;
  /** The rest of a fenced block's info string. */
  meta?: string;
  value: string;
  lines: LineRange;
};

export type MathBlockNode = {
  type: "mathBlock";
  /** The TeX source between the delimiters. */
  value: string;
  lines: LineRange;
};

export type HtmlBlockNode = {
  type: "htmlBlock";
  value: string;
  lines: LineRange;
};

export type TableAlign = "left" | "center" | "right" | null;

export type TableNode = {
  type: "table";
  /** The alignment of each column. */
  align: TableAlign[];
  /** The header row followed by the body rows. */
  children: TableRowNode[];
  lines: LineRange;
};

export type TableRowNode = {
  type: "tableRow";
  children: TableCellNode[];
  lines: LineRange;
};

export type TableCellNode = {
  type: "tableCell";
  children: InlineNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type EmphasisNode = {
  type: "emphasis";
  children: InlineNode[];
};

export type StrongNode = {
  type: "strong";
  children: InlineNode[];
};

export type StrikethroughNode = {
  type: "strikethrough";
  children: InlineNode[];
};

export type CodeSpanNode = {
  type: "codeSpan";
  value: string;
};

export type MathInlineNode = {
  type: "mathInline";
  /** The TeX source between the delimiters. */
  value: string;
  /** Written with `$$` or `\[`, so it renders in display style inside the line. */
  display: boolean;
};

export type LinkNode = {
  type: "link";
  url: string;
  title?: string;
  children: InlineNode[];
};

export type ImageNode = {
  type: "image";
  url: string;
  title?: string;
  /** The plain text of the image description. */
  alt: string;
};

export type HtmlInlineNode = {
  type: "htmlInline";
  value: string;
};

export type HardBreakNode = {
  type: "hardBreak";
};

export type SoftBreakNode = {
  type: "softBreak";
};

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ThematicBreakNode
  | BlockquoteNode
  | ListNode
  | CodeBlockNode
  | MathBlockNode
  | HtmlBlockNode
  | TableNode;

export type InlineNode =
  | TextNode
  | EmphasisNode
  | StrongNode
  | StrikethroughNode
  | CodeSpanNode
  | MathInlineNode
  | LinkNode
  | ImageNode
  | HtmlInlineNode
  | HardBreakNode
  | SoftBreakNode;

export type MarkdownNode =
  | RootNode
  | BlockNode
  | ListItemNode
  | TableRowNode
  | TableCellNode
  | InlineNode;
