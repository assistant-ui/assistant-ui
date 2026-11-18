import { describe, expect, it, vi } from "vitest";
import { HttpAgent, type AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ChatModelRunResult,
  ThreadAssistantMessage,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type EventSubscriber = {
  onTextMessageStartEvent?: (payload: { event: unknown }) => void;
  onTextMessageContentEvent?: (payload: { event: unknown }) => void;
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onRunFinishedEvent?: (payload: { event: unknown }) => void;
};

const userMessage = (text: string) =>
  ({
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
  }) as unknown as AppendMessage;

function createOpenRun(finishWithInterrupt: boolean) {
  let releaseFirst!: () => void;
  const firstRunClosed = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const runAgent = vi.fn(
    async (input: { runId: string }, subscriber: EventSubscriber) => {
      if (runAgent.mock.calls.length === 1) {
        if (finishWithInterrupt) {
          subscriber.onToolCallStartEvent?.({
            event: {
              type: "TOOL_CALL_START",
              toolCallId: "call-1",
              toolCallName: "confirm",
            },
          });
          subscriber.onToolCallEndEvent?.({
            event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
          });
          subscriber.onRunFinishedEvent?.({
            event: {
              type: "RUN_FINISHED",
              runId: input.runId,
              outcome: {
                type: "interrupt",
                interrupts: [
                  {
                    id: "int-1",
                    reason: "tool_call",
                    toolCallId: "call-1",
                    message: "Continue?",
                  },
                ],
              },
            },
          });
        } else {
          subscriber.onTextMessageStartEvent?.({
            event: { type: "TEXT_MESSAGE_START", messageId: "assistant-1" },
          });
          subscriber.onTextMessageContentEvent?.({
            event: {
              type: "TEXT_MESSAGE_CONTENT",
              messageId: "assistant-1",
              delta: "working",
            },
          });
        }
        await firstRunClosed;
      } else {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
      }
    },
  );
  const abortRun = vi.fn(() => releaseFirst());
  const core = new AgUiThreadController({
    agent: { runAgent, abortRun } as unknown as AbstractAgent,
    logger: makeLogger(),
    showThinking: false,
  });
  return { core, runAgent, abortRun };
}

describe("AgUiThreadController Stop after an interrupt", () => {
  it("names respondToToolApproval when its resume is displaced by steering during a reconnected drain", async () => {
    class ReconnectingAgent extends HttpAgent {
      protected override connect(): never {
        throw new Error("Unexpected reconnect transport");
      }
    }
    const agent = new ReconnectingAgent({ url: "https://agent.test" });
    let release!: () => void;
    const closed = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runAgent = vi
      .spyOn(agent, "runAgent")
      .mockImplementation(async (input, next) => {
        const subscriber = next as unknown as EventSubscriber;
        if (runAgent.mock.calls.length === 1) {
          subscriber.onToolCallStartEvent?.({
            event: {
              type: "TOOL_CALL_START",
              toolCallId: "call-1",
              toolCallName: "confirm",
            },
          });
          subscriber.onToolCallEndEvent?.({
            event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
          });
        }
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input?.runId,
            ...(runAgent.mock.calls.length === 1
              ? {
                  outcome: {
                    type: "interrupt",
                    interrupts: [
                      {
                        id: "int-1",
                        reason: "tool_call",
                        toolCallId: "call-1",
                      },
                    ],
                  },
                }
              : {}),
          },
        });
        return { newMessages: [], result: undefined };
      });
    const connectAgent = vi
      .spyOn(agent, "connectAgent")
      .mockImplementation(async (input, next) => {
        const subscriber = next as unknown as EventSubscriber;
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input?.runId },
        });
        await closed;
        return { newMessages: [], result: undefined };
      });
    const abortRun = vi.spyOn(agent, "abortRun");
    const core = new AgUiThreadController({
      agent,
      logger: makeLogger(),
      showThinking: false,
    });
    await core.append(userMessage("start"));
    let following: Promise<void> | undefined;
    let reconnected = false;
    const unsubscribe = core.subscribe(() => {
      const decided = core
        .getMessages()
        .some(
          (message) =>
            message.role === "assistant" &&
            message.content.some(
              (part) =>
                part.type === "tool-call" && part.approval?.approved === true,
            ),
        );
      if (reconnected || !decided) return;
      reconnected = true;
      following = core.resumeInFlightRun(core.getMessages());
    });
    const approval = core.respondToToolApproval({
      approvalId: "int-1",
      approved: true,
    });
    expect(connectAgent).toHaveBeenCalledOnce();
    const send = core.steerAway("never mind");
    const settled = Promise.allSettled([approval, send]);
    expect(runAgent).toHaveBeenCalledOnce();
    expect(abortRun).not.toHaveBeenCalled();
    release();
    await following;
    expect(await settled).toEqual([
      {
        status: "rejected",
        reason: new Error(
          "[agui] respondToToolApproval: a run is already in progress",
        ),
      },
      { status: "fulfilled", value: undefined },
    ]);
    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(core.isRunning()).toBe(false);
    unsubscribe();
  });

  it.each([
    "interrupt response",
    "steerAway interrupt",
    "steerAway tool",
    "steerAway send",
  ] as const)(
    "rejects a displaced %s before changing the thread during the drain",
    async (action) => {
      let release!: () => void;
      const closed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const interrupt =
        action === "interrupt response" || action === "steerAway interrupt";
      const runAgent = vi.fn(
        async (input: { runId: string }, subscriber: EventSubscriber) => {
          if (runAgent.mock.calls.length === 1) {
            if (action !== "steerAway send") {
              subscriber.onToolCallStartEvent?.({
                event: {
                  type: "TOOL_CALL_START",
                  toolCallId: "call-1",
                  toolCallName: "confirm",
                },
              });
              subscriber.onToolCallEndEvent?.({
                event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
              });
            }
            subscriber.onRunFinishedEvent?.({
              event: {
                type: "RUN_FINISHED",
                runId: input.runId,
                ...(interrupt
                  ? {
                      outcome: {
                        type: "interrupt",
                        interrupts: [
                          {
                            id: "int-1",
                            reason: "tool_call",
                            toolCallId: "call-1",
                            message: "Continue?",
                          },
                        ],
                      },
                    }
                  : {}),
              },
            });
            await closed;
          } else {
            subscriber.onRunFinishedEvent?.({
              event: { type: "RUN_FINISHED", runId: input.runId },
            });
          }
        },
      );
      const abortRun = vi.fn();
      const core = new AgUiThreadController({
        agent: { runAgent, abortRun } as unknown as AbstractAgent,
        logger: makeLogger(),
        showThinking: false,
      });
      const run = core.append(userMessage("start"));
      const messages = core.getMessages();
      const displaced =
        action === "interrupt response"
          ? core.submitInterruptResponses([
              {
                interruptId: "int-1",
                status: "resolved",
                payload: { approved: true },
              },
            ])
          : core.steerAway(
              "discarded",
              interrupt
                ? [
                    {
                      interruptId: "int-1",
                      status: "resolved",
                      payload: { approved: true },
                    },
                  ]
                : undefined,
            );
      const latest = core.steerAway("latest");
      const method =
        action === "interrupt response"
          ? "submitInterruptResponses"
          : "steerAway";
      const settled = Promise.allSettled([displaced, latest]);
      const waitingMessages = core.getMessages();
      expect(runAgent).toHaveBeenCalledOnce();
      expect(abortRun).not.toHaveBeenCalled();

      release();
      await run;
      expect(await settled).toEqual([
        {
          status: "rejected",
          reason: new Error(`[agui] ${method}: a run is already in progress`),
        },
        { status: "fulfilled", value: undefined },
      ]);
      expect(waitingMessages).toEqual(messages);
      expect(runAgent).toHaveBeenCalledTimes(2);
      expect(runAgent.mock.calls[1]?.[0]).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "latest" }),
        ]),
        ...(interrupt
          ? { resume: [{ interruptId: "int-1", status: "cancelled" }] }
          : {}),
      });
      expect(
        core
          .getMessages()
          .filter((message) => message.role === "user")
          .map((message) => message.content),
      ).toEqual([
        [{ type: "text", text: "start" }],
        [{ type: "text", text: "latest" }],
      ]);
      expect(core.isRunning()).toBe(false);
      expect(abortRun).not.toHaveBeenCalled();
    },
  );

  it.each(["interrupt response", "tool approval"])(
    "keeps an interrupt answerable when Stop cancels a waiting %s",
    async (answer) => {
      const { core, runAgent, abortRun } = createOpenRun(true);
      const first = core.append(userMessage("start"));
      const waiting =
        answer === "interrupt response"
          ? core.submitInterruptResponses([
              {
                interruptId: "int-1",
                status: "resolved",
                payload: { approved: true },
              },
            ])
          : core.respondToToolApproval({ approvalId: "int-1", approved: true });
      expect(core.isRunning()).toBe(true);

      await core.cancel();
      await Promise.all([first, waiting]);
      expect(core.isRunning()).toBe(false);
      expect(runAgent).toHaveBeenCalledOnce();
      expect(abortRun).toHaveBeenCalledOnce();
      expect(core.getPendingInterrupts()?.interrupts).toMatchObject([
        { id: "int-1" },
      ]);
      expect(core.getMessages().at(-1)?.content).toContainEqual(
        expect.objectContaining({
          type: "tool-call",
          approval: { id: "int-1", prompt: "Continue?" },
        }),
      );

      await core.respondToToolApproval({
        approvalId: "int-1",
        approved: false,
      });
      expect(runAgent).toHaveBeenCalledTimes(2);
      expect(runAgent.mock.calls[1]?.[0]).toMatchObject({
        resume: [
          {
            interruptId: "int-1",
            status: "resolved",
            payload: { approved: false },
          },
        ],
      });
    },
  );

  it.each(["interrupt response", "steerAway interrupt", "steerAway tool"])(
    "rejects a %s while a resume stream is still producing output",
    async (action) => {
      const runAgent = vi.fn();
      const core = new AgUiThreadController({
        agent: { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent,
        logger: makeLogger(),
        showThinking: false,
      });
      let release!: () => void;
      const closed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const interrupt = action !== "steerAway tool";
      const run = core.resume({
        parentId: null,
        sourceId: null,
        runConfig: {},
        stream: async function* (): AsyncGenerator<ChatModelRunResult> {
          yield {
            content: [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "confirm",
                args: {},
                argsText: "{}",
              },
            ],
            status: {
              type: "requires-action",
              reason: interrupt ? "interrupt" : "tool-calls",
            },
            metadata: {
              custom: {
                agui: {
                  interrupts: interrupt
                    ? [
                        {
                          id: "int-1",
                          reason: "tool_call",
                          toolCallId: "call-1",
                        },
                      ]
                    : [],
                },
              },
            },
          };
          await closed;
        },
      });
      await vi.waitFor(() =>
        expect(core.getMessages().at(-1)?.status?.type).toBe("requires-action"),
      );
      expect(core.isRunning()).toBe(true);
      const pending = interrupt
        ? core.getPendingInterrupts()
        : core.getPendingToolCalls();
      await expect(
        action === "interrupt response"
          ? core.submitInterruptResponses([
              { interruptId: "int-1", status: "resolved" },
            ])
          : core.steerAway("something else"),
      ).rejects.toThrow("a run is already in progress");
      expect(
        interrupt ? core.getPendingInterrupts() : core.getPendingToolCalls(),
      ).toEqual(pending);
      expect(
        core.getMessages().filter((message) => message.role === "user"),
      ).toHaveLength(0);
      expect(runAgent).not.toHaveBeenCalled();
      release();
      await run;
      expect(core.isRunning()).toBe(false);
    },
  );

  it("cancels a finished tool call when stopped before the stream closes", async () => {
    let releaseFirst!: () => void;
    const firstRunClosed = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const runAgent = vi.fn(
      async (input: { runId: string }, subscriber: EventSubscriber) => {
        if (runAgent.mock.calls.length !== 1) return;
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "call-1",
            toolCallName: "lookup",
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "call-1" },
        });
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
        await firstRunClosed;
      },
    );
    const abortRun = vi.fn(() => releaseFirst());
    const core = new AgUiThreadController({
      agent: { runAgent, abortRun } as unknown as AbstractAgent,
      logger: makeLogger(),
      showThinking: false,
    });
    const firstRun = core.append(userMessage("start"));

    expect(core.getMessages().at(-1)?.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });

    await core.cancel();
    await firstRun;

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(core.isRunning()).toBe(false);
    expect(abortRun).toHaveBeenCalledOnce();

    core.addToolResult({
      messageId: assistant.id,
      toolCallId: "call-1",
      toolName: "lookup",
      result: "found",
      isError: false,
    });

    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("keeps the gate answerable and accepts a steer-away run", async () => {
    const { core, runAgent, abortRun } = createOpenRun(true);
    const firstRun = core.append(userMessage("start"));

    expect(core.isRunning()).toBe(false);
    expect(core.getMessages().at(-1)?.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });

    await core.cancel();
    await firstRun;

    const assistant = core.getMessages().at(-1) as ThreadAssistantMessage;
    expect(assistant.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(
      assistant.content.find((part) => part.type === "tool-call"),
    ).toMatchObject({
      approval: { id: "int-1", prompt: "Continue?" },
    });
    expect(core.getPendingInterrupts()?.interrupts).toMatchObject([
      { id: "int-1" },
    ]);
    expect(core.isRunning()).toBe(false);
    expect(abortRun).toHaveBeenCalledOnce();

    await core.steerAway("do something else");

    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(runAgent.mock.calls[1]?.[0]).toMatchObject({
      resume: [{ interruptId: "int-1", status: "cancelled" }],
    });
  });

  it("still cancels a run that is streaming", async () => {
    const { core } = createOpenRun(false);
    const firstRun = core.append(userMessage("start"));

    expect(core.getMessages().at(-1)?.status).toEqual({ type: "running" });
    expect(core.getMessages().at(-1)?.content).toMatchObject([
      { type: "text", text: "working" },
    ]);

    await core.cancel();
    await firstRun;

    expect(core.getMessages().at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
    expect(core.isRunning()).toBe(false);
  });
});
