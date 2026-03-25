import type { AgentEvent, ToolCallEvent, ToolResultEvent } from "../../runtime";

export type ToolExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface ToolExecution {
  id: string;
  toolName: string;
  input: unknown;
  output: unknown;
  status: ToolExecutionStatus;
  error: string | null;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  agentId: string;
}

function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

function isToolResultEvent(event: AgentEvent): event is ToolResultEvent {
  return event.type === "tool_result";
}

export function eventsToToolExecutions(events: AgentEvent[]): ToolExecution[] {
  const executions = new Map<string, ToolExecution>();

  events.forEach((event) => {
    if (isToolCallEvent(event)) {
      const toolCallId = event.content.toolCallId;

      executions.set(toolCallId, {
        id: toolCallId,
        toolName: event.content.toolName,
        input: event.content.toolInput,
        output: null,
        status: "pending",
        error: null,
        startTime: event.timestamp,
        endTime: null,
        duration: null,
        agentId: event.agentId,
      });
    } else if (isToolResultEvent(event)) {
      const toolCallId = event.content.toolCallId;
      const execution = executions.get(toolCallId);

      if (execution) {
        const endTime = event.timestamp;
        const duration = endTime.getTime() - execution.startTime.getTime();

        executions.set(toolCallId, {
          ...execution,
          output: event.content.result,
          status: event.content.isError ? "failed" : "completed",
          error: event.content.isError ? String(event.content.result) : null,
          endTime,
          duration,
        });
      }
    } else if (event.type === "tool_approved") {
      const toolCallId = (event.content as { toolCallId?: string }).toolCallId;
      if (!toolCallId) return;
      const execution = executions.get(toolCallId);
      if (execution) {
        executions.set(toolCallId, {
          ...execution,
          status: "running",
        });
      }
    } else if (event.type === "tool_progress") {
      const toolCallId = (event.content as { toolUseId?: string }).toolUseId;
      if (!toolCallId) return;
      const execution = executions.get(toolCallId);
      if (execution) {
        executions.set(toolCallId, {
          ...execution,
          status: "running",
        });
      }
    } else if (event.type === "tool_denied") {
      const toolCallId = (event.content as { toolCallId?: string }).toolCallId;
      if (!toolCallId) return;
      const execution = executions.get(toolCallId);
      if (execution) {
        const endTime = event.timestamp;
        executions.set(toolCallId, {
          ...execution,
          status: "failed",
          error: "Tool execution denied",
          endTime,
          duration: endTime.getTime() - execution.startTime.getTime(),
        });
      }
    }
  });

  return Array.from(executions.values());
}
