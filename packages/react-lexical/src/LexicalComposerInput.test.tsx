/**
 * @vitest-environment jsdom
 */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $getRoot, type LexicalEditor } from "lexical";
import { LexicalComposerInput } from "./LexicalComposerInput";

const setText = vi.fn<(text: string) => void>();
const sendSpy = vi.fn<(options?: { steer?: boolean }) => void>();
const cancelSpy = vi.fn<() => void>();

const composerState = {
  isEditing: true,
  text: "",
  type: "thread" as const,
  isEmpty: true,
  canCancel: false,
  canSend: true,
  dictation: undefined as undefined | { inputDisabled: boolean },
};

const threadState = {
  isDisabled: false,
  isRunning: false,
};

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const aui = {
    composer: () => ({
      setText,
      getState: () => composerState,
      cancel: cancelSpy,
      send: sendSpy,
    }),
    thread: () => ({
      getState: () => threadState,
    }),
    on: () => () => {},
  };
  type Selector<T> = (s: {
    composer: typeof composerState;
    thread: typeof threadState;
  }) => T;
  return {
    ...actual,
    useAui: () => aui,
    useAuiState: <T,>(selector: Selector<T>) =>
      selector({ composer: composerState, thread: threadState }),
  };
});

describe("LexicalComposerInput", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    setText.mockReset();
    sendSpy.mockReset();
    cancelSpy.mockReset();
    composerState.isEditing = true;
    composerState.text = "";
    composerState.isEmpty = true;
    composerState.canSend = true;
    composerState.dictation = undefined;
    threadState.isDisabled = false;
    threadState.isRunning = false;

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

  it("renders children inside the LexicalComposer context with a live editor", async () => {
    let capturedEditor: LexicalEditor | null = null;
    let updateListenerFired = false;

    function ProbePlugin() {
      const [editor] = useLexicalComposerContext();

      useEffect(() => {
        capturedEditor = editor;
        return editor.registerUpdateListener(() => {
          updateListenerFired = true;
        });
      }, [editor]);

      return null;
    }

    await act(async () => {
      root.render(
        <LexicalComposerInput>
          <ProbePlugin />
        </LexicalComposerInput>,
      );
    });

    expect(capturedEditor).not.toBeNull();

    await act(async () => {
      capturedEditor!.update(() => {
        $getRoot().append($createParagraphNode());
      });
    });
    expect(updateListenerFired).toBe(true);
  });

  it("still renders the built-in contentEditable alongside children", async () => {
    function ProbePlugin() {
      useLexicalComposerContext();
      return null;
    }

    await act(async () => {
      root.render(
        <LexicalComposerInput>
          <ProbePlugin />
        </LexicalComposerInput>,
      );
    });

    expect(container.querySelector(".aui-lexical-input")).not.toBeNull();
  });
});
