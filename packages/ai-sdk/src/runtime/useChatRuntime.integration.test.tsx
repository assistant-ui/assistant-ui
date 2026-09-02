// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import {
  AuiConfig,
  AuiProvider,
  Derived,
  useAuiState,
  type AssistantClient,
} from "@assistant-ui/store";
import type { UIMessage } from "ai";
import { Activity, StrictMode, useState } from "react";
import { AISDKChat } from "./AISDKChat";
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

  it("aborts the in-flight transport after a real unmount", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    const StreamingApp = () => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(
      <StrictMode>
        <StreamingApp />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));

    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
  });

  it("aborts a deleted thread's stream while the host stays mounted", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning, client } = createStreamHarness();

    const StreamingApp = () => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(
      <StrictMode>
        <StreamingApp />
      </StrictMode>,
    );

    await act(async () => send());
    await waitFor(() => expect(isRunning()).toBe(true));

    // Deleting the thread stops its runtime: the thread owns the chat, so
    // its stream is aborted without waiting for the host to unmount.
    await act(async () => client().threadListItem.delete());
    await waitFor(() => expect(getCancelCount()).toBe(1));

    view.unmount();
    await act(nextTask);
    expect(getCancelCount()).toBe(1);
  });

  it("keeps streaming while hidden and aborts when the hidden host unmounts", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const { Probe, send, isRunning } = createStreamHarness();

    const StreamingApp = () => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    let setMode: ((mode: "visible" | "hidden") => void) | undefined;
    const Shell = () => {
      const [mode, set] = useState<"visible" | "hidden">("visible");
      setMode = set;
      return (
        <Activity mode={mode}>
          <StreamingApp />
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

  it("resolves a nested runtime's owner through a derived-only provider", async () => {
    const { transport: transportA } = createCancellableTransport();
    const { transport: transportB } = createCancellableTransport();
    const { transport, getCancelCount } = createCancellableTransport();
    let nested: AssistantRuntime | undefined;

    // allowNesting: the inner useChatRuntime runs its thread hook directly,
    // as a plain React hook under a provider that never bound a signal.
    const NestedChat = () => {
      nested = useChatRuntime({ transport });
      return null;
    };

    const derivedOnly = AuiConfig({
      threadListItem: Derived({
        source: "threads",
        query: { type: "main" },
        get: (client) => client.threads.item("main"),
      }),
    });

    let setParent: ((parent: "a" | "b") => void) | undefined;
    const App = () => {
      const [hostA, setHostA] = useState<AssistantClient | null>(null);
      const [hostB, setHostB] = useState<AssistantClient | null>(null);
      const [parent, set] = useState<"a" | "b">("a");
      setParent = set;
      const extendsClient = parent === "a" ? hostA : hostB;
      return (
        <>
          {parent === "a" && (
            <AuiProvider
              ref={setHostA}
              config={AuiConfig({
                threads: AISDKChat({ transport: transportA }),
              })}
            >
              {null}
            </AuiProvider>
          )}
          <AuiProvider
            ref={setHostB}
            config={AuiConfig({
              threads: AISDKChat({ transport: transportB }),
            })}
          >
            {null}
          </AuiProvider>
          {extendsClient && (
            <AuiProvider extends={extendsClient} config={derivedOnly}>
              <NestedChat />
            </AuiProvider>
          )}
        </>
      );
    };

    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await waitFor(() => expect(nested).toBeDefined());
    await act(async () => {
      await nested!.thread.append("keep streaming");
    });
    await waitFor(() => expect(nested!.thread.getState().isRunning).toBe(true));

    // Re-parenting to host B deletes host A; A's retained listener must not
    // stop the chat B now owns.
    await act(async () => setParent?.("b"));
    await act(nextTask);
    expect(getCancelCount()).toBe(0);
    expect(nested!.thread.getState().isRunning).toBe(true);

    // B's own unmount reaches the nested chat through the derived-only chain.
    view.unmount();
    await waitFor(() => expect(getCancelCount()).toBe(1));
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
