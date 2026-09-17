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

const setup = async (
  createHandler: (chat: () => ReturnType<typeof useChat>) => ApprovalHandler,
  {
    messages,
    request = approvalStep(),
    continuation = () => streamOf(toolOutput),
  }: {
    messages?: UIMessage[];
    request?: UIMessageChunk[];
    continuation?: () => ReadableStream<UIMessageChunk>;
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
        onRespondToToolApproval: (response, context) =>
          handler?.(response, context),
      }),
    };
  });
  const chat = () => result.current.chat;
  handler = createHandler(chat);

  if (!messages) {
    await act(() => chat().sendMessage({ text: "deploy" }));
    await waitFor(() => expect(chat().status).toBe("ready"));
  }

  const part = () =>
    result.current.runtime.thread
      .getMessageByIndex(1)
      .getMessagePartByToolCallId("tool-1");

  return {
    chat,
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

  it("leaves a request handed back to the AI SDK as the AI SDK does", async () => {
    const { approval, toolPart, sendMessages, respond } = await setup(
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
    expect(approval()).not.toHaveProperty("approved");
    expect(sendMessages).not.toHaveBeenCalled();
  });
});
