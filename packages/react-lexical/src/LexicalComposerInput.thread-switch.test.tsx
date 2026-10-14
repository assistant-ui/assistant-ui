/** @vitest-environment jsdom */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  HISTORY_PUSH_TAG,
  REDO_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  UNDO_COMMAND,
  type LexicalEditor,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const adapter = {
  async run() {
    return { content: [] };
  },
};

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

describe("LexicalComposerInput thread switches", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;
  let runtime: AssistantRuntime;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function App() {
      runtime = useLocalRuntime(adapter, {
        initialMessages: [{ role: "user", content: "existing conversation" }],
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <LexicalComposerInput>
            <EditorProbe
              capture={(current) => {
                editor = current;
              }}
            />
          </LexicalComposerInput>
        </AssistantRuntimeProvider>
      );
    }

    await act(async () => {
      root.render(<App />);
    });
    await act(async () => {
      await runtime.threads.mainItem.initialize();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const readEditorText = () =>
    editor.getEditorState().read(() => $getRoot().getTextContent());

  const setComposerText = async (text: string) => {
    await act(async () => {
      runtime.thread.composer.setText(text);
    });
  };

  const switchToNewThread = async () => {
    await act(async () => {
      await runtime.threads.switchToNewThread();
    });
    return runtime.threads.getState().mainThreadId;
  };

  it("clears undo and redo history when switching to an empty draft", async () => {
    await setComposerText("thread A draft");
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
    expect(runtime.thread.composer.getState().text).toBe(
      "thread A private draft",
    );
    const firstThread = runtime.threads.getState().mainThreadId;

    const secondThread = await switchToNewThread();

    expect(secondThread).not.toBe(firstThread);
    expect(runtime.thread.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(runtime.thread.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");

    await act(async () => {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    });

    expect(runtime.thread.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");
  });

  it("handles a thread switch when the active draft text is unchanged", async () => {
    await setComposerText("thread A draft");
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
    await setComposerText("");
    expect(readEditorText()).toBe("");

    await switchToNewThread();
    expect(runtime.thread.composer.getState().text).toBe("");

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(runtime.thread.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");

    await act(async () => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createTextNode("thread B draft")),
            );
          $getRoot().selectEnd();
        },
        { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    });
    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(runtime.thread.composer.getState().text).toBe("");
    expect(readEditorText()).toBe("");
  });
});
