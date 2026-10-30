// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { jsonSchema, streamText, tool } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDataStreamRuntime } from "./useDataStreamRuntime";

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const textResponse = () => ({
  stream: simulateReadableStream({
    chunks: [
      { type: "text-start" as const, id: "t" },
      { type: "text-delta" as const, id: "t", delta: "ok" },
      { type: "text-end" as const, id: "t" },
      {
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
      },
    ],
  }),
});

// An AI SDK 7 `streamText` endpoint whose model calls a `needsApproval` tool
// and, once the decision comes back, answers each later prompt in text.
const startServer = () => {
  const model = new MockLanguageModelV4({
    doStream: [
      {
        stream: simulateReadableStream({
          chunks: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "delete_file",
              input: JSON.stringify({ path: "/tmp/a.txt" }),
            },
            {
              type: "finish",
              finishReason: { unified: "tool-calls", raw: undefined },
              usage,
            },
          ],
        }),
      },
      textResponse(),
      textResponse(),
    ],
  });
  const execute = vi.fn(async () => ({ deleted: true }));
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const { messages } = JSON.parse(init.body as string);
    return streamText({
      model,
      messages,
      tools: {
        delete_file: tool({
          inputSchema: jsonSchema<{ path: string }>({
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          }),
          needsApproval: true,
          execute,
        }),
      },
      experimental_toolApprovalSecret: "secret",
    }).toUIMessageStreamResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  return { model, execute, fetchMock };
};

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDataStreamRuntime tool approvals", () => {
  it.each([
    {
      decision: { approved: true },
      executed: 1,
      output: { type: "json", value: { deleted: true } },
      response: { approved: true },
      result: { deleted: true },
    },
    {
      decision: { approved: false, reason: "not now" },
      executed: 0,
      output: { type: "execution-denied", reason: "not now" },
      response: { approved: false, reason: "not now" },
      result: { error: "not now" },
    },
  ])(
    "sends $decision back to an AI SDK server",
    async ({ decision, executed, output, response, result }) => {
      const { model, execute, fetchMock } = startServer();
      const runtime = await mountRuntime();

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
      const state = toolPart.getState();
      const approvalId =
        state.type === "tool-call" ? state.approval?.id : undefined;
      expect(approvalId).toEqual(expect.any(String));

      await act(async () => {
        await toolPart.respondToToolApproval(decision);
      });
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(runtime.thread.getState().messages.at(-1)?.status?.type).toBe(
          "complete",
        );
      });

      const sent = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
      expect(sent.messages.slice(1)).toEqual([
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "delete_file",
              input: { path: "/tmp/a.txt" },
            },
            {
              type: "tool-approval-request",
              approvalId,
              toolCallId: "call_1",
              signature: expect.any(String),
            },
          ],
        },
        {
          role: "tool",
          content: [
            { type: "tool-approval-response", approvalId, ...response },
            ...(decision.approved
              ? []
              : [
                  {
                    type: "tool-result",
                    toolCallId: "call_1",
                    toolName: "delete_file",
                    output,
                  },
                ]),
          ],
        },
      ]);

      expect(execute).toHaveBeenCalledTimes(executed);
      expect(model.doStreamCalls[1]!.prompt.at(-1)).toMatchObject({
        role: "tool",
        content: [{ type: "tool-result", toolCallId: "call_1", output }],
      });
      expect(toolPart.getState()).toMatchObject({ result });
      expect(
        runtime.thread.getState().messages.at(-1)?.content.at(-1),
      ).toMatchObject({ type: "text", text: "ok" });

      await act(async () => {
        await runtime.thread.append({
          role: "user",
          content: [{ type: "text", text: "Thanks" }],
        });
      });
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(runtime.thread.getState().messages.at(-1)?.status?.type).toBe(
          "complete",
        );
      });

      expect(execute).toHaveBeenCalledTimes(executed);
      expect(model.doStreamCalls[2]!.prompt).toContainEqual(
        expect.objectContaining({
          role: "tool",
          content: [expect.objectContaining({ toolCallId: "call_1", output })],
        }),
      );
    },
  );
});
