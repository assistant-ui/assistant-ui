// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { UIMessage } from "ai";
import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatRuntime } from "./useChatRuntime";
import { useThreadTokenUsage } from "../usage";

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
});

const UsageProbe = () => {
  const usage = useThreadTokenUsage();
  return (
    <output data-testid="total-tokens">{usage?.totalTokens ?? "none"}</output>
  );
};

const UsageApp = () => {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/api/chat" }),
  );
  const runtime = useChatRuntime({
    messages: [
      ...messages,
      {
        id: "assistant-with-usage",
        role: "assistant",
        parts: [{ type: "text", text: "Hi" }],
        metadata: { usage: { inputTokens: 40, outputTokens: 2 } },
      },
    ],
    transport,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <UsageProbe />
    </AssistantRuntimeProvider>
  );
};

describe("useThreadTokenUsage through useChatRuntime", () => {
  it("reads usage from the message metadata a server attached", async () => {
    render(
      <StrictMode>
        <UsageApp />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("total-tokens").textContent).toBe("42");
    });
  });
});
