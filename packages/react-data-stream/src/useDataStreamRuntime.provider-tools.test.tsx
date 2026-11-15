// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDataStreamRuntime } from "./useDataStreamRuntime";

const sse = (chunks: readonly object[]) =>
  new Response(
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
      "data: [DONE]\n\n",
    {
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    },
  );

const mountRuntime = async () => {
  let runtime: ReturnType<typeof useDataStreamRuntime> | null = null;
  const App = () => {
    runtime = useDataStreamRuntime({ api: "/api/chat" });
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

const registerFrontendTool = (
  runtime: ReturnType<typeof useDataStreamRuntime>,
  toolName: string,
) => {
  const execute = vi.fn(async () => ({ from: "frontend" }));
  runtime.registerModelContextProvider({
    getModelContext: () => ({
      tools: {
        [toolName]: {
          parameters: { type: "object", properties: {} },
          execute,
        },
      },
    }),
  });
  return execute;
};

const send = async (runtime: ReturnType<typeof useDataStreamRuntime>) => {
  await act(async () => {
    await runtime.thread.append({
      role: "user",
      content: [{ type: "text", text: "Search" }],
    });
  });
  await waitFor(() => {
    expect(runtime.thread.getState().isRunning).toBe(false);
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDataStreamRuntime backend-owned tool calls", () => {
  const input = (extra: object) => [
    { type: "start", messageId: "m1" },
    {
      type: "tool-input-start",
      toolCallId: "call_1",
      toolName: "web_search",
      ...extra,
    },
    {
      type: "tool-input-available",
      toolCallId: "call_1",
      toolName: "web_search",
      input: { query: "weather" },
      ...extra,
    },
  ];

  it.each([
    { name: "provider-executed", extra: { providerExecuted: true } },
    { name: "dynamic", extra: { dynamic: true } },
  ])(
    "keeps the server's result for a $name call without steps",
    async ({ extra }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          sse([
            ...input(extra),
            {
              type: "tool-output-available",
              toolCallId: "call_1",
              output: { from: "server" },
              ...extra,
            },
            { type: "finish" },
          ]),
        ),
      );
      const runtime = await mountRuntime();
      const execute = registerFrontendTool(runtime, "web_search");

      await send(runtime);

      expect(execute).not.toHaveBeenCalled();
      expect(
        runtime.thread
          .getMessageByIndex(1)
          .getMessagePartByToolCallId("call_1")
          .getState(),
      ).toMatchObject({ result: { from: "server" } });
    },
  );

  it.each([
    { name: "provider-executed", extra: { providerExecuted: true } },
    { name: "dynamic", extra: { dynamic: true } },
  ])(
    "leaves a $name call without a result to the server",
    async ({ extra }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          sse([
            { type: "start", messageId: "m1" },
            { type: "start-step" },
            ...input(extra).slice(1),
            { type: "finish-step" },
            { type: "finish" },
          ]),
        ),
      );
      const runtime = await mountRuntime();
      const execute = registerFrontendTool(runtime, "web_search");

      await send(runtime);

      expect(execute).not.toHaveBeenCalled();
      expect(
        runtime.thread
          .getMessageByIndex(1)
          .getMessagePartByToolCallId("call_1")
          .getState(),
      ).not.toHaveProperty("result");
    },
  );

  it("still runs a frontend tool the server hands to the client", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn(async () => sse([{ type: "start" }, { type: "finish" }]))
        .mockImplementationOnce(async () =>
          sse([
            { type: "start", messageId: "m1" },
            { type: "start-step" },
            ...input({}).slice(1),
            { type: "finish-step" },
            { type: "finish" },
          ]),
        ),
    );
    const runtime = await mountRuntime();
    const execute = registerFrontendTool(runtime, "web_search");

    await send(runtime);

    await waitFor(() => {
      expect(execute).toHaveBeenCalledOnce();
    });
  });
});
