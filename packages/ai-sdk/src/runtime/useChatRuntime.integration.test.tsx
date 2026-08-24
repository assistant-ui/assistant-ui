// @vitest-environment jsdom

import { render, renderHook, screen, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { useTapHost } from "@assistant-ui/tap";
import type { ChatTransport, UIMessage } from "ai";
import {
  StrictMode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { DynamicChatTransport } from "./DynamicChatTransport";
import { useChatRuntime } from "./useChatRuntime";
import { useChatThread } from "./useChatThread";

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

  it("routes sends triggered during the initial layout commit", async () => {
    const send = vi.fn(
      async () =>
        new ReadableStream({ start: (controller) => controller.close() }),
    );
    const transport: ChatTransport<UIMessage> = {
      sendMessages: send,
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
    const App = () => {
      const runtime = useChatRuntime({ transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <SendOnLayout runtime={runtime} />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    await waitFor(() => expect(send).toHaveBeenCalledOnce());
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

  it("uses the latest thread list item getter after host rerenders", async () => {
    const bodies: Array<{ id: string }> = [];
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
    const { rerender } = renderHook(
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
      { initialProps: { remoteId: "remote-a" } },
    );
    const send = () =>
      transport.sendMessages({
        trigger: "submit-message",
        chatId: "stable-thread",
        messageId: undefined,
        messages: [
          {
            id: "message-id",
            role: "user",
            parts: [{ type: "text", text: "hello" }],
          },
        ],
        abortSignal: undefined,
      });

    await send();
    rerender({ remoteId: "remote-b" });
    await send();

    expect(bodies).toEqual([
      expect.objectContaining({ id: "remote-a" }),
      expect.objectContaining({ id: "remote-b" }),
    ]);
  });
});
