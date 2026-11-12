/** @vitest-environment jsdom */
// jsdom does not move DOM focus when Lexical's editor.focus() runs (it focuses
// through the DOM selection), so these tests assert the decision the composer
// makes on run start: whether it asks its editor for focus.
import { act, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor } from "lexical";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { LexicalComposerInput } from "./LexicalComposerInput";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const adapter = { async *run() {} };

type Runtime = ReturnType<typeof useLocalRuntime>;

function CaptureEditor({
  onEditor,
}: {
  onEditor: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => onEditor(editor), [editor, onEditor]);
  return null;
}

describe("LexicalComposerInput run-start focus", () => {
  let container: HTMLDivElement;
  let root: Root;
  let runtime: Runtime | null;
  let editorFocus: MockInstance;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    runtime = null;
    let editor: LexicalEditor | null = null;
    const onEditor = (e: LexicalEditor) => {
      editor = e;
    };

    const App = () => {
      const currentRuntime = useLocalRuntime(adapter);
      runtime = currentRuntime;
      return (
        <AssistantRuntimeProvider runtime={currentRuntime}>
          <input aria-label="Outside thread" />
          <ThreadPrimitive.Root>
            <button type="button">Inside thread</button>
            <ComposerPrimitive.Root>
              <button type="button">Composer action</button>
              <LexicalComposerInput aria-label="Composer">
                <CaptureEditor onEditor={onEditor} />
              </LexicalComposerInput>
            </ComposerPrimitive.Root>
            <ThreadPrimitive.Root>
              <button type="button">Nested thread</button>
            </ThreadPrimitive.Root>
          </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
      );
    };
    await act(async () => root.render(<App />));
    editorFocus = vi.spyOn(editor!, "focus");
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const byLabel = (label: string) =>
    container.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
  const byText = (text: string) =>
    [...container.querySelectorAll<HTMLElement>("button")].find(
      (b) => b.textContent === text,
    )!;
  const startRun = async () => {
    await act(async () => {
      await runtime!.thread.append("Programmatic message");
    });
  };

  it("keeps focus in an input outside the thread", async () => {
    const outside = byLabel("Outside thread");
    act(() => outside.focus());

    await startRun();

    expect(editorFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside);
  });

  it("keeps focus inside a nested thread root", async () => {
    const nested = byText("Nested thread");
    act(() => nested.focus());

    await startRun();

    expect(editorFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(nested);
  });

  it("focuses the composer when nothing is focused", async () => {
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(document.activeElement).toBe(document.body);

    await startRun();

    expect(editorFocus).toHaveBeenCalled();
  });

  it("focuses the composer when another element in its thread is focused", async () => {
    act(() => byText("Inside thread").focus());

    await startRun();

    expect(editorFocus).toHaveBeenCalled();
  });

  it("focuses the composer when a control in its composer root is focused", async () => {
    act(() => byText("Composer action").focus());

    await startRun();

    expect(editorFocus).toHaveBeenCalled();
  });

  it("leaves focus alone while the editor already has it", async () => {
    act(() => byLabel("Composer").focus());
    expect(document.activeElement).toBe(byLabel("Composer"));

    await startRun();

    expect(editorFocus).not.toHaveBeenCalled();
  });
});

// A composer portaled outside `ThreadPrimitive.Root` has no thread root
// ancestor in the DOM, so the attribute lookup that the Lexical guard used to
// do cannot tell that focus sits inside this composer's thread.
describe("LexicalComposerInput run-start focus with a portaled composer", () => {
  let container: HTMLDivElement;
  let portalHost: HTMLDivElement;
  let root: Root;
  let runtime: Runtime | null;
  let editorFocus: MockInstance;

  beforeEach(async () => {
    container = document.createElement("div");
    portalHost = document.createElement("div");
    document.body.append(container, portalHost);
    root = createRoot(container);
    runtime = null;
    let editor: LexicalEditor | null = null;
    const onEditor = (e: LexicalEditor) => {
      editor = e;
    };

    const App = () => {
      const currentRuntime = useLocalRuntime(adapter);
      runtime = currentRuntime;
      return (
        <AssistantRuntimeProvider runtime={currentRuntime}>
          <input aria-label="Outside thread" />
          <ThreadPrimitive.Root>
            <button type="button">Inside thread</button>
            {createPortal(
              <ComposerPrimitive.Root>
                <LexicalComposerInput aria-label="Composer">
                  <CaptureEditor onEditor={onEditor} />
                </LexicalComposerInput>
              </ComposerPrimitive.Root>,
              portalHost,
            )}
          </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
      );
    };
    await act(async () => root.render(<App />));
    editorFocus = vi.spyOn(editor!, "focus");
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    portalHost.remove();
  });

  const startRun = async () => {
    await act(async () => {
      await runtime!.thread.append("Programmatic message");
    });
  };

  it("takes focus when another element in its thread is focused", async () => {
    const inside = [...container.querySelectorAll<HTMLElement>("button")].find(
      (b) => b.textContent === "Inside thread",
    )!;
    act(() => inside.focus());

    await startRun();

    expect(editorFocus).toHaveBeenCalled();
  });

  it("takes focus when a control in its composer root is focused", async () => {
    const composerRoot = portalHost.querySelector<HTMLElement>(
      "[data-aui-composer-type]",
    )!;
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = "Composer action";
    composerRoot.appendChild(action);
    act(() => action.focus());

    await startRun();

    expect(editorFocus).toHaveBeenCalled();
  });

  it("leaves focus in an input outside the thread alone", async () => {
    const outside = container.querySelector<HTMLElement>(
      '[aria-label="Outside thread"]',
    )!;
    act(() => outside.focus());

    await startRun();

    expect(editorFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside);
  });
});
