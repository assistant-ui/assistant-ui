// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useAssistantTool,
} from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import type { AdkEvent } from "./types";

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "Existing ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({ remoteId: "adk-1", externalId: "adk-1" })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "Existing ADK session",
  })),
});

const toolCalls = (runtime: AssistantRuntime): ToolCallMessagePart[] =>
  runtime.thread
    .getState()
    .messages.flatMap((message) => message.content as readonly unknown[])
    .filter(
      (part): part is ToolCallMessagePart =>
        (part as ToolCallMessagePart).type === "tool-call",
    );

const GATED_CALL = {
  id: "adk-original-1",
  name: "delete_file",
  args: { path: "/tmp/a" },
};

const callEvent = (longRunningToolIds?: string[]): AdkEvent => ({
  id: "ev-1",
  invocationId: "inv-1",
  author: "agent",
  content: { role: "model", parts: [{ functionCall: GATED_CALL }] },
  ...(longRunningToolIds && { longRunningToolIds }),
});

const confirmationEvent = (): AdkEvent => ({
  id: "ev-2",
  invocationId: "inv-1",
  author: "agent",
  content: {
    role: "model",
    parts: [
      {
        functionCall: {
          id: "adk-confirmation-1",
          name: "adk_request_confirmation",
          args: {
            originalFunctionCall: GATED_CALL,
            toolConfirmation: { hint: "Delete /tmp/a?" },
          },
        },
      },
    ],
  },
  longRunningToolIds: ["adk-confirmation-1"],
});

const serverResultEvent = (): AdkEvent => ({
  id: "ev-2",
  invocationId: "inv-1",
  author: "agent",
  content: {
    role: "user",
    parts: [
      {
        functionResponse: {
          id: "adk-original-1",
          name: "delete_file",
          response: { server: "deleted" },
        },
      },
    ],
  },
});

/**
 * Streams `first`, hands control back so the window between the two events is
 * observable, then streams `second` once the returned `release` is called.
 */
const renderStreamingAdk = async (first: AdkEvent, second: AdkEvent) => {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let firstDelivered!: () => void;
  const firstDeliveredP = new Promise<void>((r) => (firstDelivered = r));

  const stream = vi.fn(async function* (): AsyncGenerator<AdkEvent> {
    yield first;
    firstDelivered();
    await held;
    yield second;
  });

  const execute = vi.fn(async () => ({ deleted: true }));
  const capture: { runtime: AssistantRuntime | null } = { runtime: null };

  const DeleteFileTool = () => {
    useAssistantTool({
      toolName: "delete_file",
      description: "delete a file",
      parameters: {
        type: "object" as const,
        properties: { path: { type: "string" } },
      },
      execute,
    });
    return null;
  };

  const Inner: FC = () => {
    const runtime = useAdkRuntime({
      stream: stream as never,
      sessionAdapter: makeThreadListAdapter(),
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <DeleteFileTool />
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    render(<Inner />);
  });
  await waitFor(() => expect(capture.runtime).not.toBeNull());
  await act(async () => {
    await capture.runtime!.threads.switchToThread("adk-1");
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  await act(async () => {
    void capture.runtime!.thread.append({
      role: "user",
      content: [{ type: "text", text: "delete it" }],
    });
    await firstDeliveredP;
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  const settle = async () => {
    await act(async () => {
      release();
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  return { capture, execute, settle };
};

describe("useAdkRuntime tool ownership", () => {
  it("does not run a frontend execute on a call ADK is about to gate", async () => {
    const { capture, execute, settle } = await renderStreamingAdk(
      callEvent(),
      confirmationEvent(),
    );

    const inWindow = toolCalls(capture.runtime!)[0]!;
    expect(inWindow.argsText).toBe('{"path":"/tmp/a"}');
    expect(inWindow.approval).toBeUndefined();
    expect(inWindow.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();

    await settle();

    const gated = toolCalls(capture.runtime!).find(
      (part) => part.toolCallId === "adk-original-1",
    )!;
    expect(gated.approval).toEqual({ id: "adk-confirmation-1" });
    expect(gated.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not run a frontend execute on a call ADK resolves itself", async () => {
    const { capture, execute, settle } = await renderStreamingAdk(
      callEvent(),
      serverResultEvent(),
    );

    expect(toolCalls(capture.runtime!)[0]!.result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();

    await settle();

    expect(toolCalls(capture.runtime!)[0]!.result).toBe('{"server":"deleted"}');
    expect(execute).not.toHaveBeenCalled();
  });

  it("runs a frontend execute on a call ADK marks long-running", async () => {
    const { capture, execute } = await renderStreamingAdk(
      callEvent(["adk-original-1"]),
      serverResultEvent(),
    );

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(toolCalls(capture.runtime!)[0]!.result).toBeDefined(),
    );
  });
});
