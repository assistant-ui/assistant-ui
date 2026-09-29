// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { Chat, useChat } from "@ai-sdk/react";
import {
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { ToolResponse } from "assistant-stream";
import type {
  ThreadHistoryAdapter,
  ThreadRuntimeCore,
} from "@assistant-ui/core";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { useAISDKRuntime } from "./useAISDKRuntime";
import { useChatThread } from "./useChatThread";
import { isToolUIPart } from "ai";

const historyState = vi.hoisted(() => ({
  remoteId: undefined as string | undefined,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...original,
    useAui: (...args: Parameters<typeof original.useAui>) =>
      historyState.remoteId
        ? {
            threadListItem: {
              source: "threads",
              getState: () => ({ remoteId: historyState.remoteId }),
            },
            subscribe: () => () => {},
          }
        : original.useAui(...args),
  };
});

type ApprovalHandler = NonNullable<
  NonNullable<Parameters<typeof useAISDKRuntime>[1]>["onRespondToToolApproval"]
>;

const streamOf = (chunks: UIMessageChunk[]) =>
  new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const approvalStep = (extra: UIMessageChunk[] = []): UIMessageChunk[] => [
  { type: "start", messageId: "assistant-1" },
  { type: "start-step" },
  {
    type: "tool-input-available",
    toolCallId: "tool-1",
    toolName: "deploy",
    input: {},
  },
  {
    type: "tool-approval-request",
    approvalId: "approval-1",
    toolCallId: "tool-1",
  },
  ...extra,
  { type: "finish-step" },
  { type: "finish" },
];

const toolOutput: UIMessageChunk[] = [
  { type: "start" },
  { type: "tool-output-available", toolCallId: "tool-1", output: "deployed" },
  { type: "finish" },
];

const approvalMessage = (
  messageId: string,
  toolCallId: string,
  approvalId: string,
): UIMessage => ({
  id: messageId,
  role: "assistant",
  parts: [
    {
      type: "tool-deploy",
      toolCallId,
      state: "approval-requested",
      input: {},
      approval: { id: approvalId },
    },
  ],
});

const userMessage: UIMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: "deploy" }],
};

const setup = async (
  createHandler:
    | ((chat: () => ReturnType<typeof useChat>) => ApprovalHandler)
    | undefined,
  {
    messages,
    request = approvalStep(),
    continuation = () => streamOf(toolOutput),
    joinStrategy,
    cancelPendingToolCallsOnSend,
    history,
  }: {
    messages?: UIMessage[];
    request?: UIMessageChunk[];
    continuation?: () => ReadableStream<UIMessageChunk>;
    joinStrategy?: "none";
    cancelPendingToolCallsOnSend?: boolean;
    history?: ThreadHistoryAdapter;
  } = {},
) => {
  let requests = 0;
  const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
    async () => {
      requests += 1;
      return requests === 1 && !messages ? streamOf(request) : continuation();
    },
  );
  const sendAutomaticallyWhen = vi.fn(
    lastAssistantMessageIsCompleteWithApprovalResponses,
  );

  let handler: ApprovalHandler | undefined;
  const { result } = renderHook(() => {
    const chat = useChat({
      id: "chat-1",
      ...(messages && { messages }),
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen,
    });
    return {
      chat,
      runtime: useAISDKRuntime(chat, {
        ...(createHandler && {
          onRespondToToolApproval: (response, context) =>
            handler?.(response, context),
        }),
        ...(joinStrategy && { joinStrategy }),
        ...(history && { adapters: { history } }),
        ...(cancelPendingToolCallsOnSend !== undefined && {
          cancelPendingToolCallsOnSend,
        }),
      }),
    };
  });
  const chat = () => result.current.chat;
  handler = createHandler?.(chat);

  if (!messages && !history) {
    await act(() => chat().sendMessage({ text: "deploy" }));
    await waitFor(() => expect(chat().status).toBe("ready"));
  }

  const part = () =>
    result.current.runtime.thread
      .getMessageByIndex(1)
      .getMessagePartByToolCallId("tool-1");

  return {
    chat,
    thread: () => result.current.runtime.thread,
    part,
    approval: () =>
      (part().getState() as { approval?: Record<string, unknown> }).approval,
    toolPart: () =>
      chat()
        .messages.flatMap((message) => message.parts)
        .find((candidate) => candidate.type === "tool-deploy"),
    sendMessages,
    sendAutomaticallyWhen,
    respond: (approved = true) =>
      act(() => part().respondToToolApproval({ approved })),
  };
};

