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
import { useAdkSubmitInput } from "./hooks";
import { settleOutsideAct } from "./tests/settleOutsideAct";
import type { AdkEvent } from "./types";
import type { AdkThreadSnapshot } from "./types";

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

const callEvent = (id: string, run: string): AdkEvent => ({
  id: `event-${id}`,
  invocationId: run,
  author: "agent",
  longRunningToolIds: [id],
  content: {
    role: "model",
    parts: [{ functionCall: { id, name: "lookup", args: {} } }],
  },
});

const inputCallEvent = (id: string, run: string): AdkEvent => ({
  ...callEvent(id, run),
  content: {
    role: "model",
    parts: [{ functionCall: { id, name: "adk_request_input", args: {} } }],
  },
});

const mount = async (
  holdFirstRun = false,
  options: {
    firstEvent?: AdkEvent;
    secondEvent?: AdkEvent;
    responseEvents?: (AdkEvent | null)[];
    waitForCall?: string | null;
    autoCancelPendingToolCalls?: boolean;
    load?: () => Promise<AdkThreadSnapshot>;
    holdSecondRun?: boolean;
  } = {},
) => {
  const requests: { newMessage: { parts: Record<string, unknown>[] } }[] = [];
  let closeFirstRun!: () => void;
  let publishFirstRun!: (event: AdkEvent) => void;
  const firstRun = new ReadableStream<Uint8Array>({
    start(controller) {
      publishFirstRun = (event) =>
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      const initialEvent = options.responseEvents
        ? options.responseEvents[0]
        : (options.firstEvent ?? toolCallEvent);
      if (initialEvent) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(initialEvent)}\n\n`),
        );
      }
      closeFirstRun = () => controller.close();
      if (!holdFirstRun) controller.close();
    },
  });
  const fetchStub = vi.fn(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(JSON.parse(init!.body as string));
      const responseEvent =
        options.responseEvents?.[requests.length - 1] ??
        (requests.length === 2 ? options.secondEvent : undefined);
      const response =
        requests.length === 1
          ? firstRun
          : requests.length === 2 && options.holdSecondRun
            ? new ReadableStream<Uint8Array>({
                start(controller) {
                  if (responseEvent) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify(responseEvent)}\n\n`,
                      ),
                    );
                  }
                },
              })
            : options.responseEvents
              ? responseEvent
                ? `data: ${JSON.stringify(responseEvent)}\n\n`
                : ""
              : requests.length === 2 && options.secondEvent
                ? `data: ${JSON.stringify(options.secondEvent)}\n\n`
                : "";
      return new Response(response, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchStub);
  const capture: {
    runtime: AssistantRuntime | null;
    submitInput: ((toolCallId: string, result: string) => Promise<void>) | null;
  } = { runtime: null, submitInput: null };
  const stream = createAdkStream({
    api: "http://localhost:8000",
    appName: "app",
    userId: "user",
  });
  const sessionAdapter = makeThreadListAdapter();
  const SubmitInput = () => {
    capture.submitInput = useAdkSubmitInput();
    return null;
  };
  const Inner = () => {
    const runtime = useAdkRuntime({
      stream,
      sessionAdapter,
      unstable_allowCancellation: true,
      autoCancelPendingToolCalls: options.autoCancelPendingToolCalls,
      ...(options.load && { load: options.load }),
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <SubmitInput />
      </AssistantRuntimeProvider>
    );
  };
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<Inner />);
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
  await waitFor(() => expect(requests).toHaveLength(1));
  if (options.waitForCall !== null) {
    await waitFor(() => {
      expect(
        capture
          .runtime!.thread.getState()
          .messages.some((message) =>
            message.content.some(
              (part) =>
                part.type === "tool-call" &&
                part.toolCallId === (options.waitForCall ?? "c2"),
            ),
          ),
      ).toBe(true);
    });
  }
  return {
    runtime: capture.runtime!,
    submitInput: capture.submitInput!,
    requests,
    closeFirstRun,
    publishFirstRun,
    unmount: () => view.unmount(),
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
  it("clears a queued tool answer when Stop cancels an earlier run", async () => {
    const { runtime, requests } = await mount(false, {
      firstEvent: callEvent("c1", "run-1"),
      waitForCall: "c1",
      holdSecondRun: true,
      autoCancelPendingToolCalls: false,
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
        runConfig: { custom: { group: "other" } },
      });
      answer(runtime, "c1");
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual([]);
    await act(async () => {
      await runtime.thread.cancelRun();
    });
    expect(requests).toHaveLength(2);
    const toolMessage = runtime.thread
      .getState()
      .messages.find((message) =>
        message.content.some(
          (part) => part.type === "tool-call" && part.toolCallId === "c1",
        ),
      );
    expect(toolMessage).toBeDefined();
    expect(toolMessage?.content).toContainEqual(
      expect.objectContaining({ type: "tool-call", toolCallId: "c1" }),
    );
    expect(JSON.stringify(toolMessage?.content)).not.toContain('"result"');
  });

  it("sends two messages appended in the same tick in one request", async () => {
    const { runtime, requests } = await mount();
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() => {
      void runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "first" }],
      });
      void runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      });
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(
      requests[1]!.newMessage.parts.flatMap((part) =>
        typeof part.text === "string" ? [part.text] : [],
      ),
    ).toEqual(["first", "second"]);
  });

  it("sends same-tick HITL replies in one request", async () => {
    const { runtime, submitInput, requests } = await mount(false, {
      firstEvent: {
        ...toolCallEvent,
        content: {
          role: "model",
          parts: [
            { functionCall: { id: "c1", name: "adk_request_input", args: {} } },
            { functionCall: { id: "c2", name: "adk_request_input", args: {} } },
          ],
        },
      },
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    await act(async () => {
      await Promise.all([
        submitInput("c1", "first"),
        submitInput("c2", "second"),
      ]);
    });
    expect(requests).toHaveLength(2);
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c2"]);
  });

  it("splits same-tick HITL replies from different producing runs", async () => {
    const { runtime, submitInput, requests } = await mount(false, {
      firstEvent: inputCallEvent("c1", "run-1"),
      secondEvent: inputCallEvent("c2", "run-2"),
      waitForCall: "c1",
      autoCancelPendingToolCalls: false,
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      }),
    );
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === "c2",
            ),
          ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    await act(async () => {
      await Promise.all([
        submitInput("c1", "first"),
        submitInput("c2", "second"),
      ]);
    });
    expect(requests).toHaveLength(4);
    expect(responseIds(requests[2]!.newMessage.parts)).toEqual(["c1"]);
    expect(responseIds(requests[3]!.newMessage.parts)).toEqual(["c2"]);
  });

  it("splits buffered replies from different runs when starting a new turn", async () => {
    const { runtime, submitInput, requests } = await mount(false, {
      firstEvent: inputCallEvent("c1", "run-1"),
      secondEvent: inputCallEvent("c2", "run-2"),
      waitForCall: "c1",
      holdSecondRun: true,
      autoCancelPendingToolCalls: false,
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      }),
    );
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === "c2",
            ),
          ),
      ).toBe(true),
    );

    await act(async () => {
      await Promise.all([
        submitInput("c1", "first"),
        submitInput("c2", "second"),
      ]);
    });
    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "third" }],
      }),
    );

    await waitFor(() => expect(requests).toHaveLength(4));
    expect(responseIds(requests[2]!.newMessage.parts)).toEqual(["c1"]);
    expect(responseIds(requests[3]!.newMessage.parts)).toEqual(["c2"]);
    expect(requests[3]!.newMessage.parts).toContainEqual({ text: "third" });
  });

  it("splits a new turn's loaded replies by assistant message", async () => {
    const { runtime, submitInput, requests } = await mount(true, {
      load: async () => ({
        messages: ["c1", "c2"].map((id) => ({
          id: `loaded-${id}`,
          type: "ai",
          content: "",
          tool_calls: [{ id, name: "adk_request_input", args: {} }],
        })),
        longRunningToolIds: ["c1", "c2"],
      }),
      responseEvents: [null],
      waitForCall: null,
      autoCancelPendingToolCalls: false,
    });
    await act(async () => {
      await Promise.all([
        submitInput("c1", "first"),
        submitInput("c2", "second"),
      ]);
    });
    expect(requests).toHaveLength(1);

    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      });
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1"]);
    expect(responseIds(requests[2]!.newMessage.parts)).toEqual(["c2"]);
    expect(requests[2]!.newMessage.parts).toContainEqual({ text: "next" });
  });

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

  it.each(["answer-first", "append-first"] as const)(
    "batches a HITL answer and a new user message in either order (%s)",
    async (order) => {
      const { runtime, requests, submitInput } = await mount(false, {
        firstEvent: {
          ...callEvent("c1", "run-1"),
          content: {
            role: "model",
            parts: [
              {
                functionCall: {
                  id: "c1",
                  name: "adk_request_input",
                  args: {},
                },
              },
            ],
          },
        },
        waitForCall: "c1",
      });
      await waitFor(() =>
        expect(runtime.thread.getState().isRunning).toBe(false),
      );

      let answerPromise!: Promise<void>;
      act(() => {
        const append = () =>
          runtime.thread.append({
            role: "user",
            content: [{ type: "text", text: "next" }],
          });
        if (order === "answer-first") {
          answerPromise = submitInput("c1", "answer");
          append();
        } else {
          append();
          answerPromise = submitInput("c1", "answer");
        }
      });

      await waitFor(() => expect(requests).toHaveLength(2));
      await act(async () => answerPromise);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(requests).toHaveLength(2);
      expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1"]);
      expect(requests[1]!.newMessage.parts).toContainEqual({ text: "next" });
    },
  );

  it("keeps same-tick config groups' tool answers with their own runs", async () => {
    const { runtime, requests } = await mount(false, {
      responseEvents: [
        null,
        callEvent("group-a", "adk-run-a"),
        callEvent("group-b", "adk-run-b"),
      ],
      waitForCall: null,
      autoCancelPendingToolCalls: false,
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );

    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "config-a" }],
        runConfig: { custom: { group: "a" } },
      });
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "config-b" }],
        runConfig: { custom: { group: "b" } },
      });
    });

    await waitFor(() => expect(requests).toHaveLength(3));
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) =>
                part.type === "tool-call" && part.toolCallId === "group-b",
            ),
          ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "group-a"));
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(responseIds(requests[3]!.newMessage.parts)).toEqual(["group-a"]);

    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "group-b"));
    await waitFor(() => expect(requests).toHaveLength(5));
    expect(responseIds(requests[4]!.newMessage.parts)).toEqual(["group-b"]);
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

  it("sends an answer to a call produced later in the same run", async () => {
    const { runtime, requests, publishFirstRun, closeFirstRun } = await mount(
      true,
      { firstEvent: callEvent("c1", "run-1"), waitForCall: "c1" },
    );
    act(() => answer(runtime, "c1"));
    act(() => publishFirstRun(callEvent("c3", "run-1")));
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === "c3",
            ),
          ),
      ).toBe(true),
    );
    act(() => answer(runtime, "c3"));
    expect(requests).toHaveLength(1);
    await act(async () => closeFirstRun());
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c3"]);
  });

  it("groups answers by the run that produced them", async () => {
    const { runtime, requests } = await mount(false, {
      firstEvent: callEvent("c1", "run-1"),
      secondEvent: callEvent("c2", "run-2"),
      waitForCall: "c1",
      autoCancelPendingToolCalls: false,
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "second" }],
      }),
    );
    await waitFor(() =>
      expect(
        runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "tool-call" && part.toolCallId === "c2",
            ),
          ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "c2"));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(responseIds(requests[2]!.newMessage.parts)).toEqual(["c2"]);

    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "c1"));
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(responseIds(requests[3]!.newMessage.parts)).toEqual(["c1"]);
  });

  it("holds answers from an errored run until the next user turn", async () => {
    const { runtime, requests, publishFirstRun, closeFirstRun } =
      await mount(true);
    act(() => {
      answer(runtime, "c1");
      answer(runtime, "c2");
      publishFirstRun({
        id: "error",
        invocationId: "run-1",
        author: "agent",
        errorMessage: "run failed",
      });
    });
    await act(async () => closeFirstRun());
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    expect(requests).toHaveLength(1);
    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1", "c2"]);
    expect(requests[1]!.newMessage.parts.at(-1)).toEqual({ text: "next" });
  });

  it("drops held answers on reload", async () => {
    const { runtime, requests } = await mount(false, {
      load: async () => ({ messages: [] }),
    });
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "c1"));
    await settleOutsideAct(() => runtime.threads.reloadMainThread());
    act(() =>
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual([]);
  });

  it("keeps a held answer across a thread switch", async () => {
    const { runtime, requests } = await mount(false);
    await waitFor(() =>
      expect(runtime.thread.getState().isRunning).toBe(false),
    );
    act(() => answer(runtime, "c1"));

    await settleOutsideAct(() => runtime.threads.switchToNewThread());
    await settleOutsideAct(() => runtime.threads.switchToThread("adk-1"));
    act(() => {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: "next" }],
      });
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(responseIds(requests[1]!.newMessage.parts)).toEqual(["c1"]);
  });

  it("drops held answers on unmount", async () => {
    const { runtime, requests, unmount, closeFirstRun } = await mount(true);
    act(() => answer(runtime, "c1"));
    act(() => answer(runtime, "c2"));
    act(() => unmount());
    await act(async () => closeFirstRun());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(1);
  });
});
