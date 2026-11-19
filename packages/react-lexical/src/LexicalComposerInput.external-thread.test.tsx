/** @vitest-environment jsdom */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "@assistant-ui/core/store";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { ComposerPrimitive } from "@assistant-ui/react";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isTextNode,
  $nodesOfType,
  KEY_ENTER_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LexicalComposerInput,
  type LexicalComposerInputProps,
} from "./LexicalComposerInput";
import { DirectiveNode } from "./nodes/DirectiveNode";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("LexicalComposerInput with ExternalThread", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;
  let aui: ReturnType<typeof useAui>;
  const onNew = vi.fn();

  function EditorProbe() {
    const [current] = useLexicalComposerContext();
    useEffect(() => {
      editor = current;
    }, [current]);
    return null;
  }

  function App({
    formatter,
    triggerFormatter,
  }: {
    formatter?: LexicalComposerInputProps["formatter"];
    triggerFormatter?: Unstable_DirectiveFormatter;
  }) {
    const client = useAui({ thread: ExternalThread({ messages: [], onNew }) });
    useEffect(() => {
      aui = client;
    }, [client]);
    return (
      <AuiProvider value={client}>
        <ComposerPrimitive.TriggerPopoverRoot>
          <LexicalComposerInput formatter={formatter}>
            <EditorProbe />
          </LexicalComposerInput>
          {triggerFormatter && (
            <ComposerPrimitive.TriggerPopover
              char="@"
              adapter={{
                categories: () => [],
                categoryItems: () => [],
                search: () => [
                  { id: "weather", type: "tool", label: "Weather" },
                ],
              }}
            >
              <ComposerPrimitive.TriggerPopover.Directive
                formatter={triggerFormatter}
              />
            </ComposerPrimitive.TriggerPopover>
          )}
        </ComposerPrimitive.TriggerPopoverRoot>
      </AuiProvider>
    );
  }

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<App />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const readEditorText = () =>
    editor.getEditorState().read(() => $getRoot().getTextContent());

  it("shows a draft written through the composer API", async () => {
    await act(async () => {
      aui.composer.setText("Suggested draft");
    });
    expect(aui.composer.getState().text).toBe("Suggested draft");
    expect(readEditorText()).toBe("Suggested draft");
  });

  it("round-trips directive syntax as plain text with formatter null and no triggers", async () => {
    const text = ":note[x]{name=x}";
    await act(async () => root.render(<App formatter={null} />));
    await act(async () => aui.composer.setText(text));

    expect(readEditorText()).toBe(text);
    expect(editor.read(() => $nodesOfType(DirectiveNode))).toHaveLength(0);
    expect(container.querySelector(".aui-directive-chip")).toBeNull();

    await act(async () => {
      editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        if (!$isElementNode(paragraph)) throw new Error("Expected a paragraph");
        paragraph.append($createTextNode("!"));
      });
    });
    expect(aui.composer.getState().text).toBe(`${text}!`);

    await act(async () => {
      editor.update(() => {
        const node = $getRoot().getFirstDescendant();
        if (!$isTextNode(node)) throw new Error("Expected a text node");
        node.setTextContent(text);
      });
    });
    expect(aui.composer.getState().text).toBe(text);

    await act(async () => aui.composer.send());
    expect(onNew).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ content: [{ type: "text", text }] }),
    );
  });

  it("parses only registered trigger syntax with formatter null", async () => {
    const triggerFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[[${item.id}]]`,
      parse: (text) =>
        text === "[[weather]]"
          ? [{ kind: "mention", id: "weather", type: "tool", label: "Weather" }]
          : [{ kind: "text", text }],
    };
    const text = "[[weather]]\n:note[x]{name=x}";
    await act(async () => {
      root.render(<App formatter={null} triggerFormatter={triggerFormatter} />);
    });
    await act(async () => aui.composer.setText(text));

    expect(
      editor.read(() =>
        $nodesOfType(DirectiveNode).map((node) => node.getTextContent()),
      ),
    ).toEqual(["[[weather]]"]);
    expect(
      editor.read(() => $getRoot().getLastChildOrThrow().getTextContent()),
    ).toBe(":note[x]{name=x}");
    expect(container.querySelector(".aui-directive-chip")?.textContent).toBe(
      "Weather",
    );

    await act(async () => {
      editor.update(() => {
        const paragraph = $getRoot().getLastChildOrThrow();
        if (!$isElementNode(paragraph)) throw new Error("Expected a paragraph");
        paragraph.append($createTextNode("!"));
      });
    });
    expect(aui.composer.getState().text).toBe(`${text}!`);
  });

  it("parses default directive syntax when the formatter is omitted", async () => {
    await act(async () => aui.composer.setText(":note[x]{name=x}"));

    expect(
      editor.read(() =>
        $nodesOfType(DirectiveNode).map((node) => node.getDirectiveItem()),
      ),
    ).toEqual([expect.objectContaining({ id: "x", type: "note", label: "x" })]);
    expect(container.querySelector(".aui-directive-chip")?.textContent).toBe(
      "x",
    );
  });

  it("serializes trigger selections with their own formatter when the prop is null", async () => {
    const triggerFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[[${item.id}]]`,
      parse: (text) => [{ kind: "text", text }],
    };
    await act(async () => {
      root.render(<App formatter={null} triggerFormatter={triggerFormatter} />);
    });
    await act(async () => {
      editor.update(() => {
        const text = $createTextNode("@wea");
        $getRoot().clear().append($createParagraphNode().append(text));
        text.select();
      });
    });
    await act(async () => {
      editor.dispatchCommand(
        KEY_ENTER_COMMAND,
        new KeyboardEvent("keydown", { key: "Enter" }),
      );
    });

    expect(aui.composer.getState().text).toBe("[[weather]] ");
    expect(
      editor.read(() =>
        $nodesOfType(DirectiveNode).map((node) => node.getTextContent()),
      ),
    ).toEqual(["[[weather]]"]);
    expect(container.querySelector(".aui-directive-chip")?.textContent).toBe(
      "Weather",
    );
  });

  it("clears submitted text from the editor", async () => {
    await act(async () => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode("Hello")));
        },
        { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
      );
    });
    expect(aui.composer.getState().text).toBe("Hello");
    await act(async () => {
      aui.composer.send();
    });
    expect(onNew).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ content: [{ type: "text", text: "Hello" }] }),
    );
    expect(aui.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");
  });
});
