import { describe, expect, it } from "vitest";
import * as ReactAgent from "../index";

describe("@assistant-ui/react-agent exports", () => {
  it("exports runtime and SDK entry points", () => {
    expect(ReactAgent.WorkspaceRuntime).toBeDefined();
    expect(ReactAgent.TaskRuntime).toBeDefined();
    expect(ReactAgent.AgentRuntime).toBeDefined();
    expect(ReactAgent.ApprovalRuntime).toBeDefined();
    expect(ReactAgent.HttpAgentClient).toBeDefined();
    expect(ReactAgent.AnthropicAgentClient).toBeDefined();
  });

  it("exports hook and primitive namespaces", () => {
    expect(ReactAgent.AgentWorkspaceProvider).toBeDefined();
    expect(ReactAgent.useAgentWorkspace).toBeDefined();
    expect(ReactAgent.useTaskState).toBeDefined();
    expect(ReactAgent.useAgentState).toBeDefined();
    expect(ReactAgent.useApprovalState).toBeDefined();
    expect(ReactAgent.TaskPrimitive).toBeDefined();
    expect(ReactAgent.AgentPrimitive).toBeDefined();
    expect(ReactAgent.ApprovalPrimitive).toBeDefined();
    expect(ReactAgent.WorkspacePrimitive).toBeDefined();
    expect(ReactAgent.ToolExecutionPrimitive).toBeDefined();
  });
});
