// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { UIMessage } from "ai";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { AssistantChatTransport } from "./AssistantChatTransport";
import { useChatRuntime } from "./useChatRuntime";

const messages: UIMessage[] = [
  {
    id: "initial-user-message",
    role: "user",
    parts: [{ type: "text", text: "Hello from the server" }],
  },
];

const transport = new AssistantChatTransport({ api: "/api/chat" });

const MessageCount = () => {
  const count = useAuiState((state) => state.thread.messages.length);
  return <output data-testid="message-count">{count}</output>;
};

const TestApp = () => {
  const runtime = useChatRuntime({
    id: "session-id",
    messages,
    transport,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageCount />
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
    });
  });
});
