import { describe, expect, it } from "vitest";
import {
  useAgentWorkspace,
  useWorkspaceTasks,
  useTaskId,
  useTask,
  useTaskState,
  useTaskStateById,
  useAgentId,
  useAgent,
  useAgentState,
  useAgentStateById,
  useApprovalId,
  useApproval,
  useApprovalState,
  useApprovalStateById,
  usePermissionMode,
  useSetPermissionMode,
  useTaskTree,
  useAgentTree,
  useApprovalQueue,
} from "../index";

describe("hooks surface", () => {
  it("exports all documented hooks", () => {
    const hooks = [
      useAgentWorkspace,
      useWorkspaceTasks,
      useTaskId,
      useTask,
      useTaskState,
      useTaskStateById,
      useAgentId,
      useAgent,
      useAgentState,
      useAgentStateById,
      useApprovalId,
      useApproval,
      useApprovalState,
      useApprovalStateById,
      usePermissionMode,
      useSetPermissionMode,
      useTaskTree,
      useAgentTree,
      useApprovalQueue,
    ];

    hooks.forEach((hook) => {
      expect(typeof hook).toBe("function");
    });
  });
});
