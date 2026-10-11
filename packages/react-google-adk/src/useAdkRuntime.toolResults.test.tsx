// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { createAdkStream } from "./AdkClient";
import { useAdkRuntime } from "./useAdkRuntime";
import { settleOutsideAct } from "./tests/settleOutsideAct";
import type { AdkEvent } from "./types";

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "ADK session",
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
    title: "ADK session",
  })),
});

const toolCallEvent: AdkEvent = {
  id: "tool-calls",
  invocationId: "run-1",
  author: "agent",
  longRunningToolIds: ["c1", "c2"],
  content: {
    role: "model",
    parts: [
      { functionCall: { id: "c1", name: "lookup", args: {} } },
      { functionCall: { id: "c2", name: "lookup", args: {} } },
    ],
  },
};

const mount = async (holdFirstRun = false) => {
  const requests: { newMessage: { parts: Record<string, unknown>[] } }[] = [];
  let closeFirstRun!: () => void;
  let publishFirstRun!: (event: AdkEvent) => void;
  const firstRun = new ReadableStream<Uint8Array>({
    start(controller) {
      publishFirstRun = (event) =>
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(toolCallEvent)}\n\n`),
      );
      closeFirstRun = () => controller.close();
      if (!holdFirstRun) controller.close();
    },
  });
  const fetchStub = vi.fn(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(JSON.parse(init!.body as string));
      return new Response(requests.length === 1 ? firstRun : "", {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchStub);
  const capture: { runtime: AssistantRuntime | null } = { runtime: null };
  const Inner = () => {
    const runtime = useAdkRuntime({
      stream: createAdkStream({
        api: "http://localhost:8000",
        appName: "app",
        userId: "user",
      }),
      sessionAdapter: makeThreadListAdapter(),
      unstable_allowCancellation: true,
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  await act(async () => {
    render(<Inner />);
  });
  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("adk-1"),
  );
  act(() => {
    capture.runtime!.thread.append({
      role: "user",
      content: [{ type: "text", text: "start" }],
    });
  });
  await waitFor(() => {
    expect(requests).toHaveLength(1);
    expect(
      capture
        .runtime!.thread.getState()
        .messages.some((message) =>
          message.content.some(
            (part) => part.type === "tool-call" && part.toolCallId === "c2",
          ),
        ),
    ).toBe(true);
  });
  return {
    runtime: capture.runtime!,
    requests,
    closeFirstRun,
    publishFirstRun,
  };
};

const answer = (runtime: AssistantRuntime, id: string) => {
  const index = runtime.thread
    .getState()
    .messages.findIndex((message) =>
      message.content.some(
        (part) => part.type === "tool-call" && part.toolCallId === id,
      ),
    );
  runtime.thread
    .getMessageByIndex(index)
    .getMessagePartByToolCallId(id)
    .addToolResult({ value: id });
};

const responseIds = (parts: Record<string, unknown>[]) =>
  parts.flatMap((part) => {
    const response = part.functionResponse as { id: string } | undefined;
    return response ? [response.id] : [];
  });

afterEach(() => vi.unstubAllGlobals());

describe("useAdkRuntime tool result batching", () => {
  it("sends two answers from one event in one request and call order", async () => {
    const { runtime, requests } = await mount();
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() => {
      answer(runtime, "c2");
      answer(runtime, "c1");
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c2"]);
  });

  it("holds an answer until its producing run ends", async () => {
    const { runtime, requests, closeFirstRun } = await mount(true);
    expect(runtime.thread.getState().isRunning).toBe(true);

    act(() => {
      answer(runtime, "c1");
      answer(runtime, "c2");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(requests).toHaveLength(1);

    await act(async () => {
      closeFirstRun();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c2"]);
  });

  it("keeps a held answer visible when its run publishes another snapshot", async () => {
    const { runtime, publishFirstRun } = await mount(true);

    act(() => answer(runtime, "c1"));
    const heldResult = () =>
      runtime.thread
        .getState()
        .messages.flatMap((message) =>
          message.role === "assistant" ? message.content : [],
        )
        .find((part) => part.type === "tool-call" && part.toolCallId === "c1");
    await waitFor(() =>
      expect(heldResult()).toMatchObject({ result: '{"value":"c1"}' }),
    );

    act(() =>
      publishFirstRun({
        id: "progress",
        invocationId: "run-1",
        author: "agent",
        content: { role: "model", parts: [{ text: "working" }] },
      }),
    );
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "text" && part.text === "working",
            ),
          ),
      ).toBe(true),
    );
    expect(heldResult()).toMatchObject({ result: '{"value":"c1"}' });
  });

  it("sends a buffered answer before a new user message", async () => {
    const { runtime, requests } = await mount();
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() => {
      answer(runtime, "c2");
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      });
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    const parts = requests[1]!.newMessage.parts;
    expect(responseIds(parts)).toEqual(["c2"]);
    expect(parts.at(-1)).toEqual({ text: "next" });
  });

  it("drops an answer buffered during a cancelled run", async () => {
    const { runtime, requests } = await mount(true);
    act(() => answer(runtime, "c1"));
    await act(async () => {
      await runtime.thread.cancelRun();
    });
    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      });
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c2"]);
    expect(JSON.stringify(requests[1]!.newMessage.parts)).not.toContain(
      '"value"',
    );
  });
});
