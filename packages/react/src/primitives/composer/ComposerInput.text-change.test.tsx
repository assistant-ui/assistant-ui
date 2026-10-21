// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { FC } from "react";
import { afterEach, expect, it } from "vitest";
import { useAui } from "@assistant-ui/store";
import { useLocalRuntime } from "@assistant-ui/core/react";
import type { ChatModelAdapter } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "../../context";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider";
import { ComposerPrimitiveInput } from "./ComposerInput";

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: "text", text: "done" }] };
  },
};

afterEach(cleanup);

it("emits composer.textChange with the user origin for typing and the send origin for the clear", async () => {
  let aui!: ReturnType<typeof useAui>;
  const Capture: FC = () => {
    aui = useAui();
    return null;
  };
  const App: FC = () => (
    <AssistantRuntimeProvider runtime={useLocalRuntime(adapter)}>
      <Capture />
      <ThreadPrimitiveViewportProvider>
        <ComposerPrimitiveInput aria-label="Composer" />
      </ThreadPrimitiveViewportProvider>
    </AssistantRuntimeProvider>
  );
  render(<App />);
  const changes: unknown[] = [];
  aui.on({ scope: "*", event: "composer.textChange" }, (change) =>
    changes.push(change),
  );
  const input = screen.getByRole("textbox", { name: "Composer" });

  await act(async () => {
    fireEvent.change(input, { target: { value: "hi" } });
  });
  await act(async () => {
    fireEvent.change(input, { target: { value: "" } });
  });
  await act(async () => {
    fireEvent.change(input, { target: { value: "hello" } });
  });
  await act(async () => {
    aui.composer().send();
  });

  const threadId = aui.threads().getState().mainThreadId;
  expect(changes).toEqual([
    { threadId, text: "hi", origin: "user" },
    { threadId, text: "", origin: "user" },
    { threadId, text: "hello", origin: "user" },
    { threadId, text: "", origin: "send" },
  ]);
});
