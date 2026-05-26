// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAssistantTool,
} from "@assistant-ui/core/react";
import type {
  RemoteThreadListAdapter,
  AssistantRuntime,
} from "@assistant-ui/core";
import { useChatRuntime } from "./useChatRuntime";
import { AssistantChatTransport } from "./AssistantChatTransport";

const makeAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: threadId,
    externalId: threadId,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(
    async () =>
      new ReadableStream({
        start(c) {
          c.close();
        },
      }) as never,
  ),
  fetch: vi.fn(async (id: string) => ({
    status: "regular" as const,
    remoteId: id,
    externalId: id,
    title: "Test",
  })),
});

const timeTool = {
  toolName: "get_local_time",
  type: "frontend" as const,
  description: "Get current local time",
  parameters: {
    type: "object" as const,
    properties: {
      format: { type: "string" as const, enum: ["iso", "time", "dateTime"] },
    },
  },
  execute: async () => ({ dateTime: "now" }),
};

const ToolRegistrar: FC = () => {
  useAssistantTool(timeTool);
  return null;
};

const emptyStreamResponse = () =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );

describe("useChatRuntime under useRemoteThreadListRuntime", () => {
  it("sends makeAssistantTool tools in the AssistantChatTransport request body", async () => {
    let sentTools: Record<string, unknown> | undefined;

    const transport = new AssistantChatTransport({
      api: "/api/chat",
      // captures the serialized HTTP body — the tools field #4101 reports as
      // empty, built from the inner useAISDKRuntime model context.
      fetch: vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        sentTools = body.tools;
        return emptyStreamResponse();
      }),
    });

    const adapter = makeAdapter();
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const useThreadRuntime = () => useChatRuntime({ transport });

    const Inner: FC = () => {
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: useThreadRuntime,
        adapter,
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ToolRegistrar />
        </AssistantRuntimeProvider>
      );
    };

    await act(async () => {
      render(<Inner />);
    });

    await waitFor(() => {
      const tools = runtimeRef.current?.thread.getModelContext().tools ?? {};
      expect(Object.keys(tools)).toContain("get_local_time");
    });

    await act(async () => {
      await runtimeRef.current?.thread.append({
        role: "user",
        content: [{ type: "text", text: "what time is it?" }],
      });
    });

    await waitFor(() => {
      expect(Object.keys(sentTools ?? {})).toContain("get_local_time");
    });
  });
});
