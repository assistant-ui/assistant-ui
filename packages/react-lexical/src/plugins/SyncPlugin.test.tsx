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
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import {
  ComposerPrimitive,
  unstable_useTriggerPopoverRootContext,
  type Unstable_RegisteredTrigger,
} from "@assistant-ui/react";
import {
  $createDirectiveNode,
  $isDirectiveNode,
  DirectiveNode,
} from "../nodes/DirectiveNode";
import { SyncPlugin } from "./SyncPlugin";

const mocks = vi.hoisted(() => ({
  aui: undefined as unknown as ReturnType<typeof createAui>,
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
  let currentText = text;
  const runtime = {
    getState: () => ({ text: currentText }),
    subscribe: () => () => {},
  };

  return {
    composer: {
      __internal_getRuntime: () => runtime,
      setText: vi.fn((nextText: string) => {
        currentText = nextText;
      }),
    },
  };
};

const readEditorText = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

function $getParagraph(index = 0) {
  const paragraph = $getRoot().getChildAtIndex(index);
  if (!$isElementNode(paragraph)) throw new Error("Expected a paragraph");
  return paragraph;
}

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

function TriggerFormatterRegistration({
  formatter,
}: {
  formatter: Unstable_DirectiveFormatter | undefined;
}) {
  const triggerRoot = unstable_useTriggerPopoverRootContext();

  useEffect(() => {
    if (!formatter) return undefined;
    return triggerRoot.register({
      char: "@",
      behavior: { kind: "directive", formatter },
      resource: {} as Unstable_RegisteredTrigger["resource"],
    });
  }, [formatter, triggerRoot]);

  return null;
}

const triggerEditorConfig = {
  namespace: "sync-plugin-trigger-test",
  nodes: [DirectiveNode],
  onError: (error: Error) => {
    throw error;
  },
};

function TriggerSyncEditor({
  formatter,
  capture,
}: {
  formatter: Unstable_DirectiveFormatter | undefined;
  capture: (editor: LexicalEditor) => void;
}) {
  return (
    <ComposerPrimitive.Unstable_TriggerPopoverRoot>
      <LexicalComposer initialConfig={triggerEditorConfig}>
        <SyncPlugin />
        <EditorProbe capture={capture} />
        <TriggerFormatterRegistration formatter={formatter} />
      </LexicalComposer>
    </ComposerPrimitive.Unstable_TriggerPopoverRoot>
  );
}

const createBracketFormatter = (): Unstable_DirectiveFormatter => ({
  serialize: (item) => `[[${item.id}]]`,
  parse: (text) => {
    const match = /^\[\[(.+)\]\]$/.exec(text);
    if (!match) return [{ kind: "text", text }];
    const id = match[1]!;
    return [
      {
        kind: "mention",
        type: id === "team" ? "group" : "person",
        id,
        label: id === "team" ? "Team" : "Alice",
      },
    ];
  },
});

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
    const render = (formatter?: Unstable_DirectiveFormatter) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={formatter} />
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

  it("reparses a restored draft when a trigger formatter registers", async () => {
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <TriggerSyncEditor
          formatter={registered ? formatter : undefined}
          capture={capture}
        />,
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

    await act(async () => {
      editor.update(() => {
        const directive = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(directive)) {
          throw new Error("Expected a directive");
        }
        directive.replace(
          $createDirectiveNode(
            {
              ...directive.getDirectiveItem(),
              description: "Project owner",
              metadata: { workspace: "acme" },
            },
            directive.getDirectiveText(),
          ),
        );
      });
    });
    const beforeUnregister = editor.getEditorState().read(() => {
      const directive = $getParagraph().getFirstChild();
      if (!$isDirectiveNode(directive)) {
        throw new Error("Expected a directive");
      }
      return {
        key: directive.getKey(),
        item: directive.getDirectiveItem(),
      };
    });

    await act(async () => {
      render(false);
    });
    expect(
      editor.getEditorState().read(() => {
        const directive = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(directive)) {
          throw new Error("Expected a directive");
        }
        return {
          key: directive.getKey(),
          item: directive.getDirectiveItem(),
        };
      }),
    ).toEqual(beforeUnregister);
    expect(mocks.aui.composer.setText).not.toHaveBeenCalled();
  });

  it("does not reparse text edited before a trigger formatter registers", async () => {
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <TriggerSyncEditor
          formatter={registered ? formatter : undefined}
          capture={capture}
        />,
      );

    mocks.aui = createAui("draft");
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
        $setCompositionKey(textNode.getKey());
      });
    });
    const beforeRegistration = editor.getEditorState().read(() => {
      const textNode = $getParagraph().getFirstChild();
      if (!$isTextNode(textNode)) throw new Error("Expected text");
      return { key: textNode.getKey(), isComposing: editor.isComposing() };
    });
    expect(beforeRegistration.isComposing).toBe(true);
    expect(mocks.aui.composer.setText).toHaveBeenLastCalledWith("[[alice]]");

    await act(async () => {
      render(true);
    });
    expect(
      editor.getEditorState().read(() => {
        const textNode = $getParagraph().getFirstChild();
        if (!$isTextNode(textNode)) throw new Error("Expected text");
        return { key: textNode.getKey(), isComposing: editor.isComposing() };
      }),
    ).toEqual(beforeRegistration);
  });

  it("does not reparse after the selection moves", async () => {
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <TriggerSyncEditor
          formatter={registered ? formatter : undefined}
          capture={capture}
        />,
      );

    mocks.aui = createAui("[[alice]]");
    await act(async () => {
      render(false);
    });
    await act(async () => {
      editor.update(() => {
        const textNode = $getParagraph().getFirstChild();
        if (!$isTextNode(textNode)) throw new Error("Expected text");
        textNode.select(2, 2);
      });
    });
    const beforeRegistration = editor.getEditorState().read(() => {
      const textNode = $getParagraph().getFirstChild();
      const selection = $getSelection();
      if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
        throw new Error("Expected a text selection");
      }
      return { key: textNode.getKey(), offset: selection.anchor.offset };
    });

    await act(async () => {
      render(true);
    });
    expect(
      editor.getEditorState().read(() => {
        const textNode = $getParagraph().getFirstChild();
        const selection = $getSelection();
        if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
          throw new Error("Expected a text selection");
        }
        return { key: textNode.getKey(), offset: selection.anchor.offset };
      }),
    ).toEqual(beforeRegistration);
  });

  it("preserves state when a formatter keeps the parsed structure", async () => {
    const initialConfig = {
      namespace: "sync-plugin-formatter-state-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
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

    mocks.aui = createAui("@team\n@team");
    await act(async () => {
      render();
    });
    await act(async () => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode("@team");
          paragraph.append(
            $createTextNode("@team"),
            $createLineBreakNode(),
            textNode,
          );
          const lexicalRoot = $getRoot();
          lexicalRoot.clear();
          lexicalRoot.append(paragraph);
          textNode.select(4, 4);
        },
        { tag: "aui-sync" },
      );
    });
    const before = editor.getEditorState().read(() => {
      const textNode = $getParagraph().getLastChild();
      const selection = $getSelection();
      if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
        throw new Error("Expected a text selection");
      }
      return {
        key: textNode.getKey(),
        offset: selection.anchor.offset,
      };
    });

    await act(async () => {
      render(plainTextFormatter);
    });
    expect(
      editor.getEditorState().read(() => {
        const textNode = $getParagraph().getLastChild();
        const selection = $getSelection();
        if (!$isTextNode(textNode) || !$isRangeSelection(selection)) {
          throw new Error("Expected a text selection");
        }
        return {
          key: textNode.getKey(),
          offset: selection.anchor.offset,
        };
      }),
    ).toEqual(before);
  });

  it("normalizes line breaks without selecting an unfocused editor", async () => {
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const formatter = createBracketFormatter();
    const render = (registered: boolean) =>
      root.render(
        <TriggerSyncEditor
          formatter={registered ? formatter : undefined}
          capture={capture}
        />,
      );

    mocks.aui = createAui("[[alice]]\nrest");
    await act(async () => {
      render(false);
    });
    await act(async () => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const firstText = $createTextNode("[[alice]]");
          paragraph.append(
            firstText,
            $createLineBreakNode(),
            $createTextNode("rest"),
          );
          const lexicalRoot = $getRoot();
          lexicalRoot.clear();
          lexicalRoot.append(paragraph);
          $setSelection(null);
        },
        { tag: "aui-sync" },
      );
    });

    let reparseTags: ReadonlySet<string> | undefined;
    const unregister = editor.registerUpdateListener(({ tags }) => {
      reparseTags = tags;
    });

    await act(async () => {
      render(true);
    });
    unregister();
    expect(
      editor.getEditorState().read(() => {
        const lexicalRoot = $getRoot();
        const directive = $getParagraph().getFirstChild();
        const trailingText = $getParagraph(1).getFirstChild();
        const selection = $getSelection();
        if (!$isDirectiveNode(directive) || !$isTextNode(trailingText)) {
          throw new Error("Expected normalized content");
        }
        return {
          paragraphCount: lexicalRoot.getChildren().length,
          directiveText: directive.getDirectiveText(),
          trailingText: trailingText.getTextContent(),
          selection,
        };
      }),
    ).toEqual({
      paragraphCount: 2,
      directiveText: "[[alice]]",
      trailingText: "rest",
      selection: null,
    });
    expect(reparseTags?.has(SKIP_DOM_SELECTION_TAG)).toBe(true);
  });

  it("preserves duplicate metadata when formatter syntax changes", async () => {
    const initialConfig = {
      namespace: "sync-plugin-formatter-metadata-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const parseTeam: Unstable_DirectiveFormatter["parse"] = (text) =>
      text === "@team"
        ? [
            {
              kind: "mention",
              type: "group",
              id: "team",
              label: "Team",
            },
          ]
        : [{ kind: "text", text }];
    const oldFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `@${item.id}`,
      parse: parseTeam,
    };
    const newFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[[${item.id}]]`,
      parse: parseTeam,
    };
    const render = (formatter: Unstable_DirectiveFormatter) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={formatter} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("@team\n@team");
    await act(async () => {
      render(oldFormatter);
    });

    await act(async () => {
      editor.update(
        () => {
          for (const [index, description] of [
            "First occurrence",
            "Second occurrence",
          ].entries()) {
            const team = $getParagraph(index).getFirstChild();
            if (!$isDirectiveNode(team))
              throw new Error("Expected a directive");
            team.replace(
              $createDirectiveNode(
                {
                  id: "team",
                  type: "group",
                  label: team.getDirectiveItem().label,
                  description,
                  metadata: { order: index + 1 },
                },
                "@team",
              ),
            );
          }
        },
        { tag: "aui-sync" },
      );
      render(newFormatter);
    });
    expect(
      editor
        .getEditorState()
        .read(() => $getParagraph(1).getFirstChild()?.getType()),
    ).toBe("directive");
    expect(
      editor.getEditorState().read(() => {
        return [0, 1].map((index) => {
          const node = $getParagraph(index).getFirstChild();
          if (!$isDirectiveNode(node)) {
            throw new Error("Expected a directive");
          }
          return {
            item: node.getDirectiveItem(),
            text: node.getDirectiveText(),
          };
        });
      }),
    ).toEqual([
      {
        item: {
          id: "team",
          type: "group",
          label: "Team",
          description: "First occurrence",
          metadata: { order: 1 },
        },
        text: "[[team]]",
      },
      {
        item: {
          id: "team",
          type: "group",
          label: "Team",
          description: "Second occurrence",
          metadata: { order: 2 },
        },
        text: "[[team]]",
      },
    ]);
    expect(mocks.aui.composer.setText).not.toHaveBeenCalled();

    mocks.aui = createAui("@team");
    await act(async () => {
      render(newFormatter);
    });
    expect(
      editor.getEditorState().read(() => {
        const node = $getParagraph().getFirstChild();
        if (!$isDirectiveNode(node)) throw new Error("Expected a directive");
        return node.getDirectiveItem();
      }),
    ).toEqual({
      id: "team",
      type: "group",
      label: "Team",
      description: undefined,
      metadata: undefined,
    });
  });

  it("does not move metadata to a different matching occurrence", async () => {
    const initialConfig = {
      namespace: "sync-plugin-formatter-position-test",
      nodes: [DirectiveNode],
      onError: (error: Error) => {
        throw error;
      },
    };
    const capture = (capturedEditor: LexicalEditor) => {
      editor = capturedEditor;
    };
    const team = {
      kind: "mention" as const,
      type: "group",
      id: "team",
      label: "Team",
    };
    const oldFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[[${item.id}]]`,
      parse: (text) => {
        if (text === "@team [[team]]") {
          return [{ kind: "text", text: "@team " }, team];
        }
        return text === "[[team]]" ? [team] : [{ kind: "text", text }];
      },
    };
    const newFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `@${item.id}`,
      parse: (text) => {
        if (text === "@team [[team]]") {
          return [team, { kind: "text", text: " [[team]]" }];
        }
        return text === "@team" ? [team] : [{ kind: "text", text }];
      },
    };
    const render = (formatter: Unstable_DirectiveFormatter) =>
      root.render(
        <LexicalComposer initialConfig={initialConfig}>
          <SyncPlugin formatter={formatter} />
          <EditorProbe capture={capture} />
        </LexicalComposer>,
      );

    mocks.aui = createAui("@team [[team]]");
    await act(async () => {
      render(oldFormatter);
    });
    await act(async () => {
      editor.update(
        () => {
          const directive = $getParagraph().getLastChild();
          if (!$isDirectiveNode(directive)) {
            throw new Error("Expected a directive");
          }
          directive.replace(
            $createDirectiveNode(
              {
                ...directive.getDirectiveItem(),
                description: "Original occurrence",
                metadata: { source: "brackets" },
              },
              directive.getDirectiveText(),
            ),
          );
        },
        { tag: "aui-sync" },
      );
    });
    const before = editor.getEditorState().read(() => {
      const directive = $getParagraph().getLastChild();
      if (!$isDirectiveNode(directive)) {
        throw new Error("Expected a directive");
      }
      return { key: directive.getKey(), item: directive.getDirectiveItem() };
    });

    await act(async () => {
      render(newFormatter);
    });
    expect(
      editor.getEditorState().read(() => {
        const paragraph = $getParagraph();
        const text = paragraph.getFirstChild();
        const directive = paragraph.getLastChild();
        if (!$isTextNode(text) || !$isDirectiveNode(directive)) {
          throw new Error("Expected text followed by a directive");
        }
        return {
          text: text.getTextContent(),
          directive: {
            key: directive.getKey(),
            item: directive.getDirectiveItem(),
          },
        };
      }),
    ).toEqual({ text: "@team ", directive: before });
  });
});
