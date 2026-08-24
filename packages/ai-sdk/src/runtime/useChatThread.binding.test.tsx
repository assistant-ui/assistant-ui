// @vitest-environment jsdom

import { Suspense } from "react";
import { render } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import type { ChatTransport, UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { DynamicChatTransport } from "./DynamicChatTransport";

const mocks = vi.hoisted(() => ({
  system: "",
  useAISDKRuntime: vi.fn(),
  useChat: vi.fn(),
}));

vi.mock("@ai-sdk/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ai-sdk/react")>()),
  useChat: mocks.useChat,
}));

vi.mock("./useAISDKRuntime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useAISDKRuntime")>()),
  useAISDKRuntime: mocks.useAISDKRuntime,
}));

import { useChatThread } from "./useChatThread";

const createRuntime = (system: string) =>
  ({
    thread: {
      getModelContext: () => ({ system }),
      getState: () => ({ isLoading: false }),
      subscribe: () => () => {},
    },
  }) as AssistantRuntime;

describe("useChatThread transport binding", () => {
  beforeEach(() => {
    mocks.system = "";
    mocks.useAISDKRuntime.mockReset();
    mocks.useChat.mockReset();
    mocks.useAISDKRuntime.mockImplementation(() => createRuntime(mocks.system));
    mocks.useChat.mockImplementation(({ id, transport }) => ({
      id,
      transport,
      messages: [],
      status: "ready",
      error: undefined,
      stop: vi.fn(async () => {}),
    }));
  });

  it("keeps fallback wiring on committed values after an abandoned render", async () => {
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
    const pending = new Promise<never>(() => {});
    let committedProxy: ChatTransport<UIMessage> | undefined;

    const App = ({
      system,
      remoteId,
      suspend = false,
    }: {
      system: string;
      remoteId: string;
      suspend?: boolean;
    }) => {
      mocks.system = system;
      useChatThread(
        { transport },
        {
          id: "thread-id",
          isMainThread: true,
          getThreadListItem: () => ({
            initialize: async () => ({
              remoteId,
              externalId: undefined,
            }),
          }),
        },
      );
      const proxy = mocks.useChat.mock.lastCall?.[0].transport as
        | ChatTransport<UIMessage>
        | undefined;
      if (!suspend) committedProxy = proxy;
      if (suspend) throw pending;
      return null;
    };

    const view = render(
      <Suspense fallback={null}>
        <App system="committed-system" remoteId="committed-remote" />
      </Suspense>,
    );

    transport.registerThread("thread-id", {});
    view.rerender(
      <Suspense fallback={null}>
        <App system="discarded-system" remoteId="discarded-remote" suspend />
      </Suspense>,
    );

    await committedProxy!.sendMessages({
      trigger: "submit-message",
      chatId: "thread-id",
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

    expect(bodies).toEqual([
      expect.objectContaining({
        id: "committed-remote",
        system: "committed-system",
      }),
    ]);
  });
});
