// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import {
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { describe, expect, it, vi } from "vitest";
import { useAISDKRuntime } from "./useAISDKRuntime";

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

const approvalRequest: UIMessageChunk[] = [
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
  { type: "finish-step" },
  { type: "finish" },
];

const toolOutput: UIMessageChunk[] = [
  { type: "start" },
  { type: "tool-output-available", toolCallId: "tool-1", output: "deployed" },
  { type: "finish" },
];

const setup = async (
  createHandler: (chat: () => ReturnType<typeof useChat>) => ApprovalHandler,
  {
    messages,
    continuation = () => streamOf(toolOutput),
  }: {
    messages?: UIMessage[];
    continuation?: () => ReadableStream<UIMessageChunk>;
  } = {},
) => {
  let requests = 0;
  const sendMessages = vi.fn<ChatTransport<UIMessage>["sendMessages"]>(
    async () => {
      requests += 1;
      return requests === 1 && !messages
        ? streamOf(approvalRequest)
        : continuation();
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
        onRespondToToolApproval: (response, context) =>
          handler?.(response, context),
      }),
    };
  });
  handler = createHandler(() => result.current.chat);

  if (!messages) {
    await act(() => result.current.chat.sendMessage({ text: "deploy" }));
    await waitFor(() => expect(result.current.chat.status).toBe("ready"));
  }

  const part = () =>
    result.current.runtime.thread
      .getMessageByIndex(1)
      .getMessagePartByToolCallId("tool-1");

  return {
    toolPart: () =>
      result.current.chat.messages
        .flatMap((message) => message.parts)
        .find((candidate) => candidate.type === "tool-deploy"),
    part,
    sendMessages,
    sendAutomaticallyWhen,
    respond: (approved = true) =>
      act(() => part().respondToToolApproval({ approved })),
  };
};

describe("useAISDKRuntime tool approvals with a Chat", () => {
  it("records a host-delivered answer without starting a chat request", async () => {
    const { toolPart, sendMessages, sendAutomaticallyWhen, respond } =
      await setup(() => async () => {});
    expect(toolPart()).toMatchObject({ state: "approval-requested" });
    const automaticSendChecks = sendAutomaticallyWhen.mock.calls.length;

    await respond();

    expect(toolPart()).toMatchObject({
      state: "approval-responded",
      approval: { id: "approval-1", approved: true },
    });
    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(automaticSendChecks);
    expect(sendMessages).toHaveBeenCalledTimes(1);
  });

  it("reopens the request when the handler throws", async () => {
    const { toolPart, respond } = await setup(() => async () => {
      throw new Error("resume failed");
    });

    await expect(respond()).rejects.toThrow("resume failed");

    expect(toolPart()).toMatchObject({
      state: "approval-requested",
      approval: { id: "approval-1" },
    });
    expect(toolPart()).not.toHaveProperty("approval.approved");
  });

  it("keeps the answer on a run the handler continues while it streams", async () => {
    let stream!: ReadableStreamDefaultController<UIMessageChunk>;
    const { toolPart, respond } = await setup(
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
    expect(toolPart()).toMatchObject({
      state: "approval-responded",
      approval: { id: "approval-1", approved: true },
    });

    await act(async () => {
      stream.enqueue({ type: "text-end", id: "text-1" });
      for (const chunk of toolOutput.slice(1)) stream.enqueue(chunk);
      stream.close();
    });
    await waitFor(() =>
      expect(toolPart()).toMatchObject({
        state: "output-available",
        approval: { id: "approval-1", approved: true },
      }),
    );
  });

  it("keeps the answer on a run the handler continues to completion", async () => {
    const { toolPart, respond } = await setup((chat) => async () => {
      await chat().sendMessage();
    });

    await respond();

    expect(toolPart()).toMatchObject({
      state: "output-available",
      approval: { id: "approval-1", approved: true },
      output: "deployed",
    });
  });

  it("keeps a completed run when the handler throws after it", async () => {
    const { toolPart, respond } = await setup((chat) => async () => {
      await chat().sendMessage();
      throw new Error("post-processing failed");
    });

    await expect(respond()).rejects.toThrow("post-processing failed");

    expect(toolPart()).toMatchObject({
      state: "output-available",
      approval: { id: "approval-1", approved: true },
    });
  });

  it("delivers one decision when a request is answered twice at once", async () => {
    const decisions: boolean[] = [];
    const releases: (() => void)[] = [];
    const { toolPart, part } = await setup(() => async ({ approved }) => {
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
    expect(toolPart()).toMatchObject({
      state: "approval-responded",
      approval: { id: "approval-1", approved: true },
    });
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

  it("leaves a request handed back to the AI SDK as the AI SDK does", async () => {
    const { toolPart, sendMessages, respond } = await setup(
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

    await respond();

    expect(toolPart()).toMatchObject({ state: "approval-requested" });
    expect(sendMessages).not.toHaveBeenCalled();
  });
});
