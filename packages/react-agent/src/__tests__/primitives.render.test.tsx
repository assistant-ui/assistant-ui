import { describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

vi.mock("../hooks", () => ({
  TaskProvider: ({ children }: any) => children,
  AgentProvider: ({ children }: any) => children,
  ApprovalProvider: ({ children }: any) => children,
  useTaskState: (selector: any) =>
    selector({
      id: "task-1",
      title: "Investigate latency",
      status: "running",
      cost: 12.3456,
      agents: [{ id: "agent-1" }],
      pendingApprovals: [{ id: "approval-1", status: "pending" }],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: undefined,
    }),
  useAgentState: (selector: any) =>
    selector({
      id: "agent-1",
      name: "Planner",
      status: "running",
      cost: 3.21,
      events: [],
      parentAgentId: null,
      childAgentIds: [],
      taskId: "task-1",
    }),
  useApprovalState: (selector: any) =>
    selector({
      id: "approval-1",
      toolName: "Read",
      toolInput: { path: "README.md" },
      reason: "Need to inspect docs",
      status: "pending",
      agentId: "agent-1",
      taskId: "task-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
  useApproval: () => ({
    approve: async () => {},
    deny: async () => {},
  }),
}));

import {
  AgentPrimitive,
  ApprovalPrimitive,
  TaskPrimitive,
} from "../primitives";

describe("primitive rendering", () => {
  it("renders provider roots", () => {
    const child = <span>content</span>;

    const taskRoot = TaskPrimitive.Root({ taskId: "task-1", children: child });
    const agentRoot = AgentPrimitive.Root({
      agentId: "agent-1",
      children: child,
    });
    const approvalRoot = ApprovalPrimitive.Root({
      approvalId: "approval-1",
      children: child,
    });

    expect(isValidElement(taskRoot)).toBe(true);
    expect((taskRoot as any).props.taskId).toBe("task-1");
    expect((taskRoot as any).props.children).toBe(child);

    expect(isValidElement(agentRoot)).toBe(true);
    expect((agentRoot as any).props.agentId).toBe("agent-1");
    expect((agentRoot as any).props.children).toBe(child);

    expect(isValidElement(approvalRoot)).toBe(true);
    expect((approvalRoot as any).props.approvalId).toBe("approval-1");
    expect((approvalRoot as any).props.children).toBe(child);
  });

  it("renders task primitive parts", () => {
    const title = TaskPrimitive.Title({});
    const status = TaskPrimitive.Status({ showIcon: false });
    const cost = TaskPrimitive.Cost({ precision: 2 });

    expect(isValidElement(title)).toBe(true);
    expect((title as any).props.children).toBe("Investigate latency");

    expect(isValidElement(status)).toBe(true);
    expect((status as any).props.children).toContain("running");

    expect(isValidElement(cost)).toBe(true);
    expect((cost as any).props.children).toContain("12.35");
  });

  it("renders agent primitive parts", () => {
    const name = AgentPrimitive.Name({});
    const status = AgentPrimitive.Status({ showIcon: false });
    const cost = AgentPrimitive.Cost({ precision: 2 });

    expect(isValidElement(name)).toBe(true);
    expect((name as any).props.children).toBe("Planner");

    expect(isValidElement(status)).toBe(true);
    expect((status as any).props.children).toContain("running");

    expect(isValidElement(cost)).toBe(true);
    expect((cost as any).props.children).toContain("3.21");
  });

  it("renders approval primitive parts", () => {
    const toolName = ApprovalPrimitive.ToolName({});
    const reason = ApprovalPrimitive.Reason({});
    const toolInput = ApprovalPrimitive.ToolInput({});
    const status = ApprovalPrimitive.Status({ showIcon: false });

    expect(isValidElement(toolName)).toBe(true);
    expect((toolName as any).props.children).toBe("Read");

    expect(isValidElement(reason)).toBe(true);
    expect((reason as any).props.children).toBe("Need to inspect docs");

    expect(isValidElement(toolInput)).toBe(true);
    expect((toolInput as any).props.children).toContain("README.md");

    expect(isValidElement(status)).toBe(true);
    expect((status as any).props.children).toContain("pending");
  });
});
