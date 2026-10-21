/** @vitest-environment jsdom */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "@assistant-ui/core/store";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

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

  function App() {
    const client = useAui({ thread: ExternalThread({ messages: [], onNew }) });
    useEffect(() => {
      aui = client;
    }, [client]);
    return (
      <AuiProvider value={client}>
        <LexicalComposerInput>
          <EditorProbe />
        </LexicalComposerInput>
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
