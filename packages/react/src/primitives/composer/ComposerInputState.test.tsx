/**
 * @vitest-environment jsdom
 */
import { useEffect, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAui, useAuiState } from "@assistant-ui/store";
import { describe, expect, it } from "vitest";

const initialText = "hello world";
let immediateText = "";
let runtimeImmediateText = "";
let renderedText: { text: string; draft: string }[] = [];

function Input() {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const [draft, setDraft] = useState(text);
  renderedText.push({ text, draft });

  useEffect(() => {
    aui.composer.setText(initialText);
  }, [aui]);

  return (
    <textarea
      aria-label="input"
      data-draft={draft}
      value={text}
      onChange={(event) => {
        const nextText = event.currentTarget.value;
        setDraft(nextText);
        aui.composer.setText(nextText);
        immediateText = aui.composer.getState().text;
        runtimeImmediateText =
          aui.composer.__internal_getRuntime?.().getState().text ?? "";
      }}
    />
  );
}

function App() {
  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Input />
    </AssistantRuntimeProvider>
  );
}

describe("composer input state", () => {
  it("keeps a controlled input in sync with a text update in the same event", async () => {
    renderedText = [];
    immediateText = "";
    runtimeImmediateText = "";
    render(<App />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const input = screen.getByRole("textbox", {
      name: "input",
    }) as HTMLTextAreaElement;
    expect(input.value).toBe(initialText);
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(input, "helloX world");
    input.setSelectionRange(6, 6);

    fireEvent.input(input);

    expect(immediateText).toBe("helloX world");
    expect(runtimeImmediateText).toBe("helloX world");
    expect(renderedText).not.toContainEqual({
      text: initialText,
      draft: "helloX world",
    });
    expect(renderedText).toContainEqual({
      text: "helloX world",
      draft: "helloX world",
    });
    expect(input.selectionStart).toBe(6);
  });
});
