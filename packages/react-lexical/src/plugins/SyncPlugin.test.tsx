/**
 * @vitest-environment jsdom
 */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
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
  let current = text;
  const runtime = {
    getState: () => ({ text: current }),
    subscribe: () => () => {},
  };

  return {
    composer: {
      __internal_getRuntime: () => runtime,
      setText: vi.fn((next: string) => {
        current = next;
      }),
    },
  };
};

const readEditorText = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

const $getParagraph = () => {
  const paragraph = $getRoot().getFirstChild();
  if (paragraph === null) throw new Error("Expected a paragraph");
  return paragraph;
};

const createBracketFormatter = (
  labelForId: (id: string) => string = (id) => id,
): Unstable_DirectiveFormatter => ({
  serialize: (item) => `[[${item.id}]]`,
  parse: (text) => {
    const segments: ReturnType<Unstable_DirectiveFormatter["parse"]>[number][] =
      [];
    const pattern = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > lastIndex) {
        segments.push({
          kind: "text",
          text: text.slice(lastIndex, match.index),
        });
      }
      const id = match[1]!;
      segments.push({
        kind: "mention",
        type: "user",
        id,
        label: labelForId(id),
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      segments.push({ kind: "text", text: text.slice(lastIndex) });
    }
    return segments;
  },
});

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

  it("reparses a restored draft when a formatter registers", async () => {
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
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]");
    await act(async () => {
      render(false);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $isTextNode($getParagraph().getFirstChild())),
    ).toBe(true);

    await act(async () => {
      render(true);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $isDirectiveNode($getParagraph().getFirstChild())),
    ).toBe(true);
    expect(mocks.aui.composer.setText).not.toHaveBeenCalled();
  });

  it("still reparses after the caret moves", async () => {
    const initialConfig = {
      namespace: "sync-plugin-selection-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("hello [[alice]] world");
    await act(async () => {
      render(false);
    });
    await act(async () => {
      editor.update(() => {
        const textNode = $getParagraph().getFirstChild();
        if (!$isTextNode(textNode)) throw new Error("Expected text");
        textNode.select(3, 3);
      });
    });

    await act(async () => {
      render(true);
    });
    expect(
      editor.getEditorState().read(() => {
        const children = $getParagraph().getChildren();
        return [
          $isTextNode(children[0]) ? children[0].getTextContent() : null,
          $isDirectiveNode(children[1]),
          $isTextNode(children[2]) ? children[2].getTextContent() : null,
        ];
      }),
    ).toEqual(["hello ", true, " world"]);
    expect(
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return null;
        }
        const node = selection.anchor.getNode();
        return $isTextNode(node)
          ? [node.getTextContent(), selection.anchor.offset]
          : null;
      }),
    ).toEqual(["hello ", 3]);
  });

  it("does not reparse text the user edited before a formatter registers", async () => {
    const initialConfig = {
      namespace: "sync-plugin-edit-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("hello");
    await act(async () => {
      render(false);
    });
    await act(async () => {
      editor.update(() => {
        const paragraph = $getParagraph();
        const textNode = $createTextNode("[[alice]]");
        paragraph.clear();
        paragraph.append(textNode);
        textNode.selectEnd();
      });
    });
    expect(mocks.aui.composer.setText).toHaveBeenLastCalledWith("[[alice]]");

    await act(async () => {
      render(true);
    });
    expect(readEditorText(editor)).toBe("[[alice]]");
    expect(
      editor
        .getEditorState()
        .read(() => $isTextNode($getParagraph().getFirstChild())),
    ).toBe(true);
  });

  it("does not reparse while the editor is composing", async () => {
    const initialConfig = {
      namespace: "sync-plugin-compose-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]");
    await act(async () => {
      render(false);
    });
    await act(async () => {
      editor.update(() => {
        const textNode = $getParagraph().getFirstChild();
        if (!$isTextNode(textNode)) throw new Error("Expected text");
        $setCompositionKey(textNode.getKey());
      });
    });
    expect(editor.isComposing()).toBe(true);

    await act(async () => {
      render(true);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $isTextNode($getParagraph().getFirstChild())),
    ).toBe(true);

    await act(async () => {
      editor.update(() => {
        $setCompositionKey(null);
      });
    });
    expect(
      editor
        .getEditorState()
        .read(() => $isDirectiveNode($getParagraph().getFirstChild())),
    ).toBe(true);
  });

  it("keeps chips when the formatter that created them is removed", async () => {
    const initialConfig = {
      namespace: "sync-plugin-remove-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]");
    await act(async () => {
      render(true);
    });
    const before = editor.getEditorState().read(() => {
      const node = $getParagraph().getFirstChild();
      if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
      return node.getKey();
    });

    await act(async () => {
      render(false);
    });
    expect(
      editor.getEditorState().read(() => {
        const node = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
        return node.getKey();
      }),
    ).toBe(before);
  });

  it("keeps mixed-format chips when one formatter is removed", async () => {
    const initialConfig = {
      namespace: "sync-plugin-mixed-remove-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]\n:user[bob]");
    await act(async () => {
      render(true);
    });
    const before = editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      if (!$isElementNode(first) || !$isElementNode(second)) {
        throw new Error("Expected two paragraphs");
      }
      const alice = first.getFirstChild();
      const bob = second.getFirstChild();
      if (!$isDirectiveNode(alice) || !$isDirectiveNode(bob)) {
        throw new Error("Expected mixed-format chips");
      }
      return { alice: alice.getKey(), bob: bob.getKey() };
    });

    await act(async () => {
      render(false);
    });
    expect(
      editor.getEditorState().read(() => {
        const [first, second] = $getRoot().getChildren();
        if (!$isElementNode(first) || !$isElementNode(second)) {
          throw new Error("Expected two paragraphs");
        }
        const alice = first.getFirstChild();
        const bob = second.getFirstChild();
        if (!$isDirectiveNode(alice) || !$isDirectiveNode(bob)) {
          throw new Error("Expected chips to remain");
        }
        return { alice: alice.getKey(), bob: bob.getKey() };
      }),
    ).toEqual(before);
  });

  it("keeps same-key chips when a formatter would drop one occurrence", async () => {
    const initialConfig = {
      namespace: "sync-plugin-same-key-remove-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]\n:user[alice]");
    await act(async () => {
      render(true);
    });
    const before = editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      if (!$isElementNode(first) || !$isElementNode(second)) {
        throw new Error("Expected two paragraphs");
      }
      const firstChip = first.getFirstChild();
      const secondChip = second.getFirstChild();
      if (!$isDirectiveNode(firstChip) || !$isDirectiveNode(secondChip)) {
        throw new Error("Expected same-key chips");
      }
      return { first: firstChip.getKey(), second: secondChip.getKey() };
    });

    await act(async () => {
      render(false);
    });
    expect(
      editor.getEditorState().read(() => {
        const [first, second] = $getRoot().getChildren();
        if (!$isElementNode(first) || !$isElementNode(second)) {
          throw new Error("Expected two paragraphs");
        }
        const firstChip = first.getFirstChild();
        const secondChip = second.getFirstChild();
        if (!$isDirectiveNode(firstChip) || !$isDirectiveNode(secondChip)) {
          throw new Error("Expected chips to remain");
        }
        return { first: firstChip.getKey(), second: secondChip.getKey() };
      }),
    ).toEqual(before);
  });

  it("keeps hydrated metadata when a formatter only changes the label", async () => {
    const initialConfig = {
      namespace: "sync-plugin-metadata-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = (labelForId: (id: string) => string) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={createBracketFormatter(labelForId)} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("[[alice]]");
    await act(async () => {
      render((id) => id);
    });
    await act(async () => {
      editor.update(() => {
        const node = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
        node.replace(
          $createDirectiveNode(
            {
              ...node.getDirectiveItem(),
              description: "Project owner",
              metadata: { workspace: "acme" },
            },
            node.getDirectiveText(),
          ),
        );
      });
    });

    await act(async () => {
      render(() => "Alice");
    });
    expect(
      editor.getEditorState().read(() => {
        const node = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
        return node.getDirectiveItem();
      }),
    ).toEqual({
      id: "alice",
      type: "user",
      label: "Alice",
      description: "Project owner",
      metadata: { workspace: "acme" },
    });
  });
});
