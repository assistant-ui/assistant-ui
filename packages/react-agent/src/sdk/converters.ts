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
      const data = event.data as { prompt?: string };
      result.taskUpdate = {
        status: "running",
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "task_started",
          timestamp: event.timestamp,
          content: { prompt: data.prompt ?? "" },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "task_completed": {
      const data = event.data as { totalCost?: number };
      result.taskUpdate = {
        status: "completed",
        cost: data.totalCost ?? currentState.cost,
        completedAt: new Date(),
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "task_completed",
          timestamp: event.timestamp,
          content: { totalCost: data.totalCost },
          agentId: event.agentId,
        };
      }
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
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "agent_spawned",
          timestamp: event.timestamp,
          content: { name: data.name, parentAgentId: data.parentAgentId },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "agent_completed": {
      const data = event.data as {
        finalCost?: number;
        status?: string;
        summary?: string;
      };
      if (event.agentId) {
        const update: Partial<AgentState> = {
          status: "completed",
        };
        if (data.finalCost !== undefined && data.finalCost !== 0) {
          update.cost = data.finalCost;
        }
        result.agentUpdate = {
          id: event.agentId,
          update,
        };
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "agent_completed",
          timestamp: event.timestamp,
          content: {
            finalCost: data.finalCost,
            status: data.status,
            summary: data.summary,
          },
          agentId: event.agentId,
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
      // Change task status to waiting_input when approval is requested
      result.taskUpdate = {
        status: "waiting_input",
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
      const data = event.data as { approvalId: string; toolCallId?: string };
      result.resolvedApprovalId = data.approvalId;
      // Change task status back to running when approval is resolved
      result.taskUpdate = {
        status: "running",
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "tool_approved",
          timestamp: event.timestamp,
          content: { approvalId: data.approvalId, toolCallId: data.toolCallId },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "tool_use_denied": {
      const data = event.data as { approvalId: string; toolCallId?: string };
      result.resolvedApprovalId = data.approvalId;
      // Change task status back to running when approval is resolved
      result.taskUpdate = {
        status: "running",
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "tool_denied",
          timestamp: event.timestamp,
          content: { approvalId: data.approvalId, toolCallId: data.toolCallId },
          agentId: event.agentId,
        };
      }
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
      const data = event.data as {
        text: string;
        isWaitingForInput?: boolean;
        isUserMessage?: boolean;
      };
      // Set status to waiting_input when agent is waiting for user input
      if (data.isWaitingForInput) {
        result.taskUpdate = {
          status: "waiting_input",
        };
      }
      // Set status back to running when user sends a message
      if (data.isUserMessage) {
        result.taskUpdate = {
          status: "running",
        };
      }
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "message",
          timestamp: event.timestamp,
          content: {
            text: data.text,
            isWaitingForInput: data.isWaitingForInput,
            isUserMessage: data.isUserMessage,
          },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "message_delta": {
      // Streaming text delta - append to ongoing message or create new
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

    case "tool_use": {
      // Direct tool use event (without approval flow)
      const data = event.data as {
        toolCallId: string;
        toolName: string;
        toolInput: unknown;
      };
      if (event.agentId) {
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

    case "tool_progress": {
      const data = event.data as {
        toolUseId: string;
        toolName: string;
        elapsedSeconds: number;
      };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "tool_progress",
          timestamp: event.timestamp,
          content: {
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            elapsedSeconds: data.elapsedSeconds,
          },
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
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "cost_update",
          timestamp: event.timestamp,
          content: { cost: data.cost, totalCost: data.totalCost },
          agentId: event.agentId,
        };
      }
      break;
    }

    case "system_init": {
      const data = event.data as { sessionId?: string; tools?: string[] };
      if (event.agentId) {
        result.newEvent = {
          id: `evt_${nanoid()}`,
          type: "system_init",
          timestamp: event.timestamp,
          content: { sessionId: data.sessionId, tools: data.tools },
          agentId: event.agentId,
        };
      }
      break;
    }
  }

  return result;
}
