// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { ChatTransport, UIMessage } from "ai";
import { StrictMode, useLayoutEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatRuntime } from "./useChatRuntime";

const messages: UIMessage[] = [
  {
    id: "initial-user-message",
    role: "user",
    parts: [{ type: "text", text: "Hello from the server" }],
  },
];

const MessageProbe = () => {
  const count = useAuiState((state) => state.thread.messages.length);
  const text = useAuiState(
    (state) =>
      state.thread.messages[0]?.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("") ?? "",
  );
  return (
    <>
      <output data-testid="message-count">{count}</output>
      <output data-testid="message-text">{text}</output>
    </>
  );
};

const TestApp = () => {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/api/chat" }),
  );
  const runtime = useChatRuntime({
    messages,
    transport,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageProbe />
    </AssistantRuntimeProvider>
  );
};

describe("useChatRuntime integration", () => {
  it("exposes seeded messages through the mounted thread scope", async () => {
    render(
      <StrictMode>
        <TestApp />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("message-count").textContent).toBe("1");
      expect(screen.getByTestId("message-text").textContent).toBe(
        "Hello from the server",
      );
    });
  });

  it("routes sends through a replacement transport", async () => {
    const createEmptyStream = () =>
      new ReadableStream({ start: (controller) => controller.close() });
    const sendA = vi.fn(async () => createEmptyStream());
    const sendB = vi.fn(async () => createEmptyStream());
    const transportA: ChatTransport<UIMessage> = {
      sendMessages: sendA,
      reconnectToStream: vi.fn(),
    };
    const transportB: ChatTransport<UIMessage> = {
      sendMessages: sendB,
      reconnectToStream: vi.fn(),
    };
    const SendOnLayout = ({ runtime }: { runtime: AssistantRuntime }) => {
      useLayoutEffect(() => {
        void runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "hello" }],
        });
      }, [runtime]);
      return null;
    };
    const App = ({
      transport,
      send = false,
    }: {
      transport: ChatTransport<UIMessage>;
      send?: boolean;
    }) => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {send && <SendOnLayout runtime={runtime} />}
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<App transport={transportA} />);
    view.rerender(<App transport={transportB} send />);

    await waitFor(() => expect(sendB).toHaveBeenCalledOnce());
    expect(sendA).not.toHaveBeenCalled();
  });
});
