import { describe, it, expect, vi } from "vitest";
import { processSDKEvent } from "../sdk/converters";
import type { SDKEvent, TaskState } from "../runtime/types";
import { PlanRuntime } from "../runtime/PlanRuntime";
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

describe("plan converter", () => {
  it("accumulates plan_delta text from currentState (pure)", () => {
    // First delta — no existing plan
    const event1 = sdkEvent(
      "plan_delta",
      "task-1",
      { planId: "plan-1", text: "Step 1: " },
      "agent-1",
    );
    const state1 = makeTaskState();
    const result1 = processSDKEvent(event1, state1);

    expect(result1.planUpdate).toBeDefined();
    expect(result1.planUpdate!.plan.text).toBe("Step 1: ");
    expect(result1.planUpdate!.plan.status).toBe("streaming");
    expect(result1.planUpdate!.isNew).toBe(true);

    // Second delta — plan already streaming
    const event2 = sdkEvent(
      "plan_delta",
      "task-1",
      { planId: "plan-1", text: "Do the thing" },
      "agent-1",
    );
    const state2 = makeTaskState({
      proposedPlan: {
        id: "plan-1",
        text: "Step 1: ",
        status: "streaming",
        agentId: "agent-1",
        taskId: "task-1",
      },
    });
    const result2 = processSDKEvent(event2, state2);

    expect(result2.planUpdate!.plan.text).toBe("Step 1: Do the thing");
    expect(result2.planUpdate!.isNew).toBe(false);
  });

  it("does not change task status during streaming", () => {
    const event = sdkEvent(
      "plan_delta",
      "task-1",
      { planId: "plan-1", text: "hello" },
      "agent-1",
    );
    const result = processSDKEvent(event, makeTaskState());
    expect(result.taskUpdate?.status).toBeUndefined();
  });

  it("handles plan_completed — sets proposed + waiting_input", () => {
    const event = sdkEvent(
      "plan_completed",
      "task-1",
      { planId: "plan-1" },
      "agent-1",
    );
    const state = makeTaskState({
      proposedPlan: {
        id: "plan-1",
        text: "Full plan text",
        status: "streaming",
        agentId: "agent-1",
        taskId: "task-1",
      },
    });
    const result = processSDKEvent(event, state);

    expect(result.planUpdate!.plan.status).toBe("proposed");
    expect(result.taskUpdate?.status).toBe("waiting_input");
    expect(result.newEvent?.type).toBe("plan_proposed");
  });

  it("handles plan_approved — sets approved + running", () => {
    const event = sdkEvent(
      "plan_approved",
      "task-1",
      { planId: "plan-1" },
      "agent-1",
    );
    const result = processSDKEvent(
      event,
      makeTaskState({ status: "waiting_input" }),
    );

    expect(result.planUpdate!.plan.status).toBe("approved");
    expect(result.taskUpdate?.status).toBe("running");
  });

  it("handles plan_rejected — sets rejected + running", () => {
    const event = sdkEvent(
      "plan_rejected",
      "task-1",
      { planId: "plan-1" },
      "agent-1",
    );
    const result = processSDKEvent(
      event,
      makeTaskState({ status: "waiting_input" }),
    );

    expect(result.planUpdate!.plan.status).toBe("rejected");
    expect(result.taskUpdate?.status).toBe("running");
  });

  it("replaces existing proposed plan with new delta", () => {
    const event = sdkEvent(
      "plan_delta",
      "task-1",
      { planId: "plan-2", text: "New plan" },
      "agent-1",
    );
    const state = makeTaskState({
      proposedPlan: {
        id: "plan-1",
        text: "Old plan",
        status: "proposed",
        agentId: "agent-1",
        taskId: "task-1",
      },
    });
    const result = processSDKEvent(event, state);

    expect(result.planUpdate!.isNew).toBe(true);
    expect(result.planUpdate!.plan.text).toBe("Old planNew plan");
  });
});

describe("PlanRuntime", () => {
  it("approve() calls client.respondToPlan", async () => {
    const respondToPlan = vi.fn().mockResolvedValue(undefined);
    const client = { respondToPlan } as unknown as AgentClientInterface;
    const onResolve = vi.fn();

    const runtime = new PlanRuntime(
      {
        id: "plan-1",
        text: "Do stuff",
        status: "proposed",
        agentId: "agent-1",
        taskId: "task-1",
      },
      client,
      onResolve,
    );

    await runtime.approve();

    expect(respondToPlan).toHaveBeenCalledWith("task-1", "plan-1", "approve");
    expect(onResolve).toHaveBeenCalledWith("approved");
  });

  it("reject() calls client.respondToPlan with feedback", async () => {
    const respondToPlan = vi.fn().mockResolvedValue(undefined);
    const client = { respondToPlan } as unknown as AgentClientInterface;
    const onResolve = vi.fn();

    const runtime = new PlanRuntime(
      {
        id: "plan-1",
        text: "Bad plan",
        status: "proposed",
        agentId: "agent-1",
        taskId: "task-1",
      },
      client,
      onResolve,
    );

    await runtime.reject("too risky");

    expect(respondToPlan).toHaveBeenCalledWith(
      "task-1",
      "plan-1",
      "reject",
      "too risky",
    );
    expect(onResolve).toHaveBeenCalledWith("rejected");
  });

  it("throws when not proposed", async () => {
    const client = {
      respondToPlan: vi.fn(),
    } as unknown as AgentClientInterface;

    const runtime = new PlanRuntime(
      {
        id: "plan-1",
        text: "",
        status: "streaming",
        agentId: "agent-1",
        taskId: "task-1",
      },
      client,
      vi.fn(),
    );

    await expect(runtime.approve()).rejects.toThrow("not in proposed state");
  });

  it("throws when client does not implement respondToPlan", async () => {
    const client = {} as unknown as AgentClientInterface;

    const runtime = new PlanRuntime(
      {
        id: "plan-1",
        text: "",
        status: "proposed",
        agentId: "agent-1",
        taskId: "task-1",
      },
      client,
      vi.fn(),
    );

    await expect(runtime.approve()).rejects.toThrow(
      "respondToPlan not implemented",
    );
  });

  it("appendText accumulates text", () => {
    const runtime = new PlanRuntime(
      {
        id: "plan-1",
        text: "Hello ",
        status: "streaming",
        agentId: "agent-1",
        taskId: "task-1",
      },
      {} as AgentClientInterface,
      vi.fn(),
    );

    runtime.appendText("world");
    expect(runtime.getState().text).toBe("Hello world");
  });
});
