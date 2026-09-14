import { describe, expect, it } from "vitest";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  createEditor,
} from "lexical";
import { $getCollapsedRuntimeOffset } from "./runtimeOffset";
import { $createDirectiveNode, DirectiveNode } from "./nodes/DirectiveNode";

describe("collapsed runtime offsets", () => {
  it("uses serialized child lengths and one newline between paragraphs", () => {
    const editor = createEditor({
      nodes: [DirectiveNode],
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        const directive = $createDirectiveNode({
          id: "alice",
          type: "user",
          label: "Alice",
        });
        const paragraph = $createParagraphNode().append(
          $createTextNode("hi"),
          $createLineBreakNode(),
          directive,
        );
        const lastText = $createTextNode("tail");
        $getRoot().append(
          $createParagraphNode(),
          paragraph,
          $createParagraphNode().append(lastText),
        );
        const prefixLength = 1;
        for (const [childIndex, offset] of [
          [0, prefixLength],
          [1, prefixLength + 2],
          [2, prefixLength + 3],
          [3, prefixLength + 3 + directive.getTextContent().length],
        ] as const) {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraph.getKey(), childIndex, "element");
          selection.focus.set(paragraph.getKey(), childIndex, "element");
          $setSelection(selection);
          expect($getCollapsedRuntimeOffset()).toBe(offset);
        }
        lastText.select(2, 2);
        expect($getCollapsedRuntimeOffset()).toBe(
          prefixLength + 3 + directive.getTextContent().length + 1 + 2,
        );
        lastText.select(0, 2);
        expect($getCollapsedRuntimeOffset()).toBeUndefined();
        $setSelection(null);
        expect($getCollapsedRuntimeOffset()).toBeUndefined();
      },
      { discrete: true },
    );
  });
});
