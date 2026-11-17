import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { $readBlocks, $writeBlocks, type BlockIds } from "../../lib/blocks";
import { setTextStyle } from "./editor-commands";

describe("setTextStyle", () => {
  it("keeps the id of a block when it turns into another kind of block", () => {
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
    const ids: BlockIds = new Map();
    editor.update(
      () => {
        $writeBlocks(
          [
            { id: "b1", type: "paragraph", text: "Commented passage" },
            { id: "b2", type: "paragraph", text: "Left alone" },
          ],
          ids,
        );
        $getRoot().getFirstChildOrThrow().selectStart();
      },
      { discrete: true },
    );

    setTextStyle(editor, "h2", ids);
    editor.update(() => {}, { discrete: true });

    const blocks = editor.read(() => $readBlocks(ids, () => "minted"));
    expect(blocks).toEqual([
      { id: "b1", type: "h2", text: "Commented passage" },
      { id: "b2", type: "paragraph", text: "Left alone" },
    ]);
  });
});
