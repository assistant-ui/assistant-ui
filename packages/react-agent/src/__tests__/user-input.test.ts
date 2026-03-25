import { describe, it, expect, vi } from "vitest";
import { processSDKEvent } from "../sdk/converters";
import type { SDKEvent, TaskState } from "../runtime/types";
import { UserInputRuntime } from "../runtime/UserInputRuntime";
import type { AgentClientInterface } from "../sdk/HttpAgentClient";

function sdkEvent(
  type: SDKEvent["type"],
  taskId: string,
  data: unknown,
  agentId?: string,
): SDKEvent {
  const event: SDKEvent = {
    type,
    taskId,
    data,
    timestamp: new Date("2026-02-28T00:00:00.000Z"),
  };
  if (agentId) event.agentId = agentId;
  return event;
}

function makeTaskState(overrides?: Partial<TaskState>): TaskState {
  return {
    id: "task-1",
    title: "",
    status: "running",
    cost: 0,
    agents: [],
    pendingApprovals: [],
    pendingUserInputs: [],
    proposedPlan: undefined,
    createdAt: new Date(),
    completedAt: undefined,
    ...overrides,
  };
}

describe("user input converter", () => {
  it("handles user_input_requested", () => {
    const event = sdkEvent(
      "user_input_requested",
      "task-1",
      {
        requestId: "req-1",
        questions: [{ id: "q1", prompt: "What is your name?", type: "text" }],
      },
      "agent-1",
    );
    const state = makeTaskState();
    const result = processSDKEvent(event, state);

    expect(result.newUserInput).toBeDefined();
    expect(result.newUserInput!.id).toBe("req-1");
    expect(result.newUserInput!.questions).toHaveLength(1);
    expect(result.newUserInput!.status).toBe("pending");
    expect(result.taskUpdate?.status).toBe("waiting_input");
    expect(result.newEvent?.type).toBe("user_input_requested");
  });

  it("handles user_input_resolved", () => {
    const event = sdkEvent(
      "user_input_resolved",
      "task-1",
      { requestId: "req-1", answers: { q1: "Sam" } },
      "agent-1",
    );
    const state = makeTaskState({
      status: "waiting_input",
      pendingUserInputs: [
        {
          id: "req-1",
          questions: [],
          status: "pending",
          agentId: "agent-1",
          taskId: "task-1",
          createdAt: new Date(),
        },
      ],
    });
    const result = processSDKEvent(event, state);

    expect(result.resolvedUserInputId).toBe("req-1");
    expect(result.taskUpdate?.status).toBe("running");
    expect(result.newEvent?.type).toBe("user_input_resolved");
  });

  it("stays waiting_input when multiple inputs pending", () => {
    const event = sdkEvent(
      "user_input_resolved",
      "task-1",
      { requestId: "req-1", answers: { q1: "Sam" } },
      "agent-1",
    );
    const state = makeTaskState({
      status: "waiting_input",
      pendingUserInputs: [
        {
          id: "req-1",
          questions: [],
          status: "pending",
          agentId: "agent-1",
          taskId: "task-1",
          createdAt: new Date(),
        },
        {
          id: "req-2",
          questions: [],
          status: "pending",
          agentId: "agent-1",
          taskId: "task-1",
          createdAt: new Date(),
        },
      ],
    });
    const result = processSDKEvent(event, state);

    expect(result.resolvedUserInputId).toBe("req-1");
    // Should stay waiting_input because req-2 is still pending
    expect(result.taskUpdate?.status).toBe("waiting_input");
  });
});

describe("UserInputRuntime", () => {
  it("calls client.respondToUserInput on respond()", async () => {
    const respondToUserInput = vi.fn().mockResolvedValue(undefined);
    const client = { respondToUserInput } as unknown as AgentClientInterface;
    const onResolve = vi.fn();

    const runtime = new UserInputRuntime(
      {
        id: "req-1",
        questions: [{ id: "q1", prompt: "Name?", type: "text" as const }],
        status: "pending",
        agentId: "agent-1",
        taskId: "task-1",
        createdAt: new Date(),
      },
      client,
      onResolve,
    );

    await runtime.respond({ q1: "Sam" });

    expect(respondToUserInput).toHaveBeenCalledWith("task-1", "req-1", {
      q1: "Sam",
    });
    expect(runtime.getState().status).toBe("resolved");
    expect(onResolve).toHaveBeenCalledWith("resolved");
  });

  it("throws when client does not implement respondToUserInput", async () => {
    const client = {} as unknown as AgentClientInterface;
    const onResolve = vi.fn();

    const runtime = new UserInputRuntime(
      {
        id: "req-1",
        questions: [],
        status: "pending",
        agentId: "agent-1",
        taskId: "task-1",
        createdAt: new Date(),
      },
      client,
      onResolve,
    );

    await expect(runtime.respond({ q1: "Sam" })).rejects.toThrow(
      "respondToUserInput not implemented",
    );
    expect(runtime.getState().status).toBe("pending");
  });

  it("throws when not pending", async () => {
    const client = {
      respondToUserInput: vi.fn(),
    } as unknown as AgentClientInterface;

    const runtime = new UserInputRuntime(
      {
        id: "req-1",
        questions: [],
        status: "resolved",
        agentId: "agent-1",
        taskId: "task-1",
        createdAt: new Date(),
      },
      client,
      vi.fn(),
    );

    await expect(runtime.respond({})).rejects.toThrow("not pending");
  });
});