describe("useAISDKRuntime tool approvals with a Chat", () => {
  it("applies a host answer without writing it into the chat", async () => {
    const { approval, toolPart, sendMessages, sendAutomaticallyWhen, respond } =
      await setup(() => async () => {});
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    await respond();

    expect(approval()).toMatchObject({ id: "approval-1", approved: true });
    expect(toolPart()).toMatchObject({ state: "approval-requested" });
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).toHaveBeenCalledTimes(1);
  });

  it("keeps a host answer when a runtime remounts over the same chat", async () => {
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    // One Chat, two runtime lifetimes: the shape AISDKThreads takes when a
    // thread is switched away from and back.
    const chatInstance = new Chat<UIMessage>({
      id: "chat-remount",
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    const hostHandler = vi.fn<ApprovalHandler>(async () => {});
    const mount = () =>
      renderHook(() => {
        const chat = useChat({ chat: chatInstance });
        return {
          chat,
          runtime: useAISDKRuntime(chat, {
            onRespondToToolApproval: hostHandler,
            unstable_hostApprovalOwner: chatInstance,
          }),
        };
      });

    const first = mount();
    await act(() => first.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(first.result.current.chat.status).toBe("ready"));

    const partOf = (r: ReturnType<typeof mount>) =>
      r.result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    const approvalOf = (r: ReturnType<typeof mount>) =>
      (partOf(r).getState() as { approval?: Record<string, unknown> }).approval;

    await act(() => partOf(first).respondToToolApproval({ approved: true }));
    expect(approvalOf(first)).toMatchObject({
      id: "approval-1",
      approved: true,
    });

    first.unmount();
    const second = mount();

    // The answer belongs to the chat, so the remounted runtime still shows the
    // request resolved rather than open for a second answer.
    await waitFor(() =>
      expect(approvalOf(second)).toMatchObject({
        id: "approval-1",
        approved: true,
      }),
    );

    // The remounted runtime rebuilt its answered-id set from the owner, so a
    // second answer is refused and the host handler is not called again.
    expect(() =>
      partOf(second).respondToToolApproval({ approved: true }),
    ).toThrow(/no pending approval|not waiting for a response/);
    expect(hostHandler).toHaveBeenCalledOnce();
    second.unmount();

    // A different Chat carrying the same id is a different owner, so its
    // request starts unanswered. Keying the record by id rather than by the
    // object would carry the first chat's answer across to it.
    const twin = new Chat<UIMessage>({
      id: "chat-remount",
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
    });
    const other = renderHook(() => {
      const chat = useChat({ chat: twin });
      return {
        chat,
        runtime: useAISDKRuntime(chat, {
          onRespondToToolApproval: async () => {},
          unstable_hostApprovalOwner: twin,
        }),
      };
    });
    await act(() => other.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(other.result.current.chat.status).toBe("ready"));

    expect(approvalOf(other)).not.toMatchObject({ approved: true });
    other.unmount();
  });

  it("keeps a host answer while the answered part is out of the visible messages", async () => {
    // A branch switch or a deletion rewrites `messages` without resolving
    // anything. Retiring on absence would drop the answer and let the host
    // handler run a second time for a request it already answered.
    const hostHandler = vi.fn<ApprovalHandler>(async () => {});
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    const chatInstance = new Chat<UIMessage>({
      id: "chat-branch-switch",
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    const view = renderHook(() => {
      const chat = useChat({ chat: chatInstance });
      return {
        chat,
        runtime: useAISDKRuntime(chat, {
          onRespondToToolApproval: hostHandler,
          unstable_hostApprovalOwner: chatInstance,
        }),
      };
    });

    await act(() => view.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(view.result.current.chat.status).toBe("ready"));

    const part = () =>
      view.result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    const approval = () =>
      (part().getState() as { approval?: Record<string, unknown> }).approval;

    const answered = view.result.current.chat.messages;
    await act(() => part().respondToToolApproval({ approved: true }));
    expect(approval()).toMatchObject({ approved: true });

    // Switch away: the answered part leaves the visible list entirely.
    await act(async () => {
      view.result.current.chat.setMessages([]);
    });
    // Switch back.
    await act(async () => {
      view.result.current.chat.setMessages(answered);
    });

    await waitFor(() =>
      expect(approval()).toMatchObject({ id: "approval-1", approved: true }),
    );
    expect(() => part().respondToToolApproval({ approved: true })).toThrow(
      /no pending approval|not waiting for a response/,
    );
    expect(hostHandler).toHaveBeenCalledOnce();
    view.unmount();
  });

  it("reopens the request on the remounted runtime when the handler rejects after the remount", async () => {
    // The rollback resolves against a runtime that has already unmounted, so
    // it has to reach whichever runtime is now mounted over that owner.
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    const chatInstance = new Chat<UIMessage>({
      id: "chat-remount-reject",
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    let rejectHandler!: (error: Error) => void;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectHandler = reject;
    });

    const mount = () =>
      renderHook(() => {
        const chat = useChat({ chat: chatInstance });
        return {
          chat,
          runtime: useAISDKRuntime(chat, {
            onRespondToToolApproval: () => pending,
            unstable_hostApprovalOwner: chatInstance,
          }),
        };
      });

    const first = mount();
    await act(() => first.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(first.result.current.chat.status).toBe("ready"));

    const partOf = (r: ReturnType<typeof mount>) =>
      r.result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    const approvalOf = (r: ReturnType<typeof mount>) =>
      (partOf(r).getState() as { approval?: Record<string, unknown> }).approval;

    const responded = partOf(first)
      .respondToToolApproval({ approved: true })
      .catch(() => {});
    await waitFor(() =>
      expect(approvalOf(first)).toMatchObject({ approved: true }),
    );

    first.unmount();
    const second = mount();
    await waitFor(() =>
      expect(approvalOf(second)).toMatchObject({ approved: true }),
    );

    await act(async () => {
      rejectHandler(new Error("host rejected"));
      await responded;
    });

    await waitFor(() =>
      expect(approvalOf(second)).not.toMatchObject({ approved: true }),
    );
    second.unmount();
  });

  // The production path: AISDKThreads mounts only the visible thread through
  // useChatThread, so the owner has to be the Chat that hook holds, not the
  // useChat helpers it re-mints each render.
  it("keeps a host answer across a useChatThread remount over one chat", async () => {
    const hostHandler = vi.fn<ApprovalHandler>(async () => {});
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    const chatInstance = new Chat<UIMessage>({
      id: "chat-thread-remount",
      transport: { sendMessages, reconnectToStream: async () => null },
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    const mount = () =>
      renderHook(() =>
        useChatThread(
          { onRespondToToolApproval: hostHandler },
          {
            id: "thread-1",
            isMainThread: true,
            getThreadListItem: () => undefined,
            chat: chatInstance,
          },
        ),
      );

    const first = mount();
    await act(() =>
      (first.result.current as any).thread.append({
        role: "user",
        content: [{ type: "text", text: "deploy" }],
      }),
    );

    const partOf = (r: ReturnType<typeof mount>) =>
      (r.result.current as any).thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    const approvalOf = (r: ReturnType<typeof mount>) =>
      (partOf(r).getState() as { approval?: Record<string, unknown> }).approval;

    await waitFor(() =>
      expect(approvalOf(first)).toMatchObject({ id: "approval-1" }),
    );
    await act(() => partOf(first).respondToToolApproval({ approved: true }));
    expect(approvalOf(first)).toMatchObject({ approved: true });

    first.unmount();
    const second = mount();

    await waitFor(() =>
      expect(approvalOf(second)).toMatchObject({
        id: "approval-1",
        approved: true,
      }),
    );

    // Answering again after the remount is refused, and the host handler is
    // not invoked a second time for the same request.
    expect(() =>
      partOf(second).respondToToolApproval({ approved: true }),
    ).toThrow(/no pending approval|not waiting for a response/);
    expect(hostHandler).toHaveBeenCalledOnce();
    second.unmount();
  });

  it("retires a stored answer once the chat records the outcome", async () => {
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    const chatInstance = new Chat<UIMessage>({
      id: "chat-retire",
      transport: { sendMessages, reconnectToStream: async () => null },
    });

    const mount = () =>
      renderHook(() => {
        const chat = useChat({ chat: chatInstance });
        return {
          chat,
          runtime: useAISDKRuntime(chat, {
            onRespondToToolApproval: async () => {},
            unstable_hostApprovalOwner: chatInstance,
          }),
        };
      });

    const first = mount();
    await act(() => first.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(first.result.current.chat.status).toBe("ready"));

    const partOf = (r: ReturnType<typeof mount>) =>
      r.result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    await act(() => partOf(first).respondToToolApproval({ approved: true }));
    expect(
      (partOf(first).getState() as { approval?: Record<string, unknown> })
        .approval,
    ).toMatchObject({ approved: true });

    // The chat now owns the outcome itself, so the stored copy must go.
    await act(async () => {
      first.result.current.chat.setMessages((messages) =>
        messages.map((message) => ({
          ...message,
          parts: message.parts.map((part) =>
            isToolUIPart(part) && part.state === "approval-requested"
              ? ({
                  ...part,
                  state: "output-available",
                  output: "deployed",
                } as (typeof message.parts)[number])
              : part,
          ),
        })),
      );
    });

    first.unmount();
    const second = mount();
    await waitFor(() =>
      expect(second.result.current.chat.messages.length).toBeGreaterThan(0),
    );

    // The chat still owns the approval record; what must be gone is the
    // stored answer, so nothing is re-applied by approval id.
    const settled = (
      partOf(second).getState() as { approval?: Record<string, unknown> }
    ).approval;
    expect(settled).toMatchObject({ id: "approval-1" });
    expect(settled?.approved).toBeUndefined();
    second.unmount();
  });

  it("rolls a rejected answer back to its own owner after the owner changes", async () => {
    const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
      async () => streamOf(approvalStep()),
    );
    const chatA = new Chat<UIMessage>({
      id: "chat-owner-a",
      transport: { sendMessages, reconnectToStream: async () => null },
    });
    const ownerB = {};
    let rejectHandler!: (err: Error) => void;
    // Owner A's answer is held open so it can be rejected after the switch;
    // owner B's resolves, so B holds a real answer under the same approval id.
    let owner: object = chatA;
    const handler = vi.fn<ApprovalHandler>(() =>
      owner === chatA
        ? new Promise<void>((_resolve, reject) => {
            rejectHandler = reject;
          })
        : Promise.resolve(),
    );

    const mountOver = (approvalOwner: object) =>
      renderHook(() => {
        const chat = useChat({ chat: chatA });
        return {
          chat,
          runtime: useAISDKRuntime(chat, {
            onRespondToToolApproval: handler,
            unstable_hostApprovalOwner: approvalOwner,
          }),
        };
      });

    const approvalIn = (r: ReturnType<typeof mountOver>) =>
      (
        r.result.current.runtime.thread
          .getMessageByIndex(1)
          .getMessagePartByToolCallId("tool-1")
          .getState() as { approval?: Record<string, unknown> }
      ).approval;

    const view = renderHook(() => {
      const chat = useChat({ chat: chatA });
      return {
        chat,
        runtime: useAISDKRuntime(chat, {
          onRespondToToolApproval: handler,
          unstable_hostApprovalOwner: owner,
        }),
      };
    });

    await act(() => view.result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(view.result.current.chat.status).toBe("ready"));

    const part = () =>
      view.result.current.runtime.thread
        .getMessageByIndex(1)
        .getMessagePartByToolCallId("tool-1");
    const answering = part()
      .respondToToolApproval({ approved: true })
      .catch(() => {});
    await waitFor(() => expect(handler).toHaveBeenCalledOnce());

    // The runtime moves to a different owner while the answer is in flight.
    owner = ownerB;
    view.rerender();

    // Owner B answers the same approval id, so the rollback below has a
    // same-id neighbour it could wrongly delete.
    await waitFor(() => expect(approvalIn(view)?.approved).toBeUndefined());
    await act(() => part().respondToToolApproval({ approved: false }));
    await waitFor(() => expect(approvalIn(view)?.approved).toBe(false));

    await act(async () => {
      rejectHandler(new Error("host refused"));
      await answering;
    });

    // The rollback belongs to chat A, so the owner on screen keeps its own
    // answer rather than being reopened alongside A.
    await waitFor(() => expect(approvalIn(view)?.approved).toBe(false));
    view.unmount();

    const reopened = mountOver(chatA);
    await waitFor(() => expect(approvalIn(reopened)?.approved).toBeUndefined());
    reopened.unmount();

    const stillAnswered = mountOver(ownerB);
    await waitFor(() =>
      expect(approvalIn(stillAnswered)?.approved).toBe(false),
    );
    stillAnswered.unmount();
  });

  it("renders a streamed request as its approvalDescriptor declares", async () => {
    const descriptor = {
      prompt: "Which environment?",
      display: "select",
      options: [{ id: "once", kind: "allow-once", label: "Staging once" }],
      scope: "deploy",
    };
    const handler = vi.fn<ApprovalHandler>(async () => {});
    const { approval, part, toolPart } = await setup(() => handler, {
      request: [
        { type: "start", messageId: "assistant-1" },
        { type: "start-step" },
        {
          type: "tool-input-available",
          toolCallId: "tool-1",
          toolName: "deploy",
          input: {},
        },
        {
          type: "tool-approval-request",
          approvalId: "approval-1",
          toolCallId: "tool-1",
          approvalDescriptor: descriptor,
        },
        { type: "finish-step" },
        { type: "finish" },
      ],
    });

    expect(toolPart()).toMatchObject({
      state: "approval-requested",
      approval: { id: "approval-1", descriptor },
    });
    expect(approval()).toEqual({
      id: "approval-1",
      prompt: "Which environment?",
      display: "select",
      options: [{ id: "once", kind: "allow-once", label: "Staging once" }],
      descriptor,
    });

    await act(() => part().respondToToolApproval({ optionId: "once" }));

    expect(handler).toHaveBeenCalledWith(
      { approvalId: "approval-1", approved: true, optionId: "once" },
      expect.objectContaining({ toolCallId: "tool-1", toolName: "deploy" }),
    );
    expect(approval()).toMatchObject({ approved: true, optionId: "once" });
    expect(toolPart()).toMatchObject({ state: "approval-requested" });
  });

  it("keeps a host answer out of the chat's automatic sends", async () => {
    const { chat, sendMessages, respond } = await setup(() => async () => {}, {
      request: approvalStep([
        {
          type: "tool-input-available",
          toolCallId: "tool-2",
          toolName: "lookup",
          input: {},
        },
      ]),
    });

    await respond();
    await act(async () => {
      await chat().addToolOutput({
        tool: "lookup",
        toolCallId: "tool-2",
        output: "found",
      } as never);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(sendMessages).toHaveBeenCalledTimes(1);
  });

  it("reopens the request when the handler throws", async () => {
    const { approval, respond } = await setup(() => async () => {
      throw new Error("resume failed");
    });

    await expect(respond()).rejects.toThrow("resume failed");

    expect(approval()).toMatchObject({ id: "approval-1" });
    expect(approval()).not.toHaveProperty("approved");
  });

  it("keeps the answer on a run the handler continues on the chat", async () => {
    let stream!: ReadableStreamDefaultController<UIMessageChunk>;
    const { approval, toolPart, respond } = await setup(
      (chat) => async () => {
        void chat().sendMessage();
      },
      {
        continuation: () =>
          new ReadableStream<UIMessageChunk>({
            start(controller) {
              stream = controller;
            },
          }),
      },
    );

    await respond();
    await act(async () => {
      stream.enqueue({ type: "start" });
      stream.enqueue({ type: "text-start", id: "text-1" });
      stream.enqueue({ type: "text-delta", id: "text-1", delta: "Deploying" });
    });
    expect(approval()).toMatchObject({ id: "approval-1", approved: true });

    await act(async () => {
      stream.enqueue({ type: "text-end", id: "text-1" });
      for (const chunk of toolOutput.slice(1)) stream.enqueue(chunk);
      stream.close();
    });
    await waitFor(() =>
      expect(toolPart()).toMatchObject({ state: "output-available" }),
    );
    expect(approval()).toMatchObject({ id: "approval-1", approved: true });
  });

  it("delivers one decision when a request is answered twice at once", async () => {
    const decisions: boolean[] = [];
    const releases: (() => void)[] = [];
    const { approval, part } = await setup(() => async ({ approved }) => {
      decisions.push(approved);
      await new Promise<void>((resolve) => releases.push(resolve));
    });

    let approve: Promise<void> | undefined;
    let deny: Promise<void> | undefined;
    act(() => {
      approve = part().respondToToolApproval({ approved: true });
      deny = part().respondToToolApproval({ approved: false });
    });
    await expect(deny).rejects.toThrow(
      "Tool approval approval-1 is not waiting for a response.",
    );
    for (const release of releases) release();
    await act(() => approve);

    expect(decisions).toEqual([true]);
    expect(approval()).toMatchObject({ id: "approval-1", approved: true });
  });

  it("continues the run through the AI SDK for a request handed back", async () => {
    const { toolPart, sendMessages, respond } = await setup(
      () =>
        (_response, { respondViaAISDK }) =>
          respondViaAISDK(),
    );

    await respond();

    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-available",
        approval: { id: "approval-1", approved: true },
        output: "deployed",
      }),
    );
    expect(sendMessages).toHaveBeenCalledTimes(2);
  });

  it("cancels an unanswered approval when a staged message follows it", async () => {
    const { thread, approval, part, toolPart } = await setup(
      () =>
        (_response, { respondViaAISDK }) =>
          respondViaAISDK(),
    );

    await act(() =>
      thread().append({
        role: "user",
        content: [{ type: "text", text: "later" }],
        startRun: false,
      }),
    );

    expect(toolPart()).toMatchObject({ state: "approval-requested" });
    expect(approval()).toMatchObject({
      id: "approval-1",
      resolution: "cancelled",
    });
    expect(part().getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("preserves a host answer when a staged message follows it", async () => {
    const { thread, approval, respond } = await setup(() => async () => {});

    await respond();
    await act(() =>
      thread().append({
        role: "user",
        content: [{ type: "text", text: "later" }],
        startRun: false,
      }),
    );

    expect(approval()).toMatchObject({
      id: "approval-1",
      approved: true,
    });
    expect(approval()).not.toHaveProperty("resolution");
  });

  it("rejects a stale approval even when consecutive assistant messages are joined", async () => {
    const { approval, part, toolPart, sendMessages, respond } = await setup(
      () =>
        (_response, { respondViaAISDK }) =>
          respondViaAISDK(),
      {
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "deploy" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "tool-deploy",
                toolCallId: "tool-1",
                state: "approval-requested",
                input: {},
                approval: { id: "approval-1" },
              },
            ],
          },
          {
            id: "assistant-2",
            role: "assistant",
            parts: [{ type: "text", text: "Waiting for approval." }],
          },
        ],
      },
    );

    expect(toolPart()).toMatchObject({ state: "approval-requested" });
    expect(approval()).toMatchObject({
      id: "approval-1",
      resolution: "cancelled",
    });
    expect(part().getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(() => respond()).toThrow("Tool call has no pending approval");
    expect(sendMessages).not.toHaveBeenCalled();
  });

  it("cancels the approval chunk before a voice assistant message", async () => {
    const { thread } = await setup(undefined, {
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        {
          id: "voice-1",
          role: "assistant",
          parts: [{ type: "text", text: "Hello" }],
          metadata: { modality: "voice" },
        },
      ],
    });

    expect(thread().getMessageByIndex(1).getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(thread().getMessageByIndex(2).getState().status).toMatchObject({
      type: "complete",
    });
  });

  it("keeps a joined message answerable when its last approval is open", async () => {
    const handler = vi.fn<ApprovalHandler>(async () => {});
    const { thread } = await setup(() => handler, {
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        approvalMessage("assistant-2", "tool-2", "approval-2"),
      ],
    });
    const message = () => thread().getMessageByIndex(1);
    const earlier = () => message().getMessagePartByToolCallId("tool-1");
    const last = () => message().getMessagePartByToolCallId("tool-2");

    expect(message().getState().status).toMatchObject({
      type: "requires-action",
    });
    expect(
      (earlier().getState() as { approval?: Record<string, unknown> }).approval,
    ).toMatchObject({
      resolution: "cancelled",
    });
    await act(() => last().respondToToolApproval({ approved: true }));
    expect(handler).toHaveBeenCalledWith(
      { approvalId: "approval-2", approved: true },
      expect.objectContaining({ toolCallId: "tool-2" }),
    );
    expect(
      (last().getState() as { approval?: Record<string, unknown> }).approval,
    ).toMatchObject({
      approved: true,
    });
  });

  it("keeps a joined human tool call open after an earlier approval is superseded", async () => {
    const { thread } = await setup(undefined, {
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        {
          id: "assistant-2",
          role: "assistant",
          parts: [
            {
              type: "tool-lookup",
              toolCallId: "tool-2",
              state: "input-available",
              input: {},
            },
          ],
        },
      ],
    });
    const message = thread().getMessageByIndex(1);

    expect(
      (
        message.getMessagePartByToolCallId("tool-1").getState() as {
          approval?: Record<string, unknown>;
        }
      ).approval,
    ).toMatchObject({ resolution: "cancelled" });
    expect(message.getState().status).toMatchObject({
      type: "requires-action",
    });
    expect(
      message.getMessagePartByToolCallId("tool-2").getState().status,
    ).toMatchObject({
      type: "requires-action",
    });
  });

  it("keeps a joined host-answered approval open after an earlier approval is superseded", async () => {
    const handler = vi.fn<ApprovalHandler>(async () => {});
    const { thread } = await setup(() => handler, {
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        approvalMessage("assistant-2", "tool-2", "approval-2"),
      ],
    });
    const message = () => thread().getMessageByIndex(1);
    const last = () => message().getMessagePartByToolCallId("tool-2");

    await act(() => last().respondToToolApproval({ approved: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(
      (
        message().getMessagePartByToolCallId("tool-1").getState() as {
          approval?: Record<string, unknown>;
        }
      ).approval,
    ).toMatchObject({ resolution: "cancelled" });
    expect(message().getState().status).toMatchObject({
      type: "requires-action",
    });
    expect(last().getState()).toMatchObject({
      approval: { approved: true },
      status: { type: "requires-action" },
    });
  });

  it("keeps the last joined message running while the chat streams", async () => {
    let stream!: ReadableStreamDefaultController<UIMessageChunk>;
    const { chat, thread } = await setup(undefined, {
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
      ],
      continuation: () =>
        new ReadableStream({
          start(controller) {
            stream = controller;
          },
        }),
    });

    act(() => {
      void chat().sendMessage();
    });
    await act(async () => {
      stream.enqueue({ type: "start", messageId: "assistant-2" });
      stream.enqueue({ type: "text-start", id: "text-2" });
      stream.enqueue({ type: "text-delta", id: "text-2", delta: "working" });
    });
    await waitFor(() => expect(chat().status).toBe("streaming"));
    expect(thread().getMessageByIndex(1).getState().status).toMatchObject({
      type: "running",
    });

    await act(async () => {
      stream.enqueue({ type: "text-end", id: "text-2" });
      stream.enqueue({ type: "finish" });
      stream.close();
    });
  });

  it.each([
    {
      situation: "without superseded approvals",
      middle: {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Earlier reply" }],
      } as UIMessage,
    },
    {
      situation: "with unchanged superseded approval ids",
      middle: approvalMessage("assistant-1", "tool-1", "approval-1"),
    },
  ])(
    "keeps earlier messages stable while a reply streams $situation",
    async ({ middle }) => {
      let stream!: ReadableStreamDefaultController<UIMessageChunk>;
      const { chat, thread } = await setup(undefined, {
        messages: [
          userMessage,
          middle,
          {
            id: "user-2",
            role: "user",
            parts: [{ type: "text", text: "Continue" }],
          },
        ],
        continuation: () =>
          new ReadableStream({
            start(controller) {
              stream = controller;
            },
          }),
      });

      act(() => {
        void chat().sendMessage();
      });
      await act(async () => {
        stream.enqueue({ type: "start", messageId: "assistant-2" });
        stream.enqueue({ type: "text-start", id: "text-2" });
        stream.enqueue({ type: "text-delta", id: "text-2", delta: "One" });
      });
      await waitFor(() => expect(chat().status).toBe("streaming"));
      const earlierMessage = thread().getState().messages[1];

      await act(async () => {
        stream.enqueue({ type: "text-delta", id: "text-2", delta: " two" });
      });

      expect(chat().messages.at(-1)?.parts).toMatchObject([
        { type: "text", text: "One two" },
      ]);
      expect(thread().getState().messages[1]).toBe(earlierMessage);

      await act(async () => {
        stream.enqueue({ type: "text-end", id: "text-2" });
        stream.enqueue({ type: "finish" });
        stream.close();
      });
    },
  );

  it.each(["host", "AI SDK"] as const)(
    "rejects a direct response to a superseded approval through the %s path",
    async (path) => {
      const handler = vi.fn<ApprovalHandler>(async () => {});
      const { chat, thread } = await setup(
        path === "host" ? () => handler : undefined,
        {
          messages: [
            userMessage,
            approvalMessage("assistant-1", "tool-1", "approval-1"),
            {
              id: "user-2",
              role: "user",
              parts: [{ type: "text", text: "later" }],
            },
          ],
        },
      );
      const addToolApprovalResponse = vi.spyOn(
        chat(),
        "addToolApprovalResponse",
      );

      expect(
        (
          thread()
            .getMessageByIndex(1)
            .getMessagePartByToolCallId("tool-1")
            .getState() as { approval?: Record<string, unknown> }
        ).approval,
      ).toMatchObject({ resolution: "cancelled" });
      const threadCore = (
        thread() as unknown as {
          __internal_threadBinding: { getState(): ThreadRuntimeCore };
        }
      ).__internal_threadBinding.getState();
      await expect(
        threadCore.respondToToolApproval({
          approvalId: "approval-1",
          approved: true,
        }),
      ).rejects.toThrow(
        "Tool approval approval-1 is not waiting for a response.",
      );
      expect(handler).not.toHaveBeenCalled();
      expect(addToolApprovalResponse).not.toHaveBeenCalled();
    },
  );

  it('cancels only the approval message with joinStrategy "none"', async () => {
    const { thread } = await setup(undefined, {
      joinStrategy: "none",
      messages: [
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        {
          id: "assistant-2",
          role: "assistant",
          parts: [{ type: "text", text: "Later" }],
        },
      ],
    });

    expect(thread().getMessageByIndex(1).getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(thread().getMessageByIndex(2).getState().status).toMatchObject({
      type: "complete",
    });
  });

  it("restores a superseded approval through external history", async () => {
    historyState.remoteId = "remote-thread";
    onTestFinished(() => {
      historyState.remoteId = undefined;
    });
    const load = vi.fn(async () => ({
      headId: "voice-1",
      messages: [
        { parentId: null, message: userMessage },
        {
          parentId: "user-1",
          message: approvalMessage("assistant-1", "tool-1", "approval-1"),
        },
        {
          parentId: "assistant-1",
          message: {
            id: "voice-1",
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: "Hello" }],
            metadata: { modality: "voice" },
          },
        },
      ],
    }));
    const history = {
      load: vi.fn(),
      append: vi.fn(),
      withFormat: vi.fn().mockReturnValue({ load, append: vi.fn() }),
    } as unknown as ThreadHistoryAdapter;
    const { chat, thread } = await setup(undefined, { history });

    await waitFor(() => expect(chat().messages).toHaveLength(3));
    expect(history.withFormat).toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
    expect(thread().getMessageByIndex(1).getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(thread().getMessageByIndex(2).getState().status).toMatchObject({
      type: "complete",
    });
  });

  it("keeps a host answer when another approval in the same message is superseded", async () => {
    const handler = vi.fn<ApprovalHandler>(async () => {});
    const { chat, thread } = await setup(() => handler, {
      messages: [
        userMessage,
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            ...approvalMessage("assistant-1", "tool-1", "approval-1").parts,
            ...approvalMessage("assistant-1", "tool-2", "approval-2").parts,
          ],
        },
      ],
    });
    const message = () => thread().getMessageByIndex(1);
    const first = () => message().getMessagePartByToolCallId("tool-1");
    const second = () => message().getMessagePartByToolCallId("tool-2");

    await act(() => first().respondToToolApproval({ approved: true }));
    act(() =>
      chat().setMessages([
        ...chat().messages,
        {
          id: "user-2",
          role: "user",
          parts: [{ type: "text", text: "later" }],
        },
      ]),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(
      (first().getState() as { approval?: Record<string, unknown> }).approval,
    ).toMatchObject({
      approved: true,
    });
    expect(
      (second().getState() as { approval?: Record<string, unknown> }).approval,
    ).toMatchObject({
      resolution: "cancelled",
    });
    expect(message().getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(chat().messages[1]?.parts).toMatchObject([
      { state: "approval-requested" },
      { state: "approval-requested" },
    ]);
  });

  it("settles a staged approval with cancellation on send disabled", async () => {
    const handler = vi.fn<ApprovalHandler>(async () => {});
    const { thread, approval, toolPart, sendMessages } = await setup(
      () => handler,
      {
        cancelPendingToolCallsOnSend: false,
      },
    );

    await act(() =>
      thread().append({
        role: "user",
        content: [{ type: "text", text: "later" }],
        startRun: false,
      }),
    );

    expect(approval()).toMatchObject({ resolution: "cancelled" });
    expect(thread().getMessageByIndex(1).getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(toolPart()).toMatchObject({
      state: "approval-requested",
    });
    expect(handler).not.toHaveBeenCalled();
    expect(sendMessages).toHaveBeenCalledTimes(1);
  });

  it("uses the AI SDK response path without a host handler", async () => {
    const { chat, thread, toolPart, respond, sendMessages } =
      await setup(undefined);

    await respond();
    await waitFor(() => expect(sendMessages).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-available",
        approval: { id: "approval-1", approved: true },
      }),
    );

    act(() =>
      chat().setMessages([
        userMessage,
        approvalMessage("assistant-1", "tool-1", "approval-1"),
        {
          id: "user-2",
          role: "user",
          parts: [{ type: "text", text: "later" }],
        },
      ]),
    );
    expect(thread().getMessageByIndex(1).getState().status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("stores a late successful tool result in its original message without sending", async () => {
    const { chat, part, toolPart, sendMessages, sendAutomaticallyWhen } =
      await setup(() => async () => {}, {
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "deploy" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "tool-deploy",
                toolCallId: "tool-1",
                state: "input-available",
                input: {},
              },
            ],
          },
          {
            id: "user-2",
            role: "user",
            parts: [{ type: "text", text: "later" }],
          },
        ],
      });
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    act(() => part().addToolResult("deployed"));

    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-available",
        output: "deployed",
      }),
    );
    expect(chat().messages[2]).toMatchObject({
      id: "user-2",
      parts: [{ type: "text", text: "later" }],
    });
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).not.toHaveBeenCalled();
  });

  it("clears a preliminary marker when a late final tool result is stored", async () => {
    const { part, toolPart, sendMessages, sendAutomaticallyWhen } = await setup(
      () => async () => {},
      {
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "deploy" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "tool-deploy",
                toolCallId: "tool-1",
                state: "output-available",
                input: {},
                output: "preview",
                preliminary: true,
              },
            ],
          },
          {
            id: "user-2",
            role: "user",
            parts: [{ type: "text", text: "later" }],
          },
        ],
      },
    );
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    act(() => part().addToolResult("deployed"));

    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-available",
        output: "deployed",
      }),
    );
    expect(toolPart()).not.toHaveProperty("preliminary");
    expect(part().getState()).not.toHaveProperty("isPreliminary");
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).not.toHaveBeenCalled();
  });

  it("stores a late tool result in the correct raw message when assistant messages are joined", async () => {
    const { chat, part, sendMessages, sendAutomaticallyWhen } = await setup(
      () => async () => {},
      {
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "deploy" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [{ type: "text", text: "Preparing." }],
          },
          {
            id: "assistant-2",
            role: "assistant",
            parts: [
              {
                type: "tool-deploy",
                toolCallId: "tool-1",
                state: "input-available",
                input: {},
              },
            ],
          },
          {
            id: "user-2",
            role: "user",
            parts: [{ type: "text", text: "later" }],
          },
        ],
      },
    );
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    act(() => part().addToolResult("deployed"));

    await waitFor(() =>
      expect(
        chat()
          .messages.find((message) => message.id === "assistant-2")
          ?.parts.find(
            (candidate) =>
              candidate.type === "tool-deploy" &&
              candidate.toolCallId === "tool-1",
          ),
      ).toMatchObject({
        state: "output-available",
        output: "deployed",
      }),
    );
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).not.toHaveBeenCalled();
  });

  it("stores a late failed tool result in its original message without sending", async () => {
    const { part, toolPart, sendMessages, sendAutomaticallyWhen } = await setup(
      () => async () => {},
      {
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "deploy" }],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "tool-deploy",
                toolCallId: "tool-1",
                state: "input-available",
                input: {},
              },
            ],
          },
          {
            id: "user-2",
            role: "user",
            parts: [{ type: "text", text: "later" }],
          },
        ],
      },
    );
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    act(() =>
      part().addToolResult(
        new ToolResponse({ result: "deploy failed", isError: true }),
      ),
    );

    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-error",
        errorText: "deploy failed",
      }),
    );
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).not.toHaveBeenCalled();
  });

  it("keeps a settled tool result in an earlier message when a late result arrives", async () => {
    const cancelled = "User cancelled tool call by sending a new message.";
    const { part, toolPart, sendMessages } = await setup(() => async () => {}, {
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "deploy" }],
        },
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tool-1",
              state: "output-error",
              input: {},
              errorText: cancelled,
            },
          ],
        },
        {
          id: "user-2",
          role: "user",
          parts: [{ type: "text", text: "later" }],
        },
      ],
    });

    await act(async () => {
      await part().addToolResult("deployed");
    });

    expect(toolPart()).toMatchObject({
      state: "output-error",
      errorText: cancelled,
    });
    expect(sendMessages).not.toHaveBeenCalled();
  });
});
