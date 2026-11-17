import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $createParagraphNode, $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import {
  $readBlocks,
  $writeBlocks,
  type BlockIds,
  blockToMarkdown,
  parseInline,
  plainText,
  serializeInline,
} from "./blocks";
import type { Block } from "./document-state";

describe("parseInline", () => {
  it("reads bold, italic, code and links", () => {
    expect(parseInline("a **b** *c* `d` [e](https://x.dev) ***f***")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", code: true },
      { text: " " },
      { text: "e", href: "https://x.dev" },
      { text: " " },
      { text: "f", bold: true, italic: true },
    ]);
  });

  it("reads emphasis nested inside emphasis", () => {
    expect(parseInline("**bold with *italic* inside**")).toEqual([
      { text: "bold with ", bold: true },
      { text: "italic", bold: true, italic: true },
      { text: " inside", bold: true },
    ]);
    expect(parseInline("**bold then *italic***")).toEqual([
      { text: "bold then ", bold: true },
      { text: "italic", bold: true, italic: true },
    ]);
    expect(parseInline("*italic with **bold** inside*")).toEqual([
      { text: "italic with ", italic: true },
      { text: "bold", bold: true, italic: true },
      { text: " inside", italic: true },
    ]);
  });

  it("reads strikethrough, underline and highlight", () => {
    expect(
      parseInline("~~old~~ <u>new</u> <mark>**key** point</mark>"),
    ).toEqual([
      { text: "old", strike: true },
      { text: " " },
      { text: "new", underline: true },
      { text: " " },
      { text: "key", highlight: true, bold: true },
      { text: " point", highlight: true },
    ]);
  });

  it("leaves unclosed and spaced markers as text", () => {
    expect(parseInline("a **b")).toEqual([{ text: "a **b" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ text: "2 * 3 * 4" }]);
    expect(parseInline("snake_case_name")).toEqual([
      { text: "snake_case_name" },
    ]);
  });

  it("drops the backslash from an escaped marker", () => {
    expect(parseInline("5 \\* 3 and \\[x\\]")).toEqual([
      { text: "5 * 3 and [x\\]" },
    ]);
  });
});

describe("serializeInline", () => {
  it("round trips formatted runs that touch each other", () => {
    const cases = [
      [
        { text: "a", italic: true },
        { text: "b", bold: true },
      ],
      [
        { text: "a", bold: true },
        { text: "b", italic: true },
      ],
      [
        { text: "a", bold: true, italic: true },
        { text: "b", bold: true },
      ],
      [
        { text: "a", italic: true },
        { text: "b", bold: true, italic: true },
      ],
      [{ text: "plain " }, { text: "code", code: true, bold: true }],
      [
        { text: "a", strike: true },
        { text: "b", underline: true, highlight: true },
        { text: "c", bold: true, italic: true, strike: true },
      ],
      [
        { text: "see " },
        { text: "the ", href: "https://x.dev" },
        { text: "docs", href: "https://x.dev", bold: true },
        { text: "." },
      ],
    ];
    for (const runs of cases) {
      expect(parseInline(serializeInline(runs))).toEqual(runs);
    }
  });

  it("keeps spaces outside the markers and escapes literal markers", () => {
    expect(serializeInline([{ text: " hi ", bold: true }])).toBe(" **hi** ");
    const literal = [{ text: "2 * 3 [x] `y` \\z ~~ <u> a < b ~ c" }];
    expect(parseInline(serializeInline(literal))).toEqual(literal);
  });

  it("round trips struck, underlined and highlighted text that holds its own markers", () => {
    for (const runs of [
      [{ text: "about ~", strike: true }],
      [{ text: "a ~~ b", strike: true }],
      [{ text: "x </u> y", underline: true }],
      [{ text: "x </mark> y", highlight: true }],
    ]) {
      expect(parseInline(serializeInline(runs))).toEqual(runs);
    }
  });
});

describe("plainText", () => {
  it("strips the markers", () => {
    expect(plainText("**Week 1:** private *beta*")).toBe(
      "Week 1: private beta",
    );
  });
});

