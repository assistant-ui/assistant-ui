import { describe, it, expect } from "vitest";
import { processSDKEvent } from "../sdk/converters";
import type { SDKEvent, TaskState } from "../runtime/types";
import { AgentRuntime } from "../runtime/AgentRuntime";

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

describe("activity item converter", () => {
  it("handles item_started — creates newActiveItem", () => {
    const event = sdkEvent(
      "item_started",
      "task-1",
      {
        itemId: "item-1",
        itemType: "command_execution",
        title: "Running tests",
      },
      "agent-1",
    );
    const result = processSDKEvent(event, makeTaskState());

    expect(result.newActiveItem).toBeDefined();
    expect(result.newActiveItem!.id).toBe("item-1");
    expect(result.newActiveItem!.itemType).toBe("command_execution");
    expect(result.newActiveItem!.title).toBe("Running tests");
    expect(result.newActiveItem!.status).toBe("running");
    expect(result.newEvent?.type).toBe("item_started");
  });

  it("handles item_started without title", () => {
    const event = sdkEvent(
      "item_started",
      "task-1",
      { itemId: "item-1", itemType: "file_change" },
      "agent-1",
    );
    const result = processSDKEvent(event, makeTaskState());

    expect(result.newActiveItem).toBeDefined();
    expect(result.newActiveItem!.title).toBeUndefined();
  });

  it("handles item_updated — creates updatedActiveItem", () => {
    const event = sdkEvent(
      "item_updated",
      "task-1",
      { itemId: "item-1", detail: "50% complete" },
      "agent-1",
    );
    const result = processSDKEvent(event, makeTaskState());

    expect(result.updatedActiveItem).toBeDefined();
    expect(result.updatedActiveItem!.id).toBe("item-1");
    expect(result.updatedActiveItem!.update.detail).toBe("50% complete");
    expect(result.newEvent?.type).toBe("item_updated");
  });

  it("handles item_completed — sets completedActiveItemId", () => {
    const event = sdkEvent(
      "item_completed",
      "task-1",
      { itemId: "item-1", status: "completed" },
      "agent-1",
    );
    const result = processSDKEvent(event, makeTaskState());

    expect(result.completedActiveItemId).toBe("item-1");
    expect(result.newEvent?.type).toBe("item_completed");
  });

  it("ignores item events without agentId", () => {
    const event = sdkEvent("item_started", "task-1", {
      itemId: "item-1",
      itemType: "test",
    });
    const result = processSDKEvent(event, makeTaskState());

    expect(result.newActiveItem).toBeUndefined();
    expect(result.newEvent).toBeUndefined();
  });
});

describe("AgentRuntime activeItems", () => {
  it("addActiveItem appends to array", () => {
    const agent = new AgentRuntime({
      id: "agent-1",
      name: "test",
      status: "running",
      cost: 0,
      events: [],
      activeItems: [],
      parentAgentId: null,
      childAgentIds: [],
      taskId: "task-1",
    });

    agent.addActiveItem({
      id: "item-1",
      itemType: "command_execution",
      status: "running",
      startedAt: new Date(),
      agentId: "agent-1",
    });

    expect(agent.getActiveItems()).toHaveLength(1);
    expect(agent.getActiveItems()[0]!.id).toBe("item-1");
  });

  it("updateActiveItem patches in place", () => {
    const agent = new AgentRuntime({
      id: "agent-1",
      name: "test",
      status: "running",
      cost: 0,
      events: [],
      activeItems: [
        {
          id: "item-1",
          itemType: "command_execution",
          status: "running",
          startedAt: new Date(),
          agentId: "agent-1",
        },
      ],
      parentAgentId: null,
      childAgentIds: [],
      taskId: "task-1",
    });

    agent.updateActiveItem("item-1", { detail: "halfway done" });

    expect(agent.getActiveItems()[0]!.detail).toBe("halfway done");
    expect(agent.getActiveItems()[0]!.status).toBe("running");
  });

  it("removeActiveItem filters out item", () => {
    const agent = new AgentRuntime({
      id: "agent-1",
      name: "test",
      status: "running",
      cost: 0,
      events: [],
      activeItems: [
        {
          id: "item-1",
          itemType: "test",
          status: "running",
          startedAt: new Date(),
          agentId: "agent-1",
        },
        {
          id: "item-2",
          itemType: "test",
          status: "running",
          startedAt: new Date(),
          agentId: "agent-1",
        },
      ],
      parentAgentId: null,
      childAgentIds: [],
      taskId: "task-1",
    });

    agent.removeActiveItem("item-1");

    expect(agent.getActiveItems()).toHaveLength(1);
    expect(agent.getActiveItems()[0]!.id).toBe("item-2");
  });
});
