import type { AssistantCloud } from "assistant-cloud";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useLocalRuntime: vi.fn((adapter: ChatModelAdapter) => adapter),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useLocalRuntime: mocks.useLocalRuntime,
}));

import { useCloudRuntime } from "./useCloudRuntime";

const assistantMessage: ThreadMessage = {
  id: "assistant-message",
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "get_weather",
      args: { city: "London" },
      argsText: '{"city":"London"}',
      result: { temperature: 18 },
    },
  ],
  status: { type: "complete", reason: "stop" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const userMessage: ThreadMessage = {
  id: "user-message",
  role: "user",
  content: [{ type: "text", text: "What is the weather?" }],
  attachments: [],
  createdAt: new Date("2026-01-01T00:00:01.000Z"),
  metadata: { custom: {} },
};

const createRunOptions = (): ChatModelRunOptions => ({
  messages: [assistantMessage],
  runConfig: {},
  abortSignal: new AbortController().signal,
  context: {},
  unstable_threadId: "thread-1",
  unstable_getMessage: () => userMessage,
});

const createCloud = (body: ReturnType<typeof vi.fn>) =>
  ({
    runs: {
      __internal_getAssistantOptions: vi.fn(() => ({
        api: "/v1/runs/stream",
        protocol: "ui-message-stream" as const,
        headers: async () => ({ Authorization: "Bearer test" }),
        body,
      })),
    },
  }) as unknown as AssistantCloud;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCloudRuntime", () => {
  it("sends Cloud thread messages without provider tool-message conversion", async () => {
    const buildCloudBody = vi.fn(async (options?: { threadId?: string }) => ({
      ...(options?.threadId !== undefined
        ? { thread_id: options.threadId }
        : {}),
      assistant_id: "assistant-1",
      response_format: "vercel-ai-data-stream/v1",
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("invalid", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = useCloudRuntime({
      cloud: createCloud(buildCloudBody),
      assistantId: "assistant-1",
      body: { custom: "value" },
      onError: vi.fn(),
    }) as unknown as ChatModelAdapter;

    await expect(
      (adapter.run(createRunOptions()) as AsyncGenerator).next(),
    ).rejects.toThrow("Status 400");

    expect(buildCloudBody).toHaveBeenCalledExactlyOnceWith({
      threadId: "thread-1",
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(request.body as string) as {
      messages: Array<{
        role: string;
        content: Array<Record<string, unknown>>;
      }>;
      [key: string]: unknown;
    };

    expect(payload).toMatchObject({
      thread_id: "thread-1",
      assistant_id: "assistant-1",
      response_format: "vercel-ai-data-stream/v1",
      custom: "value",
    });
    expect(payload).not.toHaveProperty("threadId");
    expect(payload.messages.map((message) => message.role)).toEqual([
      "assistant",
      "user",
    ]);
    expect(payload.messages[0]?.content[0]).toMatchObject({
      type: "tool-call",
      args: { city: "London" },
      result: { temperature: 18 },
    });
    expect(payload.messages[0]?.content[0]).not.toHaveProperty("input");
  });

  it("uses the shared UI message stream lifecycle", async () => {
    const onFinish = vi.fn();
    const buildCloudBody = vi.fn(async () => ({
      thread_id: "thread-1",
      assistant_id: "assistant-1",
      response_format: "vercel-ai-data-stream/v1",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("data: [DONE]\n\n")),
    );

    const adapter = useCloudRuntime({
      cloud: createCloud(buildCloudBody),
      assistantId: "assistant-1",
      onFinish,
    }) as unknown as ChatModelAdapter;

    for await (const _ of adapter.run(createRunOptions()) as AsyncGenerator) {
      void _;
    }

    expect(onFinish).toHaveBeenCalledExactlyOnceWith(userMessage);
  });
});
