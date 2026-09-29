import { createRoot } from "react-dom/client";
import { useTapHost } from "@assistant-ui/tap";
import { DynamicChatTransport } from "./DynamicChatTransport";
import { useChatThread } from "./useChatThread";
// @vitest-environment jsdom

import { getEventListeners } from "node:events";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  RuntimeAdapterProvider,
} from "@assistant-ui/core/react";
import { AuiConfig, AuiProvider, useAuiState } from "@assistant-ui/store";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AISDKChat } from "./AISDKChat";
import type { ChatTransport, UIMessage } from "ai";
import {
  Activity,
  StrictMode,
  Suspense,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
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

  it("aborts a nested runtime when only its own component unmounts", async () => {
    const outer = createCancellableTransport();
    const { transport, getCancelCount } = createCancellableTransport();
    let nested: AssistantRuntime | undefined;
    let providerSignal: AbortSignal | undefined;
    let setVisible: ((visible: boolean) => void) | undefined;

    const NestedChat = () => {
      providerSignal = useAssistantClientDestroySignal();
      nested = useChatRuntime({ transport });
      return null;
    };
    const Shell = () => {
      const [visible, set] = useState(true);
      setVisible = set;
      return (
        <AuiProvider
          config={AuiConfig({
            threads: AISDKChat({ transport: outer.transport }),
          })}
        >
          {visible && <NestedChat />}
        </AuiProvider>
      );
    };
    const listeners = () => getEventListeners(providerSignal!, "abort").length;

    const view = render(<Shell />);
    await waitFor(() => expect(nested).toBeDefined());
    const mounted = listeners();

    for (const cycle of [1, 2]) {
      await act(async () => {
        await nested!.thread.append(`stream ${cycle}`);
      });
      await waitFor(() =>
        expect(nested!.thread.getState().isRunning).toBe(true),
      );

      await act(async () => setVisible?.(false));
      await waitFor(() => expect(getCancelCount()).toBe(cycle));
      expect(listeners()).toBe(mounted - 1);

      nested = undefined;
      await act(async () => setVisible?.(true));
      await waitFor(() => expect(nested).toBeDefined());
      expect(listeners()).toBe(mounted);
    }

    view.unmount();
    await act(nextTask);
    expect(getCancelCount()).toBe(2);
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

describe("replacement transports", () => {
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

  it("routes sends triggered during the initial layout commit", async () => {
    const send = vi.fn(
      async () =>
        new ReadableStream({ start: (controller) => controller.close() }),
    );
    const transport: ChatTransport<UIMessage> = {
      sendMessages: send,
      reconnectToStream: vi.fn(),
    };
    let resolveLayout!: () => void;
    const layoutCommitted = new Promise<void>((resolve) => {
      resolveLayout = resolve;
    });
    const SendOnLayout = ({ runtime }: { runtime: AssistantRuntime }) => {
      useLayoutEffect(() => {
        runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "hello" }],
        });
        resolveLayout();
      }, [runtime]);
      return null;
    };
    const App = () => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <SendOnLayout runtime={runtime} />
        </AssistantRuntimeProvider>
      );
    };
    const actEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    const container = document.createElement("div");
    const root = createRoot(container);

    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    document.body.append(container);
    try {
      root.render(<App />);
      await layoutCommitted;
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(send).toHaveBeenCalledOnce();
    } finally {
      root.unmount();
      container.remove();
      if (previousActEnvironment === undefined) {
        delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
      } else {
        actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    }
  });

  it("keeps AssistantChatTransport wired through StrictMode effect replay", () => {
    const sourceTransport = new AssistantChatTransport<UIMessage>({
      api: "/api/chat",
    });
    const transport = new DynamicChatTransport(sourceTransport);
    const wiredDuringEffectSetup: boolean[] = [];
    const Probe = ({ effects }: { effects: () => void }) => {
      useEffect(effects);
      useEffect(() => {
        try {
          wiredDuringEffectSetup.push(
            transport.getCurrentTransport("strict-mode-thread") !==
              sourceTransport,
          );
        } catch {
          wiredDuringEffectSetup.push(false);
        }
      }, []);
      return null;
    };

    const App = () => {
      const { effects } = useTapHost(function ChatThreadResource() {
        return useChatThread(
          { transport },
          {
            id: "strict-mode-thread",
            isMainThread: true,
            getThreadListItem: () => undefined,
          },
        );
      });
      return <Probe effects={effects} />;
    };

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(wiredDuringEffectSetup).toEqual([true, true]);
  });

  it("does not publish transport contexts from suspended renders", () => {
    const sourceTransport = new AssistantChatTransport<UIMessage>({
      api: "/api/chat",
    });
    const transport = new DynamicChatTransport(sourceTransport);
    const pending = new Promise<never>(() => {});
    const SuspendedThread = () => {
      useTapHost(function ChatThreadResource() {
        return useChatThread(
          { transport },
          {
            id: "suspended-thread",
            isMainThread: true,
            getThreadListItem: () => undefined,
          },
        );
      });
      throw pending;
    };

    render(
      <Suspense fallback={null}>
        <SuspendedThread />
      </Suspense>,
    );

    expect(transport.getCurrentTransport("suspended-thread")).toBe(
      sourceTransport,
    );
  });

  it("routes runtime sends through a wired clone with the latest thread item", async () => {
    const bodies: Array<{ id: string; system: string }> = [];
    const sourceTransport = new AssistantChatTransport<UIMessage>({
      fetch: vi.fn(async (_input, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(
          new ReadableStream({ start: (controller) => controller.close() }),
          { headers: { "content-type": "text/event-stream" } },
        );
      }),
    });
    const transport = new DynamicChatTransport(sourceTransport);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeAdapterProvider
        adapters={{
          modelContext: {
            getModelContext: () => ({ system: "system prompt" }),
          },
        }}
      >
        {children}
      </RuntimeAdapterProvider>
    );
    const { result, rerender } = renderHook(
      ({ remoteId }: { remoteId: string }) =>
        useChatThread(
          { transport },
          {
            id: "stable-thread",
            isMainThread: true,
            getThreadListItem: () => ({
              initialize: async () => ({
                remoteId,
                externalId: undefined,
              }),
            }),
          },
        ),
      { initialProps: { remoteId: "remote-a" }, wrapper },
    );
    const send = async () => {
      await act(async () => {
        await result.current.thread.append({
          role: "user",
          content: [{ type: "text", text: "hello" }],
        });
      });
    };

    await send();
    rerender({ remoteId: "remote-b" });
    await send();

    expect(bodies).toEqual([
      expect.objectContaining({ id: "remote-a", system: "system prompt" }),
      expect.objectContaining({ id: "remote-b", system: "system prompt" }),
    ]);
  });
});
