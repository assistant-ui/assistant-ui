import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type { AppendMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type EventSubscriber = {
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onSubagentStartedEvent?: (payload: { event: unknown }) => void;
  onSubagentFinishedEvent?: (payload: { event: unknown }) => void;
  onRunFinishedEvent?: (payload: { event: unknown }) => void;
};

describe("AgUiThreadController subagent interrupts", () => {
  it("answers a suspended subagent's interrupt through the parent run's resume", async () => {
    const runAgent = vi.fn(
      async (input: { runId: string }, subscriber: EventSubscriber) => {
        if (runAgent.mock.calls.length > 1) {
          subscriber.onRunFinishedEvent?.({
            event: { type: "RUN_FINISHED", runId: input.runId },
          });
          return;
        }
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId: "t-spawn",
            toolCallName: "task",
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId: "t-spawn" },
        });
        subscriber.onSubagentStartedEvent?.({
          event: {
            type: "SUBAGENT_STARTED",
            subagentRunId: "sub-1",
            name: "worker",
            parentToolCallId: "t-spawn",
          },
        });
        subscriber.onSubagentFinishedEvent?.({
          event: {
            type: "SUBAGENT_FINISHED",
            subagentRunId: "sub-1",
            outcome: { type: "suspended", interruptIds: ["int-sub"] },
          },
        });
        subscriber.onRunFinishedEvent?.({
          event: {
            type: "RUN_FINISHED",
            runId: input.runId,
            outcome: {
              type: "interrupt",
              interrupts: [
                { id: "int-root", reason: "confirmation" },
                {
                  id: "int-sub",
                  reason: "input_required",
                  subagentRunId: "sub-1",
                  message: "Which region?",
                },
              ],
            },
          },
        });
      },
    );
    const core = new AgUiThreadController({
      agent: { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent,
      logger: makeLogger(),
      showThinking: false,
    });

    await core.append({
      parentId: null,
      role: "user",
      content: [{ type: "text", text: "deploy" }],
    } as unknown as AppendMessage);

    expect(core.getPendingInterrupts()?.interrupts).toEqual([
      { id: "int-root", reason: "confirmation" },
      {
        id: "int-sub",
        reason: "input_required",
        subagentRunId: "sub-1",
        message: "Which region?",
      },
    ]);

    await core.submitInterruptResponses([
      { interruptId: "int-sub", status: "resolved", payload: "eu-west" },
      { interruptId: "int-root", status: "resolved" },
    ]);

    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(runAgent.mock.calls[1]?.[0]).toMatchObject({
      resume: [
        { interruptId: "int-root", status: "resolved" },
        { interruptId: "int-sub", status: "resolved", payload: "eu-west" },
      ],
    });
    expect(core.getPendingInterrupts()).toBeNull();
  });
});
