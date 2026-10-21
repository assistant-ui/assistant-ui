// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { ActionBarPrimitiveCopy } from "./ActionBarCopy";

const model: ChatModelAdapter = { async *run() {} };
const initialMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [{ type: "text", text: "Message to copy." }],
    status: { type: "complete", reason: "stop" },
  },
];
const Message = () => (
  <ActionBarPrimitiveCopy>Copy message</ActionBarPrimitiveCopy>
);
const Example = () => {
  const runtime = useLocalRuntime(model, { initialMessages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitiveMessages components={{ Message }} />
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("copies the scoped message through the browser clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  render(<Example />);
  const button = screen.getByRole("button", { name: "Copy message" });

  await act(async () => {
    fireEvent.click(button);
  });

  expect(writeText).toHaveBeenCalledExactlyOnceWith("Message to copy.");
  await waitFor(() => expect(button.getAttribute("data-copied")).toBe("true"));
});
