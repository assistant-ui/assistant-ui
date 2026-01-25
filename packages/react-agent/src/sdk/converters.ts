/**
 * Converters for transforming SDK events into runtime state.
 */

import type {
  AgentEvent,
  AgentState,
  ApprovalState,
  SDKEvent,
  TaskState,
} from "../runtime/types";
import { nanoid } from "nanoid";

export interface ProcessEventResult {
  taskUpdate?: Partial<TaskState>;
  agentUpdate?: { id: string; update: Partial<AgentState> };
  newAgent?: AgentState;
  newApproval?: ApprovalState;
  resolvedApprovalId?: string;
  newEvent?: AgentEvent;
}

export function processSDKEvent(
  event: SDKEvent,
  currentState: TaskState,
): ProcessEventResult {
  const result: ProcessEventResult = {};

  switch (event.type) {
    case "task_started": {
      result.taskUpdate = {
        status: "running",
      };
      break;
    }

    case "task_completed": {
      const data = event.data as { totalCost?: number };
      result.taskUpdate = {
        status: "completed",
        cost: data.totalCost ?? currentState.cost,
        completedAt: new Date(),
      };
      break;
    }

    case "task_failed": {
      const data = event.data as { reason?: string };
      result.taskUpdate = {
        status: "failed",
        completedAt: new Date(),
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "error",
          timestamp: event.timestamp,
          content: { message: data.reason ?? "Task failed" },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "agent_spawned": {
      const data = event.data as { name: string; parentAgentId: string | null };
      if (event.agentId) {
        result.newAgent = {
          id: event.agentId,
          name: data.name,
          status: "running",
          cost: 0,
          events: [],
          parentAgentId: data.parentAgentId,
          childAgentIds: [],
          taskId: event.taskId,
        };
      }
      break;
    }

    case "agent_completed": {
      const data = event.data as { finalCost?: number };
      if (event.agentId) {
        result.agentUpdate = {
          id: event.agentId,
          update: {
            status: "completed",
            cost: data.finalCost ?? 0,
          },
        };
      }
      break;
    }

    case "agent_failed": {
      const data = event.data as { reason?: string };
      if (event.agentId) {
        result.agentUpdate = {
          id: event.agentId,
          update: {
            status: "failed",
          },
        };
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "error",
          timestamp: event.timestamp,
          content: { message: data.reason ?? "Agent failed" },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "tool_use_requested": {
      const data = event.data as {
        approvalId: string;
        toolCallId: string;
        toolName: string;
        toolInput: unknown;
        reason: string;
      };
      if (event.agentId) {
        result.newApproval = {
          id: data.approvalId,
          toolName: data.toolName,
          toolInput: data.toolInput,
          reason: data.reason,
          status: "pending",
          agentId: event.agentId,
          taskId: event.taskId,
          createdAt: event.timestamp,
        };
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "tool_call",
          timestamp: event.timestamp,
          content: {
            toolName: data.toolName,
            toolInput: data.toolInput,
            toolCallId: data.toolCallId,
          },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "tool_use_approved": {
      const data = event.data as { approvalId: string };
      result.resolvedApprovalId = data.approvalId;
      break;
    }

    case "tool_use_denied": {
      const data = event.data as { approvalId: string };
      result.resolvedApprovalId = data.approvalId;
      break;
    }

    case "tool_result": {
      const data = event.data as {
        toolCallId: string;
        result: unknown;
        isError?: boolean;
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "tool_result",
          timestamp: event.timestamp,
          content: {
            toolCallId: data.toolCallId,
            result: data.result,
            isError: data.isError,
          },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "reasoning": {
      const data = event.data as { text: string };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "reasoning",
          timestamp: event.timestamp,
          content: { text: data.text },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "message": {
      const data = event.data as { text: string };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "message",
          timestamp: event.timestamp,
          content: { text: data.text },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "cost_update": {
      const data = event.data as { cost?: number; totalCost?: number };
      if (event.agentId && data.cost !== undefined) {
        result.agentUpdate = {
          id: event.agentId,
          update: {
            cost: data.cost,
          },
        };
      }
      if (data.totalCost !== undefined) {
        result.taskUpdate = {
          cost: data.totalCost,
        };
      }
      break;
    }
  }

  return result;
}
