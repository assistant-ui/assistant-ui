/**
 * @vitest-environment jsdom
 */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import {
  $createDirectiveNode,
  $isDirectiveNode,
  DirectiveNode,
} from "../nodes/DirectiveNode";
import { SyncPlugin } from "./SyncPlugin";

const mocks = vi.hoisted(() => ({
  aui: undefined as unknown,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mocks.aui,
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const createAui = (text: string) => {
  const runtime = {
    getState: () => ({ text }),
    subscribe: () => () => {},
  };

  return {
    composer: {
      __internal_getRuntime: () => runtime,
      setText: vi.fn(),
    },
  };
};

const readEditorText = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

function EditorProbe({
  capture,
}: {
  capture: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    capture(editor);
  }, [capture, editor]);

  return null;
}

describe("SyncPlugin", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("clears the editor when switching to a composer with an empty draft", async () => {
    const initialConfig = {
      namespace: "sync-plugin-test",
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = () =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("");
    await act(async () => {
      render();
    });
    expect(editor.getEditorState().read(() => $getSelection())).toBeNull();

    await act(async () => {
      render({
        serialize: (item) => `[[${item.id}]]`,
        parse: (text) => [{ kind: "text", text }],
      });
    });
    expect(editor.getEditorState().read(() => $getSelection())).toBeNull();

    mocks.aui = createAui("draft from thread A");
    await act(async () => {
      render();
    });
    expect(readEditorText(editor)).toBe("draft from thread A");

    mocks.aui = createAui("");
    await act(async () => {
      render();
    });

    expect(readEditorText(editor)).toBe("");
  });

  it("reparses the current draft when the formatter changes", async () => {
    const initialConfig = {
      namespace: "sync-plugin-formatter-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[[${item.id}]]`,
      parse: (text) => {
        const id = text === "[[team]]" ? "team" : "alice";
        return text === "[[team]]" || text === "[[alice]]"
          ? [
              {
                kind: "mention" as const,
                type: id === "team" ? "group" : "person",
                id,
                label: id === "team" ? "Team" : "Alice",
              },
            ]
          : [{ kind: "text" as const, text }];
      },
    };
    const plainTextFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => item.label,
      parse: (text) => [{ kind: "text", text }],
    };
    const render = (currentFormatter?: Unstable_DirectiveFormatter) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={currentFormatter} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[team]]\n[[alice]]");
    await act(async () => {
      render();
    });
    await act(async () => {
      editor.update(() => {
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode("[[alice]]");
        paragraph.append(
          $createTextNode("[[team]]"),
          $createLineBreakNode(),
          textNode,
        );
        const lexicalRoot = $getRoot();
        lexicalRoot.clear();
        lexicalRoot.append(paragraph);
        textNode.select(4, 4);
      });
    });
    const before = editor.getEditorState().read(() => {
      const textNode = $getRoot().getFirstChild()?.getLastChild();
      const selection = $getSelection();
      if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
        throw new Error("Expected a text selection");
      }
      return { key: textNode.getKey(), offset: selection.anchor.offset };
    });

    await act(async () => {
      render(plainTextFormatter);
    });
    expect(
      editor.getEditorState().read(() => {
        const textNode = $getRoot().getFirstChild()?.getLastChild();
        const selection = $getSelection();
        if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
          throw new Error("Expected a text selection");
        }
        return { key: textNode.getKey(), offset: selection.anchor.offset };
      }),
    ).toEqual(before);

    await act(async () => {
      editor.update(() => {
        const team = $getRoot().getFirstChild()?.getFirstChild();
        if (!$isTextNode(team)) throw new Error("Expected team text");
        team.replace(
          $createDirectiveNode(
            {
              id: "team",
              type: "group",
              label: "Old Team",
              description: "Engineering",
              metadata: { workspace: "acme" },
            },
            "[[team]]",
          ),
        );
      });
      render(formatter);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $getRoot().getChildAtIndex(1)?.getFirstChild()?.getType()),
    ).toBe("directive");
    expect(
      editor.getEditorState().read(() => {
        const node = $getRoot().getFirstChild()?.getFirstChild();
        if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
        return node.getDirectiveItem();
      }),
    ).toEqual({
      id: "team",
      type: "group",
      label: "Team",
      description: "Engineering",
      metadata: { workspace: "acme" },
    });
    expect(mocks.aui.composer.setText).not.toHaveBeenCalled();
  });
});
