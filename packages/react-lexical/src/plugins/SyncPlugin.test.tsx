/**
 * @vitest-environment jsdom
 */
import { act, useEffect, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HistoryExtension } from "@lexical/history";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  defineExtension,
  HISTORY_PUSH_TAG,
  REDO_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  TextNode,
  UNDO_COMMAND,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderCounter } from "@assistant-ui/x-performance";
import { getClientId, type AssistantClientAccessor } from "@assistant-ui/store";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { createClientAccessor } from "../../../store/dist/utils/client-accessor.js";
import {
  $createDirectiveNode,
  $isDirectiveNode,
  DirectiveNode,
} from "../nodes/DirectiveNode";
import { SyncPlugin } from "./SyncPlugin";

const mocks = vi.hoisted(() => ({
  aui: undefined as unknown as ReturnType<typeof createAui>,
  threadId: undefined as string | undefined,
}));

type MockAssistantState = {
  composer: { text: string };
  optional: { threads?: { mainThreadId: string } };
};

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mocks.aui,
    useAuiState: <T,>(selector: (s: MockAssistantState) => T) => {
      const subscribe = (listener: () => void) =>
        mocks.aui.subscribeState?.(listener) ?? (() => {});
      const getSnapshot = () =>
        selector({
          composer: mocks.aui.composer.getState(),
          optional:
            mocks.threadId === undefined
              ? {}
              : { threads: { mainThreadId: mocks.threadId } },
        });
      return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const composerMeta = {
  name: "composer",
  source: "root",
  query: {},
} as const;

const createComposerAccessor = <
  T extends {
    getState: () => { text: string };
    setText: (text: string) => void;
  },
>(
  client: T,
) =>
  createClientAccessor(
    composerMeta,
    () => client as never,
  ) as AssistantClientAccessor<"composer"> & Pick<T, "setText">;

const createAui = (text: string) => {
  let current = text;
  const sourceListeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...sourceListeners]) listener();
  };
  const composerClient = {
    getState: () => ({ text: current }),
    setText: vi.fn((next: string) => {
      current = next;
      notify();
    }),
  };

  return {
    optional: {},
    composer: createComposerAccessor(composerClient),
    subscribe: () => () => {},
    subscribeState: (listener: () => void) =>
      subscribeTo(sourceListeners, listener),
  };
};

const subscribeTo = (listeners: Set<() => void>, listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const createSwitchableAui = (text: string, threadId: string) => {
  const state = { text, threadId };
  const sourceListeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...sourceListeners]) listener();
  };
  const composerClient = {
    getState: () => ({ text: state.text }),
    setText: vi.fn((next: string) => {
      state.text = next;
      notify();
    }),
  };
  mocks.threadId = threadId;
  return {
    aui: {
      optional: {
        threads: { getState: () => ({ mainThreadId: state.threadId }) },
      },
      composer: createComposerAccessor(composerClient),
      subscribe: () => () => {},
      subscribeState: (listener: () => void) =>
        subscribeTo(sourceListeners, listener),
    },
    getText: () => state.text,
    notifyText(next: string) {
      state.text = next;
      notify();
    },
    commitThread(next: string) {
      state.threadId = next;
      mocks.threadId = next;
    },
  };
};

const readEditorText = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

