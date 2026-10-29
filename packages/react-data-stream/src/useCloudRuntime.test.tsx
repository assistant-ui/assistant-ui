// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCloudRuntime } from "./useCloudRuntime";

const makeCloud = () => {
  const real = new AssistantCloud({
    apiKey: "test-key",
    userId: "user-id",
    workspaceId: "workspace-id",
  });
  return {
    registerSdk: vi.fn(),
    telemetry: { enabled: false },
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn().mockResolvedValue({ thread_id: "remote-thread" }),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
        create: vi.fn().mockResolvedValue({ message_id: "message-1" }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
    runs: {
      stream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      ),
      __internal_getAssistantOptions: (assistantId: string) =>
        real.runs.__internal_getAssistantOptions(assistantId),
    },
  } as unknown as AssistantCloud;
};

const uiMessageStream = (events: readonly Record<string, unknown>[]) =>
  new Response(
    `${events
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("")}data: [DONE]\n\n`,
    { headers: { "Content-Type": "text/event-stream" } },
  );

const mountRuntime = async (cloud: AssistantCloud) => {
  let runtime: ReturnType<typeof useCloudRuntime> | null = null;
  const App = () => {
    runtime = useCloudRuntime({ cloud, assistantId: "assistant-id" });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <div />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  await waitFor(() => {
    expect(runtime!.threads.mainItem.getState().id).toBeDefined();
  });
  return runtime!;
};

const requestOf = (call: unknown[]) => {
  const [url, init] = call as [string, RequestInit];
  return {
    url,
    headers: new Headers(init.headers),
    body: JSON.parse(init.body as string),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCloudRuntime", () => {
  it("posts the thread as it is and runs a frontend tool through the second roundtrip", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        uiMessageStream([
          { type: "start", messageId: "assistant-1" },
          {
            type: "tool-input-start",
            toolCallId: "call-1",
            toolName: "get_weather",
          },
          {
            type: "tool-input-available",
            toolCallId: "call-1",
            toolName: "get_weather",
            input: { city: "San Francisco" },
          },
          { type: "finish", finishReason: "tool-calls" },
        ]),
      )
      .mockResolvedValueOnce(
        uiMessageStream([
          { type: "start", messageId: "assistant-2" },
          { type: "text-start", id: "text" },
          { type: "text-delta", id: "text", delta: "72 and sunny" },
          { type: "text-end", id: "text" },
          { type: "finish", finishReason: "stop" },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const cloud = makeCloud();
    const runtime = await mountRuntime(cloud);
    runtime.registerModelContextProvider({
      getModelContext: () => ({
        tools: {
          get_weather: {
            parameters: {
              type: "object",
              properties: { city: { type: "string" } },
            },
            execute: async () => ({ temperature: 72 }),
          },
        },
      }),
    });

    await act(async () => {
      await runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "What is the weather?" }],
        attachments: [
          {
            id: "attachment-1",
            type: "image",
            name: "sky.png",
            contentType: "image/png",
            status: { type: "complete" },
            content: [{ type: "image", image: "https://cdn.example/sky.png" }],
          },
        ],
      });
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(runtime.thread.getState().messages.at(-1)?.status?.type).toBe(
        "complete",
      );
    });

    const first = requestOf(fetchMock.mock.calls[0]!);
    expect(first.url).toBe("https://backend.assistant-api.com/v1/runs/stream");
    expect(first.headers.get("Authorization")).toBe("Bearer test-key");
    expect(first.headers.get("Aui-User-Id")).toBe("user-id");
    expect(first.headers.get("Aui-Workspace-Id")).toBe("workspace-id");
    expect(first.headers.get("Aui-Sdk")).toMatch(/^assistant-cloud\//);
    expect(first.headers.get("Accept")).toBe("text/plain");
    expect(first.headers.get("Content-Type")).toBe("application/json");
    expect(first.body).toMatchObject({
      thread_id: "remote-thread",
      assistant_id: "assistant-id",
      response_format: "vercel-ai-data-stream/v1",
      tools: { get_weather: { parameters: { type: "object" } } },
    });
    expect(first.body.messages).toMatchObject([
      {
        role: "user",
        content: [{ type: "text", text: "What is the weather?" }],
        attachments: [
          {
            content: [{ type: "image", image: "https://cdn.example/sky.png" }],
          },
        ],
      },
      { role: "assistant", content: [] },
    ]);

    const second = requestOf(fetchMock.mock.calls[1]!);
    expect(second.body.thread_id).toBe("remote-thread");
    expect(second.body.messages.map((m: { role: string }) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(second.body.messages[1].content).toMatchObject([
      {
        type: "tool-call",
        state: "result",
        toolCallId: "call-1",
        toolName: "get_weather",
        args: { city: "San Francisco" },
        result: { temperature: 72 },
      },
    ]);
    expect(second.body.messages[1].content[0]).not.toHaveProperty("input");

    expect(runtime.thread.getState().messages.at(-1)?.content).toMatchObject([
      { type: "tool-call", toolCallId: "call-1", result: { temperature: 72 } },
      { type: "text", text: "72 and sunny" },
    ]);
    expect(cloud.threads.create).toHaveBeenCalledTimes(1);
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  // Recorded from AI SDK 7 `streamText` with a `needsApproval` tool and
  // `experimental_toolApprovalSecret`, through `toUIMessageStreamResponse()`.
  const approvalRequest = [
    { type: "start" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "call_1",
      toolName: "delete_file",
      input: { path: "/tmp/a.txt" },
    },
    {
      type: "tool-approval-request",
      approvalId: "aitxt-1w6vi0Fered1RmYgbJWDbhzJ",
      toolCallId: "call_1",
      signature: "7k2qAL3WgfPT0H4tuB9QTC8NAl-fp6siXIU6YqFc0tM",
    },
    { type: "finish-step" },
    { type: "finish", finishReason: "tool-calls" },
  ];
  const continuation = (toolChunk: Record<string, unknown>) => [
    { type: "start" },
    toolChunk,
    { type: "start-step" },
    { type: "text-start", id: "t" },
    { type: "text-delta", id: "t", delta: "ok" },
    { type: "text-end", id: "t" },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];

  it.each([
    {
      decision: { approved: true },
      toolChunk: {
        type: "tool-output-available",
        toolCallId: "call_1",
        output: { deleted: true },
      },
      approval: { approved: true },
      result: { deleted: true },
    },
    {
      decision: { approved: false, reason: "not now" },
      toolChunk: { type: "tool-output-denied", toolCallId: "call_1" },
      approval: { approved: false, reason: "not now" },
      result: { error: "not now" },
    },
  ])(
    "shows a server tool approval and sends back $decision",
    async ({ decision, toolChunk, approval, result }) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(uiMessageStream(approvalRequest))
        .mockResolvedValueOnce(uiMessageStream(continuation(toolChunk)));
      vi.stubGlobal("fetch", fetchMock);
      const runtime = await mountRuntime(makeCloud());

      await act(async () => {
        await runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "Delete /tmp/a.txt" }],
        });
      });
      await waitFor(() => {
        expect(runtime.thread.getState().messages.at(-1)?.status).toEqual({
          type: "requires-action",
          reason: "tool-calls",
        });
      });
      const toolPart = runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("call_1");
      expect(toolPart.getState()).toMatchObject({
        status: { type: "requires-action" },
        approval: { id: "aitxt-1w6vi0Fered1RmYgbJWDbhzJ" },
      });

      await act(async () => {
        await toolPart.respondToToolApproval(decision);
      });
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(runtime.thread.getState().messages.at(-1)?.status?.type).toBe(
          "complete",
        );
      });

      const sent = requestOf(fetchMock.mock.calls[1]!).body.messages[1]
        .content[0];
      expect(sent).toMatchObject({
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "delete_file",
        args: { path: "/tmp/a.txt" },
      });
      expect(sent.approval).toEqual({
        id: "aitxt-1w6vi0Fered1RmYgbJWDbhzJ",
        signature: "7k2qAL3WgfPT0H4tuB9QTC8NAl-fp6siXIU6YqFc0tM",
        ...approval,
      });
      expect(sent).not.toHaveProperty("result");
      expect(sent).not.toHaveProperty("isError");

      expect(runtime.thread.getState().messages.at(-1)?.content).toEqual([
        expect.objectContaining({
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "delete_file",
          result,
        }),
        expect.objectContaining({ type: "text", text: "ok" }),
      ]);
    },
  );
});
