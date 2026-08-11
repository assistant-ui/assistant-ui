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
    const initialConfig = {
      namespace: "sync-plugin-trigger-test",
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
        <ComposerPrimitive.Unstable_TriggerPopoverRoot>
          <LexicalComposer initialConfig={initialConfig}>
            <SyncPlugin />
            <EditorProbe capture={capture} />
            <TriggerFormatterRegistration
              formatter={registered ? formatter : undefined}
            />
          </LexicalComposer>
        </ComposerPrimitive.Unstable_TriggerPopoverRoot>,
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

  it("preserves metadata when formatter syntax changes", async () => {
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
      parse: (text) =>
        text === "@team"
          ? [
              {
                kind: "mention" as const,
                type: "group",
                id: "team",
                label: "Team",
              },
            ]
          : [{ kind: "text" as const, text }],
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
      editor.update(() => {
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
        $setCompositionKey(textNode.getKey());
      });
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
        isComposing: editor.isComposing(),
      };
    });
    expect(before.isComposing).toBe(true);

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
          isComposing: editor.isComposing(),
        };
      }),
    ).toEqual(before);

    await act(async () => {
      editor.update(() => {
        const paragraph = $getParagraph();
        const firstTeam = paragraph.getFirstChild();
        const secondTeam = paragraph.getLastChild();
        if (!$isTextNode(firstTeam) || !$isTextNode(secondTeam)) {
          throw new Error("Expected team text");
        }
        firstTeam.replace(
          $createDirectiveNode(
            {
              id: "team",
              type: "group",
              label: "First Team",
              description: "First occurrence",
              metadata: { order: 1 },
            },
            "@team",
          ),
        );
        secondTeam.replace(
          $createDirectiveNode(
            {
              id: "team",
              type: "group",
              label: "Second Team",
              description: "Second occurrence",
              metadata: { order: 2 },
            },
            "@team",
          ),
        );
      });
      render(formatter);
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
  });
});
