import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessage,
} from "@assistant-ui/core";
import { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useLocalRuntime: vi.fn((adapter: ChatModelAdapter) => adapter),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useLocalRuntime: mocks.useLocalRuntime,
}));

import { useCloudRuntime } from "./useCloudRuntime";

const userMessage: ThreadMessage = {
  id: "user-message",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  attachments: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  metadata: { custom: {} },
};

const runOptions = {
  messages: [],
  runConfig: {},
  abortSignal: new AbortController().signal,
  context: {},
  unstable_getMessage: () => userMessage,
  unstable_threadId: "remote-thread",
} satisfies ChatModelRunOptions;

const createAdapter = () => {
  const cloud = new AssistantCloud({
    apiKey: "test-key",
    userId: "user-id",
    workspaceId: "workspace-id",
  });
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- useLocalRuntime is mocked to return the adapter.
  return useCloudRuntime({
    cloud,
    assistantId: "assistant-id",
  }) as unknown as ChatModelAdapter;
};

const uiMessageStream = (events: readonly Record<string, unknown>[]) =>
  `${events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("")}data: [DONE]\n\n`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCloudRuntime", () => {
  it("runs the assistant against the active Cloud thread", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        uiMessageStream([
          { type: "start", messageId: "assistant" },
          { type: "text-start", id: "text" },
          { type: "text-delta", id: "text", delta: "Hi" },
          { type: "text-end", id: "text" },
          { type: "finish", finishReason: "stop" },
        ]),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    let content: ChatModelRunResult["content"];
    for await (const result of createAdapter().run(
      runOptions,
    ) as AsyncGenerator<ChatModelRunResult>) {
      content = result.content;
    }

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const request = JSON.parse(init.body as string);
    expect(request.thread_id).toBe("remote-thread");
    expect(request.assistant_id).toBe("assistant-id");
    expect(request.response_format).toBe("vercel-ai-data-stream/v1");
    expect(init.body).not.toContain("unstable_todo");
    expect(url).toBe("https://backend.assistant-api.com/v1/runs/stream");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-key");
    expect(headers.get("Aui-User-Id")).toBe("user-id");
    expect(headers.get("Aui-Workspace-Id")).toBe("workspace-id");
    expect(headers.get("Aui-Sdk")).toMatch(/^assistant-cloud\//);
    expect(headers.get("Accept")).toBe("text/plain");
    expect(headers.get("Content-Type")).toBe("application/json");

    expect(content).toMatchObject([{ type: "text", text: "Hi" }]);
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
