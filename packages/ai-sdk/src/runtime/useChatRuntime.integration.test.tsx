// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { AuiConfig, AuiProvider, useAuiState } from "@assistant-ui/store";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AISDKChat } from "./AISDKChat";
import type { ChatTransport, UIMessage } from "ai";
import { Activity, StrictMode, useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  createCancellableTransport,
  createStreamHarness,
  nextTask,
} from "./__tests__/controlled-transport";
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

  it("aborts a deleted thread's stream while the host stays mounted", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning, client } = createStreamHarness();

    const view = render(
      <StrictMode>
        <StreamingApp transport={transport} probe={<Probe />} />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));

    await act(async () => client().threadListItem.delete());

    await waitFor(() => expect(getCancelCount()).toBe(1));
    view.unmount();
  });

  it("aborts the in-flight transport after a real unmount", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    const view = render(
      <StrictMode>
        <StreamingApp transport={transport} probe={<Probe />} />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));
    // the Strict Mode double mount already ran a host cleanup by now
    expect(getCancelCount()).toBe(0);

    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });

  it("keeps streaming while hidden and aborts when the hidden host unmounts", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    let setMode: ((mode: "visible" | "hidden") => void) | undefined;
    const Shell = () => {
      const [mode, set] = useState<"visible" | "hidden">("visible");
      setMode = set;
      return (
        <Activity mode={mode}>
          <StreamingApp transport={transport} probe={<Probe />} />
        </Activity>
      );
    };

    const view = render(
      <StrictMode>
        <Shell />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));

    await act(async () => setMode?.("hidden"));
    await act(nextTask);
    expect(getCancelCount()).toBe(0);
    expect(isRunning()).toBe(true);

    await act(async () => setMode?.("visible"));
    await act(nextTask);
    expect(getCancelCount()).toBe(0);
    expect(isRunning()).toBe(true);

    await act(async () => setMode?.("hidden"));
    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });

  it("aborts a nested runtime's stream when the provider above it unmounts", async () => {
    const outer = createCancellableTransport();
    const { transport, getCancelCount } = createCancellableTransport();
    let nested: AssistantRuntime | undefined;

    // allowNesting: the inner useChatRuntime runs its thread hook directly, as
    // a plain React hook under the provider rather than inside a tap resource.
    const NestedChat = () => {
      nested = useChatRuntime({ transport });
      return null;
    };

    const view = render(
      <StrictMode>
        <AuiProvider
          config={AuiConfig({
            threads: AISDKChat({ transport: outer.transport }),
          })}
        >
          <NestedChat />
        </AuiProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(nested).toBeDefined());
    await act(async () => {
      await nested!.thread.append("keep streaming");
    });
    await waitFor(() => expect(nested!.thread.getState().isRunning).toBe(true));

    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });
});

const StreamingApp = ({
  transport,
  probe,
}: {
  transport: ChatTransport<UIMessage>;
  probe: ReactNode;
}) => {
  const runtime = useChatRuntime({ transport });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {probe}
    </AssistantRuntimeProvider>
  );
};

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
