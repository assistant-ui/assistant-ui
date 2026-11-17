import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode, registerList } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { $readBlocks, $writeBlocks, type BlockIds } from "../../lib/blocks";
import { setTextStyle, toggleList } from "./editor-commands";

const BLOCKS = [
  { id: "b1", type: "paragraph" as const, text: "Commented passage" },
  { id: "b2", type: "paragraph" as const, text: "Left alone" },
];

function editorWith(ids: BlockIds) {
  const editor = createEditor({
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
  registerList(editor);
  editor.update(
    () => {
      $writeBlocks(BLOCKS, ids);
      $getRoot().getFirstChildOrThrow().selectStart();
    },
    { discrete: true },
  );
  return editor;
}

const typesAndIds = (
  editor: ReturnType<typeof createEditor>,
  ids: BlockIds,
) => {
  editor.update(() => {}, { discrete: true });
  return editor
    .read(() => $readBlocks(ids, () => "minted"))
    .map(({ id, type }) => `${id}:${type}`);
};

describe("restyling a block", () => {
  it("keeps its id when it turns into a heading", () => {
    const ids: BlockIds = new Map();
    const editor = editorWith(ids);

    setTextStyle(editor, "h2", ids);

    expect(typesAndIds(editor, ids)).toEqual(["b1:h2", "b2:paragraph"]);
  });

  it("keeps its id into a list and back out of it", () => {
    const ids: BlockIds = new Map();
    const editor = editorWith(ids);

    toggleList(editor, "bullet", ids);
    expect(typesAndIds(editor, ids)).toEqual(["b1:bullet", "b2:paragraph"]);

    toggleList(editor, "bullet", ids);
    expect(typesAndIds(editor, ids)).toEqual(["b1:paragraph", "b2:paragraph"]);
  });

  it("keeps its id from a list item to a heading", () => {
    const ids: BlockIds = new Map();
    const editor = editorWith(ids);

    toggleList(editor, "number", ids);
    typesAndIds(editor, ids);
    setTextStyle(editor, "h3", ids);

    expect(typesAndIds(editor, ids)).toEqual(["b1:h3", "b2:paragraph"]);
  });
});
