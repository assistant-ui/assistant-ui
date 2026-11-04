// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { MessageNotSentError } from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import { useAdkSend, useAdkSubmitInput } from "./hooks";
import { settleOutsideAct } from "./tests/settleOutsideAct";
import type { AdkEvent, AdkMessage, AdkStreamCallback } from "./types";

const sessionAdapter: RemoteThreadListAdapter = {
  list: async () => ({
    threads: [
      {
        status: "regular",
        remoteId: "thread",
        externalId: "thread",
        title: "Thread",
      },
    ],
  }),
  initialize: async () => ({ remoteId: "thread", externalId: "thread" }),
  rename: async () => {},
  archive: async () => {},
  unarchive: async () => {},
  delete: async () => {},
  generateTitle: async () => new ReadableStream() as never,
  fetch: async () => ({
    status: "regular",
    remoteId: "thread",
    externalId: "thread",
    title: "Thread",
  }),
};

const call = (id: string, run: string, pendingCall = false): AdkEvent => ({
  id: `event-${id}`,
  invocationId: run,
  author: "agent",
  ...(!pendingCall && { longRunningToolIds: [id] }),
  content: {
    role: "model",
    parts: [
      {
        functionCall: {
          id,
          name: pendingCall ? "lookup" : "adk_request_input",
          args: {},
        },
      },
    ],
  },
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const mount = async (
  behavior: "fail" | "fail-second" | "stop" | "stop-last" | "success",
  getCheckpointId?: () => Promise<null>,
  options: { pendingCalls?: boolean } = {},
) => {
  const requests: AdkMessage[][] = [];
  const firstGroupEntered = deferred();
  const holdFirstGroup = deferred();
  const firstGroupFailure = new Error("first group failed");
  const stream: AdkStreamCallback = async function* (
    messages,
    { abortSignal },
  ) {
    requests.push(messages);
    if (requests.length === 1) {
      yield call("c1", "run-1", options.pendingCalls);
    } else if (requests.length === 2) {
      yield call("c2", "run-2", options.pendingCalls);
      await new Promise<void>((resolve) =>
        abortSignal.addEventListener("abort", () => resolve(), { once: true }),
      );
    } else if (requests.length === 3) {
      firstGroupEntered.resolve();
      if (behavior === "fail") throw firstGroupFailure;
      if (behavior === "stop") {
        yield {
          id: "group-progress",
          invocationId: "run-3",
          author: "agent",
          content: { role: "model", parts: [{ text: "working" }] },
        };
        await new Promise<void>((resolve) =>
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        );
      }
      await holdFirstGroup.promise;
    } else if (requests.length === 4) {
      if (behavior === "fail-second") throw new Error("second group failed");
      if (behavior === "stop-last") {
        yield {
          id: "last-group-progress",
          invocationId: "run-4",
          author: "agent",
          content: { role: "model", parts: [{ text: "last group working" }] },
        };
        await new Promise<void>((resolve) =>
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        );
      }
    }
  };
  const capture: {
    runtime: AssistantRuntime | null;
    submitInput: ReturnType<typeof useAdkSubmitInput> | null;
    send: ReturnType<typeof useAdkSend> | null;
  } = { runtime: null, submitInput: null, send: null };
  let autoCancelPendingToolCalls = false;
  const SubmitInput = () => {
    capture.submitInput = useAdkSubmitInput();
    capture.send = useAdkSend();
    return null;
  };
  const Inner = () => {
    const runtime = useAdkRuntime({
      stream,
      sessionAdapter,
      unstable_allowCancellation: true,
      ...(!autoCancelPendingToolCalls && { autoCancelPendingToolCalls: false }),
      ...(getCheckpointId && { getCheckpointId }),
    });
    capture.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <SubmitInput />
      </AssistantRuntimeProvider>
    );
  };
  const view = render(<Inner />);
  await settleOutsideAct(() =>
    capture.runtime!.threads.switchToThread("thread"),
  );
  act(() =>
    capture.runtime!.thread.append({
      role: "user",
      content: [{ type: "text", text: "start" }],
    }),
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  await waitFor(() =>
    expect(capture.runtime!.thread.getState().isRunning).toBe(false),
  );
  act(() =>
    capture.runtime!.thread.append({
      role: "user",
      content: [{ type: "text", text: "second" }],
    }),
  );
  await waitFor(() => expect(requests).toHaveLength(2));
  await waitFor(() =>
    expect(
      capture
        .runtime!.thread.getState()
        .messages.some((m) =>
          m.content.some(
            (p) => p.type === "tool-call" && p.toolCallId === "c2",
          ),
        ),
    ).toBe(true),
  );
  if (options.pendingCalls) {
    autoCancelPendingToolCalls = true;
    act(() => view.rerender(<Inner />));
  } else {
    await act(async () => {
      await Promise.all([
        capture.submitInput!("c1", "first"),
        capture.submitInput!("c2", "second"),
      ]);
    });
  }
  return {
    runtime: capture.runtime!,
    requests,
    send: capture.send!,
    firstGroupFailure,
    firstGroupEntered,
    holdFirstGroup,
    unmount: () => view.unmount(),
  };
};

const reply = (runtime: AssistantRuntime, id: string) =>
  runtime.thread
    .getState()
    .messages.map((message) =>
      message.content.findLast(
        (part) => part.type === "tool-call" && part.toolCallId === id,
      ),
    )
    .findLast((part) => part !== undefined);

const sendDraft = (runtime: AssistantRuntime) =>
  act(() => {
    runtime.thread.composer.setText("third");
    runtime.thread.composer.send();
  });

describe("useAdkRuntime split new turns", () => {
  it("preserves the first group failure as the cause when the human group never starts", async () => {
    const h = await mount("fail", undefined, { pendingCalls: true });
    const result = h.send(
      [
        {
          id: "reply-c1",
          type: "tool",
          tool_call_id: "c1",
          name: "lookup",
          content: '{"result":"first"}',
          status: "success",
        },
        {
          id: "reply-c2",
          type: "tool",
          tool_call_id: "c2",
          name: "lookup",
          content: '{"result":"second"}',
          status: "success",
        },
        { id: "human-third", type: "human", content: "third" },
      ],
      {},
    );
    await expect(result).rejects.toBeInstanceOf(MessageNotSentError);
    await expect(result).rejects.toHaveProperty("cause", h.firstGroupFailure);
    h.unmount();
  });

  it("shows every queued group while the first group streams", async () => {
    const h = await mount("success");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await waitFor(() =>
      expect(
        h.runtime.thread
          .getState()
          .messages.some(
            (message) =>
              message.role === "user" &&
              message.content.some(
                (part) => part.type === "text" && part.text === "third",
              ),
          ),
      ).toBe(true),
    );
    expect(reply(h.runtime, "c2")).toMatchObject({
      result: { result: "second" },
    });
    expect(h.requests).toHaveLength(3);
    await act(async () => {
      h.holdFirstGroup.resolve();
    });
    await waitFor(() => expect(h.requests).toHaveLength(4));
    await waitFor(() =>
      expect(h.runtime.thread.getState().isRunning).toBe(false),
    );
    h.unmount();
  });

  it("stops after a first group failure and returns the unsent draft and reply", async () => {
    const h = await mount("fail");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    expect(h.requests).toHaveLength(3);
    expect(
      h.runtime.thread
        .getState()
        .messages.some(
          (m) =>
            m.role === "user" &&
            m.content.some((p) => p.type === "text" && p.text === "third"),
        ),
    ).toBe(false);
    expect(reply(h.runtime, "c2")).toMatchObject({
      result: { result: "second" },
    });
    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(5));
    expect(h.requests[3]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c1" }),
      ]),
    );
    expect(h.requests[4]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c2" }),
        expect.objectContaining({ type: "human", content: "third" }),
      ]),
    );
    h.unmount();
  });

  it("resends one cancellation per pending call after the first group fails", async () => {
    const h = await mount("fail", undefined, { pendingCalls: true });
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    expect(h.requests).toHaveLength(3);

    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(5));
    const resent = h.requests.slice(3).flat();
    expect(resent.filter((message) => message.type === "tool")).toMatchObject([
      { tool_call_id: "c1", content: '{"cancelled":true}' },
      { tool_call_id: "c2", content: '{"cancelled":true}' },
    ]);
    expect(resent.filter((message) => message.type === "human")).toMatchObject([
      { content: "third" },
    ]);
    h.unmount();
  });

  it("stops before a later group after Stop and restores the unsent draft and reply", async () => {
    const h = await mount("stop");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await waitFor(() =>
      expect(
        h.runtime.thread
          .getState()
          .messages.some((m) =>
            m.content.some((p) => p.type === "text" && p.text === "working"),
          ),
      ).toBe(true),
    );
    act(() => h.runtime.thread.cancelRun());
    h.holdFirstGroup.resolve();
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    expect(h.requests).toHaveLength(3);
    expect(
      h.runtime.thread
        .getState()
        .messages.some(
          (m) =>
            m.role === "user" &&
            m.content.some((p) => p.type === "text" && p.text === "third"),
        ),
    ).toBe(false);
    expect(reply(h.runtime, "c2")).toMatchObject({
      result: { result: "second" },
    });
    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(4));
    expect(h.requests[3]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c2" }),
        expect.objectContaining({ type: "human", content: "third" }),
      ]),
    );
    h.unmount();
  });

  it("resends only the pending cancellation after Stop answers the first call", async () => {
    const h = await mount("stop", undefined, { pendingCalls: true });
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await waitFor(() =>
      expect(
        h.runtime.thread
          .getState()
          .messages.some((message) =>
            message.content.some(
              (part) => part.type === "text" && part.text === "working",
            ),
          ),
      ).toBe(true),
    );
    act(() => h.runtime.thread.cancelRun());
    h.holdFirstGroup.resolve();
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    expect(h.requests).toHaveLength(3);
    expect(
      h.requests[2]!.filter((message) => message.type === "tool"),
    ).toMatchObject([{ tool_call_id: "c1", content: '{"cancelled":true}' }]);

    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(4));
    const resent = h.requests[3]!;
    expect(resent.filter((message) => message.type === "tool")).toMatchObject([
      { tool_call_id: "c2", content: '{"cancelled":true}' },
    ]);
    expect(resent.filter((message) => message.type === "human")).toMatchObject([
      { content: "third" },
    ]);
    h.unmount();
  });

  it("does not restore a reply after editing away its tool call", async () => {
    const h = await mount("stop", async () => null);
    const second = h.runtime.thread
      .getState()
      .messages.find(
        (message) =>
          message.role === "user" &&
          message.content.some(
            (part) => part.type === "text" && part.text === "second",
          ),
      )!;
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    act(() => {
      const composer = h.runtime.thread.getMessageById(second.id).composer;
      composer.beginEdit();
      composer.setText("edited second");
      composer.send();
    });
    h.holdFirstGroup.resolve();
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    expect(reply(h.runtime, "c2")).toBeUndefined();
    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(5));
    expect(h.requests[3]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "human", content: "edited second" }),
      ]),
    );
    expect(h.requests[4]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "human", content: "third" }),
      ]),
    );
    expect(h.requests[4]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c2" }),
      ]),
    );
    expect(reply(h.runtime, "c2")).toBeUndefined();
    h.unmount();
  });

  it("waits for one producing run before sending the next group", async () => {
    const h = await mount("success");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    expect(h.requests).toHaveLength(3);
    await act(async () => {
      h.holdFirstGroup.resolve();
    });
    await waitFor(() => expect(h.requests).toHaveLength(4));
    expect(h.requests[3]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "human", content: "third" }),
      ]),
    );
    h.unmount();
  });

  it("keeps the sent message and clears the draft when Stop interrupts the last group", async () => {
    const h = await mount("stop-last");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await act(async () => {
      h.holdFirstGroup.resolve();
    });
    await waitFor(() => expect(h.requests).toHaveLength(4));
    await waitFor(() =>
      expect(
        h.runtime.thread
          .getState()
          .messages.some((m) =>
            m.content.some(
              (p) => p.type === "text" && p.text === "last group working",
            ),
          ),
      ).toBe(true),
    );
    await act(async () => {
      h.runtime.thread.cancelRun();
    });
    expect(h.runtime.thread.composer.getState().text).toBe("");
    expect(
      h.runtime.thread
        .getState()
        .messages.some(
          (m) =>
            m.role === "user" &&
            m.content.some((p) => p.type === "text" && p.text === "third"),
        ),
    ).toBe(true);
    expect(h.requests).toHaveLength(4);
    h.unmount();
  });

  it("keeps a completed first group sent when the second group fails", async () => {
    const h = await mount("fail-second");
    sendDraft(h.runtime);
    await h.firstGroupEntered.promise;
    await act(async () => {
      h.holdFirstGroup.resolve();
    });
    await waitFor(() => expect(h.requests).toHaveLength(4));
    await waitFor(() =>
      expect(h.runtime.thread.composer.getState().text).toBe("third"),
    );
    act(() => h.runtime.thread.composer.send());
    await waitFor(() => expect(h.requests).toHaveLength(5));
    expect(h.requests[4]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c2" }),
        expect.objectContaining({ type: "human", content: "third" }),
      ]),
    );
    expect(h.requests[4]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool", tool_call_id: "c1" }),
      ]),
    );
    h.unmount();
  });
});
