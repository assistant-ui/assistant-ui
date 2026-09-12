/** @vitest-environment jsdom */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
  type TextNode,
} from "lexical";
import { LexicalComposerInput } from "./LexicalComposerInput";

const { setCursorPosition, registry, aui } = vi.hoisted(() => {
  const setCursorPosition = vi.fn<(position: number) => void>();
  return {
    setCursorPosition,
    registry: {
      getPlugins: () => [{ setCursorPosition, handleKeyDown: () => false }],
      registerInput: () => () => {},
    },
    aui: { composer: { setText: () => {} }, on: () => () => {} },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => aui,
  useAuiState: () => false,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...actual,
    INTERNAL: {
      ...actual.INTERNAL,
      useComposerInputPluginRegistryOptional: () => registry,
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function EditorProbe({
  onEditor,
}: {
  onEditor: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => onEditor(editor), [editor, onEditor]);
  return null;
}

describe("LexicalComposerInput cursor tracking", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;
  let textNode: TextNode;

  const update = async (callback: () => void) => {
    await act(async () => {
      editor.update(callback, { discrete: true, tag: SKIP_DOM_SELECTION_TAG });
    });
  };

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <LexicalComposerInput>
          <EditorProbe
            onEditor={(value) => {
              editor = value;
            }}
          />
        </LexicalComposerInput>,
      );
    });
    await update(() => {
      $getRoot().clear();
      textNode = $createTextNode("@help");
      $getRoot().append($createParagraphNode().append(textNode));
      textNode.select(5, 5);
    });
    expect(setCursorPosition).toHaveBeenLastCalledWith(5);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("restores the cursor after a range selection collapses at the same anchor", async () => {
    await update(() => textNode.select(2, 5));
    expect(setCursorPosition).toHaveBeenLastCalledWith(0);
    await update(() => textNode.select(5, 5));
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection) && selection.isCollapsed()).toBe(
        true,
      );
    });
    expect(setCursorPosition).toHaveBeenLastCalledWith(5);
  });

  it("restores the cursor after the editor loses its selection", async () => {
    await update(() => $setSelection(null));
    expect(setCursorPosition).toHaveBeenLastCalledWith(0);
    await update(() => textNode.select(5, 5));
    expect(setCursorPosition).toHaveBeenLastCalledWith(5);
  });

  it("recalculates the absolute cursor after earlier text changes", async () => {
    let earlier: TextNode;
    await update(() => {
      earlier = $createTextNode("a");
      $getRoot()
        .getFirstChildOrThrow()
        .insertBefore($createParagraphNode().append(earlier));
      textNode.select(3, 3);
    });
    expect(setCursorPosition).toHaveBeenLastCalledWith(5);
    await update(() => {
      earlier.setTextContent("abcdef");
      textNode.select(3, 3);
    });
    expect(setCursorPosition).toHaveBeenLastCalledWith(10);
  });

  it("recalculates the absolute cursor after an earlier paragraph is inserted", async () => {
    await update(() => {
      $getRoot().getFirstChildOrThrow().insertBefore($createParagraphNode());
      textNode.select(5, 5);
    });
    expect(setCursorPosition).toHaveBeenLastCalledWith(6);
  });

  it("does not rebroadcast an unchanged caret on a clean selection-only update", async () => {
    const calls = setCursorPosition.mock.calls.length;
    await update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const next = selection.clone();
        next.format = next.format === 0 ? 1 : 0;
        $setSelection(next);
      }
    });
    expect(setCursorPosition.mock.calls.length).toBe(calls);
  });
});
