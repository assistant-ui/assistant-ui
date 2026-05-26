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
  execute: async () => ({ dateTime: "now" }),
};

const ToolRegistrar: FC = () => {
  useAssistantTool(timeTool);
  return null;
};

describe("useChatRuntime under useRemoteThreadListRuntime", () => {
  it("includes makeAssistantTool tools in the thread model context", async () => {
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const useThreadRuntime = () =>
      useChatRuntime({
        transport: new AssistantChatTransport({ api: "/api/chat" }),
      });

    const Inner: FC = () => {
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: useThreadRuntime,
        adapter: makeAdapter(),
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
  });
});
