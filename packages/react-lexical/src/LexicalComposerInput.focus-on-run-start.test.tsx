/** @vitest-environment jsdom */
// jsdom does not move DOM focus when Lexical's editor.focus() runs (it focuses
// through the DOM selection), so these tests assert the decision the composer
// makes on run start: whether it asks its editor for focus.
import { act, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor } from "lexical";
import { createRoot, type Root } from "react-dom/client";
import {
  AssistantRuntimeProvider,
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
            <LexicalComposerInput aria-label="Composer">
              <CaptureEditor onEditor={onEditor} />
            </LexicalComposerInput>
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
});