describe("blockToMarkdown", () => {
  it("puts the block type back as a markdown prefix", () => {
    expect(blockToMarkdown({ type: "h2", text: "Risks" })).toBe("## Risks");
    expect(blockToMarkdown({ type: "bullet", text: "**one**" })).toBe(
      "- **one**",
    );
    expect(blockToMarkdown({ text: "still streaming" })).toBe(
      "still streaming",
    );
  });
});

const makeEditor = () =>
  createEditor({
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      HorizontalRuleNode,
    ],
    onError: (error) => {
      throw error;
    },
  });

const BLOCKS: Block[] = [
  { id: "b1", type: "h1", text: "Title" },
  {
    id: "b2",
    type: "paragraph",
    text: "Some **bold** and a [link](https://x.dev).",
  },
  { id: "b3", type: "bullet", text: "one" },
  { id: "b4", type: "bullet", text: "two" },
  { id: "b5", type: "numbered", text: "first" },
  { id: "b6", type: "quote", text: "*quoted*" },
  { id: "b7", type: "divider", text: "" },
  { id: "b8", type: "paragraph", text: "~~cut~~ and <u>kept</u>" },
];

describe("blocks in the editor", () => {
  const write = (
    editor: ReturnType<typeof makeEditor>,
    blocks: readonly Partial<Block>[],
    ids: BlockIds,
  ) => editor.update(() => $writeBlocks(blocks, ids), { discrete: true });

  const read = (editor: ReturnType<typeof makeEditor>, ids: BlockIds) =>
    editor.getEditorState().read(() => $readBlocks(ids, () => "minted"));

  it("reads back the blocks it wrote, with their ids", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    expect(read(editor, ids)).toEqual(BLOCKS);
  });

  it("patches a changed block without replacing the others", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    const keysBefore = editor
      .getEditorState()
      .read(() => $getRoot().getChildrenKeys());

    const edited = BLOCKS.map((block) =>
      block.id === "b2" ? { ...block, text: "Rewritten." } : block,
    );
    write(editor, edited, ids);

    expect(read(editor, ids)).toEqual(edited);
    expect(
      editor.getEditorState().read(() => $getRoot().getChildrenKeys()),
    ).toEqual(keysBefore);
  });

  it("turns a paragraph into a heading in place", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    const edited = BLOCKS.map((block) =>
      block.id === "b2" ? { ...block, type: "h2" as const } : block,
    );
    write(editor, edited, ids);
    expect(read(editor, ids)).toEqual(edited);
  });

  it("turns a paragraph into a divider", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    const edited = BLOCKS.map((block) =>
      block.id === "b2"
        ? { ...block, type: "divider" as const, text: "" }
        : block,
    );
    write(editor, edited, ids);
    expect(read(editor, ids)).toEqual(edited);
  });

  it("rebuilds when blocks are inserted, removed or reordered", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    const next: Block[] = [
      BLOCKS[0]!,
      { id: "n1", type: "paragraph", text: "Inserted." },
      BLOCKS[3]!,
      BLOCKS[2]!,
    ];
    write(editor, next, ids);
    expect(read(editor, ids)).toEqual(next);
  });

  it("accepts a block that is still streaming in, then adopts its id", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS, ids);
    write(editor, [...BLOCKS, { text: "Half a sen" }], ids);
    const done = [
      ...BLOCKS,
      { id: "b9", type: "paragraph" as const, text: "Half a sentence." },
    ];
    write(editor, done, ids);
    expect(read(editor, ids)).toEqual(done);
  });

  it("gives a new id to a block the user added", () => {
    const editor = makeEditor();
    const ids: BlockIds = new Map();
    write(editor, BLOCKS.slice(0, 2), ids);
    editor.update(
      () => {
        const [, paragraph] = $getRoot().getChildren();
        paragraph!.insertAfter($createParagraphNode());
      },
      { discrete: true },
    );
    expect(read(editor, ids).map((block) => block.id)).toEqual([
      "b1",
      "b2",
      "minted",
    ]);
  });
});
