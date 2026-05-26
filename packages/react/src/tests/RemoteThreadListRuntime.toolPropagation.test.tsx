// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it } from "vitest";
import {
  useRemoteThreadListRuntime,
  useRuntimeAdapters,
  useAssistantTool,
} from "@assistant-ui/core/react";
import { makeAdapter } from "./remote-thread-list-test-helpers";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { AssistantRuntimeProvider } from "../context";
import type { ChatModelAdapter } from "../index";
import type { ModelContextProvider } from "@assistant-ui/core";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

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

describe("tool propagation through useRemoteThreadListRuntime runtimeHook", () => {
  it("includes outer-registered tools in the inner thread runtime model context", async () => {
    const capture: { modelContext: ModelContextProvider | undefined } = {
      modelContext: undefined,
    };

    const runtimeHook = function useTestRuntimeHook() {
      capture.modelContext = useRuntimeAdapters()?.modelContext;
      // useLocalRuntime itself nests a remote-thread-list with allowNesting,
      // mirroring useChatRuntime's structure in the issue.
      return useLocalRuntime(noOpAdapter);
    };

    const adapter = makeAdapter();

    const Inner: FC = () => {
      const runtime = useRemoteThreadListRuntime({ runtimeHook, adapter });
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
      const tools = capture.modelContext?.getModelContext().tools ?? {};
      expect(Object.keys(tools)).toContain("get_local_time");
    });
  });
});