const $getParagraph = () => {
  const paragraph = $getRoot().getFirstChild();
  if (!$isElementNode(paragraph)) throw new Error("Expected a paragraph");
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
    mocks.threadId = undefined;
  });

  it("clears the editor when switching to a composer with an empty draft", async () => {
    const extension = defineExtension({
      name: "sync-plugin-test",
      namespace: "sync-plugin-test",
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = () =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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

  it("does not restore the previous composer when switching to a populated draft", async () => {
    const extension = defineExtension({
      name: "sync-populated-history",
      namespace: "sync-populated-history",
      dependencies: [HistoryExtension],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = () =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
      );

    mocks.aui = createAui("thread A draft");
    await act(async () => {
      render();
    });
    await act(async () => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode("thread A private draft"),
              ),
            );
          $getRoot().selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    });

    const nextAui = createAui("thread B populated draft");
    mocks.aui = nextAui;
    await act(async () => {
      render();
    });
    expect(readEditorText(editor)).toBe("thread B populated draft");

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readEditorText(editor)).toBe("thread B populated draft");
    expect(nextAui.composer.getState().text).toBe("thread B populated draft");
  });

  it("resets history when switched composers have equal text", async () => {
    const extension = defineExtension({
      name: "sync-equal-history",
      namespace: "sync-equal-history",
      dependencies: [HistoryExtension],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = () =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
      );

    mocks.aui = createAui("thread A private draft");
    await act(async () => {
      render();
    });
    await act(async () => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createTextNode("shared draft")),
            );
          $getRoot().selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    });
    expect(readEditorText(editor)).toBe("shared draft");

    const nextAui = createAui("shared draft");
    mocks.aui = nextAui;
    await act(async () => {
      render();
    });

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readEditorText(editor)).toBe("shared draft");
    expect(nextAui.composer.getState().text).toBe("shared draft");
  });

  describe("when the thread id commits after the composer notified", () => {
    const typeDraft = (text: string) =>
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode(text)));
          $getRoot().selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );

    const mountSwitchable = async (name: string) => {
      const extension = defineExtension({
        name,
        namespace: name,
        dependencies: [HistoryExtension],
      });
      const switchable = createSwitchableAui("thread A draft", "thread-a");
      mocks.aui = switchable.aui as unknown as typeof mocks.aui;
      const render = () =>
        root.render(
          <LexicalExtensionComposer
            extension={extension}
            contentEditable={null}
          >
            <SyncPlugin />
            <EditorProbe
              capture={(value) => {
                editor = value;
              }}
            />
          </LexicalExtensionComposer>,
        );
      await act(async () => {
        render();
      });
      await act(async () => {
        typeDraft("thread A private draft");
      });
      await act(async () => {
        switchable.notifyText("thread B draft");
      });
      expect(readEditorText(editor)).toBe("thread B draft");
      switchable.commitThread("thread-b");
      await act(async () => {
        render();
      });
      return switchable;
    };

    it("does not restore the previous thread on undo", async () => {
      const switchable = await mountSwitchable("sync-thread-commit-undo");

      await act(async () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });

      expect(readEditorText(editor)).toBe("thread B draft");
      expect(switchable.getText()).toBe("thread B draft");
    });

    it("keeps the new thread's own history across a later store notification", async () => {
      const switchable = await mountSwitchable("sync-thread-commit-history");
      await act(async () => {
        typeDraft("thread B first");
      });
      await act(async () => {
        typeDraft("thread B second");
      });

      await act(async () => {
        switchable.notifyText("thread B external");
      });
      expect(readEditorText(editor)).toBe("thread B external");

      for (const expected of [
        "thread B second",
        "thread B first",
        "thread B draft",
        "thread B draft",
      ]) {
        await act(async () => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        });
        expect(readEditorText(editor)).toBe(expected);
      }
      expect(switchable.getText()).toBe("thread B draft");
    });
  });

  it("adds no text-node reads for selection-only updates in a 1,000-paragraph draft", async () => {
    const counter = createRenderCounter();
    const extension = defineExtension({
      name: "selection-work",
      namespace: "selection-work",
    });
    for (const withSync of [false, true]) {
      const aui = createAui("");
      mocks.aui = aui;
      await act(async () => {
        root.render(
          <LexicalExtensionComposer
            key={String(withSync)}
            extension={extension}
            contentEditable={null}
          >
            <EditorProbe
              capture={(value) => {
                editor = value;
              }}
            />
            {withSync && <SyncPlugin />}
          </LexicalExtensionComposer>,
        );
      });
      let last!: TextNode;
      await act(async () => {
        editor.update(
          () => {
            $getRoot().clear();
            for (let i = 0; i < 1_000; i++) {
              last = $createTextNode("paragraph text");
              $getRoot().append($createParagraphNode().append(last));
            }
            last.select(1, 1);
          },
          { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
        );
      });
      aui.composer.setText.mockClear();
      const getText = TextNode.prototype.getTextContent;
      const reads = vi
        .spyOn(TextNode.prototype, "getTextContent")
        .mockImplementation(function (this: TextNode) {
          counter.useRender(withSync ? "sync" : "control");
          return getText.call(this);
        });
      try {
        await act(async () => {
          editor.update(() => last.select(2, 2), {
            discrete: true,
            tag: SKIP_DOM_SELECTION_TAG,
          });
        });
        expect(aui.composer.setText).not.toHaveBeenCalled();
      } finally {
        reads.mockRestore();
      }
    }
    // The control accounts for Lexical's own development-mode text reads.
    expect(counter.renders("control")).toBeGreaterThan(0);
    expect(counter.renders("sync") - counter.renders("control")).toBe(0);
  });

  it("synchronizes content edits, saved states, undo and redo", async () => {
    const aui = createAui("hello");
    mocks.aui = aui;
    const extension = defineExtension({
      name: "sync-history",
      namespace: "sync-history",
      dependencies: [HistoryExtension],
    });
    await act(async () => {
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe
            capture={(value) => {
              editor = value;
            }}
          />
        </LexicalExtensionComposer>,
      );
    });
    const before = editor.getEditorState();
    await act(async () => {
      editor.update(
        () => {
          const paragraph = $getParagraph();
          const text = paragraph.getFirstChild();
          if (!$isTextNode(text)) throw new Error("Expected text");
          text.setTextContent("hello!");
          $getRoot().append($createParagraphNode());
          text.selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    });
    expect(aui.composer.setText).toHaveBeenLastCalledWith("hello!\n", {
      origin: "user",
    });
    const after = editor.getEditorState();
    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(aui.composer.setText).toHaveBeenLastCalledWith("hello", {
      origin: "user",
    });
    await act(async () => {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    });
    expect(aui.composer.setText).toHaveBeenLastCalledWith("hello!\n", {
      origin: "user",
    });
    await act(async () => {
      editor.setEditorState(before, { tag: SKIP_DOM_SELECTION_TAG });
    });
    expect(aui.composer.setText).toHaveBeenLastCalledWith("hello", {
      origin: "user",
    });
    await act(async () => {
      editor.setEditorState(after, { tag: SKIP_DOM_SELECTION_TAG });
    });
    expect(aui.composer.setText).toHaveBeenLastCalledWith("hello!\n", {
      origin: "user",
    });
  });

  it("retries a deferred parser on a clean selection update after composition", async () => {
    mocks.aui = createAui("[[alice]]");
    const formatter = createBracketFormatter();
    const extension = defineExtension({
      name: "parser-clean-update",
      namespace: "parser-clean-update",
      nodes: [DirectiveNode],
    });
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe
            capture={(value) => {
              editor = value;
            }}
          />
        </LexicalExtensionComposer>,
      );
    await act(async () => {
      render(false);
    });
    const composing = vi.spyOn(editor, "isComposing").mockReturnValue(true);
    await act(async () => {
      render(true);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $isTextNode($getParagraph().getFirstChild())),
    ).toBe(true);
    composing.mockReturnValue(false);
    const selectionTag = "selection-only-parser-retry";
    const cleanUpdates: boolean[] = [];
    const unregister = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(selectionTag)) {
          cleanUpdates.push(dirtyElements.size === 0 && dirtyLeaves.size === 0);
        }
      },
    );
    try {
      await act(async () => {
        editor.update(
          () => {
            const text = $getParagraph().getFirstChild();
            if (!$isTextNode(text)) throw new Error("Expected text");
            text.select(1, 1);
          },
          { discrete: true, tag: [SKIP_DOM_SELECTION_TAG, selectionTag] },
        );
      });
      expect(cleanUpdates).toEqual([true]);
      expect(
        editor
          .getEditorState()
          .read(() => $isDirectiveNode($getParagraph().getFirstChild())),
      ).toBe(true);
    } finally {
      unregister();
    }
  });

  it("reparses a restored draft when a formatter registers", async () => {
    const extension = defineExtension({
      name: "sync-plugin-formatter-test",
      namespace: "sync-plugin-formatter-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-selection-test",
      namespace: "sync-plugin-selection-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-edit-test",
      namespace: "sync-plugin-edit-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    expect(mocks.aui.composer.setText).toHaveBeenLastCalledWith("[[alice]]", {
      origin: "user",
    });

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
    const extension = defineExtension({
      name: "sync-plugin-compose-test",
      namespace: "sync-plugin-compose-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-remove-test",
      namespace: "sync-plugin-remove-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-mixed-remove-test",
      namespace: "sync-plugin-mixed-remove-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-same-key-remove-test",
      namespace: "sync-plugin-same-key-remove-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={registered ? formatter : undefined} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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
    const extension = defineExtension({
      name: "sync-plugin-metadata-test",
      namespace: "sync-plugin-metadata-test",
      nodes: [DirectiveNode],
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const render = (labelForId: (id: string) => string) =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin formatter={createBracketFormatter(labelForId)} />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
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

  it("preserves leading blank lines through an editor readback", async () => {
    const extension = defineExtension({
      name: "sync-plugin-test",
      namespace: "sync-plugin-test",
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const aui = createAui("\nhello");
    mocks.aui = aui;
    await act(async () => {
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
      );
    });
    expect(
      editor.getEditorState().read(() => $getRoot().getChildrenSize()),
    ).toBe(2);

    await act(async () => {
      editor.update(() => {
        const lastParagraph = $getRoot().getLastChild();
        if (!$isElementNode(lastParagraph)) throw new Error("no paragraph");
        lastParagraph.append($createTextNode("!"));
      });
    });

    expect(aui.composer.setText).toHaveBeenLastCalledWith("\nhello!", {
      origin: "user",
    });
  });

  it("preserves multiple leading blank lines", async () => {
    const extension = defineExtension({
      name: "sync-plugin-test",
      namespace: "sync-plugin-test",
    });
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const aui = createAui("\n\nx");
    mocks.aui = aui;
    await act(async () => {
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe capture={capture} />
        </LexicalExtensionComposer>,
      );
    });

    await act(async () => {
      editor.update(() => {
        const lastParagraph = $getRoot().getLastChild();
        if (!$isElementNode(lastParagraph)) throw new Error("no paragraph");
        lastParagraph.append($createTextNode("!"));
      });
    });

    expect(aui.composer.setText).toHaveBeenLastCalledWith("\n\nx!", {
      origin: "user",
    });
  });

  it("preserves undo history when the store recreates an accessor for the same composer", async () => {
    let text = "hello";
    const composerClient = {
      getState: () => ({ text }),
      setText: vi.fn((next: string) => {
        text = next;
      }),
    };
    const createStoreAui = () => ({
      optional: {},
      composer: createComposerAccessor(composerClient),
      subscribe: () => () => {},
    });
    const extension = defineExtension({
      name: "sync-accessor-identity",
      namespace: "sync-accessor-identity",
      dependencies: [HistoryExtension],
    });
    const render = () =>
      root.render(
        <LexicalExtensionComposer extension={extension} contentEditable={null}>
          <SyncPlugin />
          <EditorProbe
            capture={(value) => {
              editor = value;
            }}
          />
        </LexicalExtensionComposer>,
      );

    const firstAui = createStoreAui();
    mocks.aui = firstAui as unknown as ReturnType<typeof createAui>;
    await act(async () => render());
    await act(async () => {
      editor.update(
        () => {
          const textNode = $getParagraph().getFirstChild();
          if (!$isTextNode(textNode)) throw new Error("Expected text");
          textNode.setTextContent("hello!");
          $getRoot().selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    });

    const secondAui = createStoreAui();
    expect(secondAui.composer).not.toBe(firstAui.composer);
    expect(getClientId(secondAui.composer)).toBe(
      getClientId(firstAui.composer),
    );
    expect(secondAui.composer.getState().text).toBe(
      firstAui.composer.getState().text,
    );
    expect(secondAui.composer.setText).toBe(firstAui.composer.setText);
    mocks.aui = secondAui as unknown as ReturnType<typeof createAui>;
    await act(async () => render());

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readEditorText(editor)).toBe("hello");
  });
});
