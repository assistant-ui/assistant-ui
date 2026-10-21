/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAui, useAuiState } from "@assistant-ui/store";

function Input({
  value,
  onChange,
  withOwnState,
}: {
  value: string;
  onChange: (value: string) => void;
  withOwnState: boolean;
}) {
  const [, setChangeCount] = useState(0);
  return (
    <textarea
      aria-label="composer"
      value={value}
      onChange={(event) => {
        if (withOwnState) setChangeCount((count) => count + 1);
        onChange(event.target.value);
      }}
    />
  );
}

function BoundInput({ withOwnState }: { withOwnState: boolean }) {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  return (
    <>
      <button onClick={() => aui.composer.setText("hello world")}>seed</button>
      <Input
        value={text}
        onChange={(value) => aui.composer.setText(value)}
        withOwnState={withOwnState}
      />
    </>
  );
}

function App({ withOwnState }: { withOwnState: boolean }) {
  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <BoundInput withOwnState={withOwnState} />
    </AssistantRuntimeProvider>
  );
}

describe("composer state in controlled inputs", () => {
  it.each([
    ["mentions-like", true],
    ["plain textarea", false],
  ])(
    "keeps the caret after typing in the middle: %s",
    async (_, withOwnState) => {
      render(<App withOwnState={withOwnState} />);
      fireEvent.click(screen.getByRole("button", { name: "seed" }));
      const input = screen.getByRole("textbox", {
        name: "composer",
      }) as HTMLTextAreaElement;
      await waitFor(() => expect(input.value).toBe("hello world"));

      input.setSelectionRange(5, 5);
      fireEvent.change(input, {
        target: { value: "helloX world", selectionStart: 6, selectionEnd: 6 },
      });
      await waitFor(() => expect(input.value).toBe("helloX world"));
      expect(input.selectionStart).toBe(6);
    },
  );
});
