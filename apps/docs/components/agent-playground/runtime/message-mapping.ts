import type { AppendMessage } from "@assistant-ui/react";
import type {
  FrontendExampleSummary,
  ServerEvent,
  SessionStateResponse,
  WorkspaceEnvRequestItem,
} from "./types";

export type AgentToolSummary = {
  id: string;
  name: string;
  status: "running" | "complete" | "requires-action" | "failed";
};

export type AgentPlaygroundMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  content: Array<{ type: "text"; text: string }>;
  tools: AgentToolSummary[];
};

export type PendingWorkspaceEnvRequest = {
  id: string;
  appPath: string;
  reason: string;
  requested: WorkspaceEnvRequestItem[];
};

export type PendingApproval = {
  id: string;
  toolName: string;
};

export type PendingQuestion = {
  id: string;
  question: string;
};

export type PreviewTarget = {
  status: "empty" | "loading" | "ready" | "failed";
  label: string;
  hint?: string;
  url?: string;
};

export function textFromAppendMessage(message: AppendMessage): string {
  const part = message.content?.find(
    (candidate: any) => candidate.type === "text",
  ) as { text?: string } | undefined;
  return part?.text ?? "";
}

export function createTextMessage(
  role: AgentPlaygroundMessage["role"],
  text: string,
): AgentPlaygroundMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    content: [{ type: "text", text }],
    tools: [],
  };
}

export function hydrateMessagesFromState(
  state: SessionStateResponse,
): AgentPlaygroundMessage[] {
  return (state.messages ?? [])
    .map(messageFromStored)
    .filter(Boolean) as AgentPlaygroundMessage[];
}

export function applyServerEventToMessages(
  messages: AgentPlaygroundMessage[],
  event: ServerEvent,
): AgentPlaygroundMessage[] {
  if (event.type === "message_update" || event.type === "message_end") {
    const message = messageFromPayload(event);
    if (!message) return messages;
    const index = messages.findIndex(
      (candidate) => candidate.id === message.id,
    );
    if (index === -1) return [...messages, message];
    return messages.map((candidate, candidateIndex) =>
      candidateIndex === index ? mergeMessages(candidate, message) : candidate,
    );
  }

  const tool = toolFromEvent(event);
  if (tool) return upsertTool(messages, tool);

  const text = assistantTextFromEvent(event);
  if (text) return [...messages, createTextMessage("assistant", text)];
  return messages;
}

export function workspaceEnvRequestFromEvent(
  event: ServerEvent,
): PendingWorkspaceEnvRequest | null {
  if (event.type !== "workspace_env_request_created") return null;
  const payload = asRecord(event.payload);
  const requestId = stringValue(payload.requestId) ?? event.id;
  const requested = Array.isArray(payload.requested)
    ? (payload.requested
        .map(toWorkspaceEnvItem)
        .filter(Boolean) as WorkspaceEnvRequestItem[])
    : [];
  return {
    id: requestId,
    appPath: stringValue(payload.appPath) ?? "/workspace",
    reason:
      stringValue(payload.reason) ??
      "The workspace needs environment variables.",
    requested,
  };
}

export function workspaceEnvClearIdFromEvent(
  event: ServerEvent,
): string | null {
  if (
    event.type !== "workspace_env_updated" &&
    event.type !== "workspace_env_skipped"
  )
    return null;
  return stringValue(asRecord(event.payload).requestId);
}

export function pendingApprovalFromEvent(
  event: ServerEvent,
): PendingApproval | null {
  if (event.type !== "tool_approval_required") return null;
  const payload = asRecord(event.payload);
  return {
    id:
      stringValue(payload.approvalId) ??
      stringValue(payload.toolCallId) ??
      event.id,
    toolName: stringValue(payload.toolName) ?? "tool",
  };
}

export function pendingQuestionFromEvent(
  event: ServerEvent,
): PendingQuestion | null {
  if (event.type !== "ask_question") return null;
  const payload = asRecord(event.payload);
  return {
    id:
      stringValue(payload.questionId) ??
      stringValue(payload.toolCallId) ??
      event.id,
    question:
      stringValue(payload.question) ?? "The agent needs more information.",
  };
}

export function previewFromEvent(
  event: ServerEvent,
  selectedExample?: FrontendExampleSummary,
): PreviewTarget | null {
  const payload = asRecord(event.payload);
  const result = asRecord(payload.result);
  const directUrl =
    stringValue(payload.url) ??
    stringValue(result.url) ??
    stringValue(result.previewUrl);
  if (directUrl) {
    return {
      status: "ready",
      label: "Live preview",
      url: directUrl,
      hint: "Preview resolved by the agent.",
    };
  }
  if (
    event.type === "tool_start" &&
    (payload.toolName === "resolve_workspace_preview" ||
      payload.toolName === "show_ui_preview")
  ) {
    return { status: "loading", label: "Preview", hint: "Resolving preview." };
  }
  if (event.type === "tool_end" && payload.isError) {
    return {
      status: "failed",
      label: "Preview",
      hint: "Preview resolution failed.",
    };
  }
  if (selectedExample?.preview?.url) {
    return {
      status: "ready",
      label: selectedExample.label,
      url: selectedExample.preview.url,
      hint: selectedExample.teaser,
    };
  }
  return null;
}

function messageFromStored(value: unknown): AgentPlaygroundMessage | null {
  const record = asRecord(value);
  const role =
    record.role === "user" || record.role === "assistant" ? record.role : null;
  if (!role) return null;
  const id = stringValue(record.id) ?? createTextMessage(role, "").id;
  const content = Array.isArray(record.content)
    ? record.content
    : Array.isArray(record.parts)
      ? record.parts
      : [];
  const text = content.map(textFromPart).filter(Boolean).join("");
  const tools = content.map(toolFromPart).filter(Boolean) as AgentToolSummary[];
  return { id, role, text, content: [{ type: "text", text }], tools };
}

function messageFromPayload(event: ServerEvent): AgentPlaygroundMessage | null {
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message);
  const id = stringValue(message.id) ?? event.id;
  const content = Array.isArray(message.content) ? message.content : [];
  const text = content.map(textFromPart).filter(Boolean).join("");
  const tools = content.map(toolFromPart).filter(Boolean) as AgentToolSummary[];
  if (!text && tools.length === 0) return null;
  return {
    id,
    role: "assistant",
    text,
    content: [{ type: "text", text }],
    tools,
  };
}

function mergeMessages(
  existing: AgentPlaygroundMessage,
  incoming: AgentPlaygroundMessage,
): AgentPlaygroundMessage {
  const toolsById = new Map(existing.tools.map((tool) => [tool.id, tool]));
  for (const tool of incoming.tools) toolsById.set(tool.id, tool);
  return {
    ...existing,
    text: incoming.text || existing.text,
    content: [{ type: "text", text: incoming.text || existing.text }],
    tools: [...toolsById.values()],
  };
}

function upsertTool(
  messages: AgentPlaygroundMessage[],
  tool: AgentToolSummary,
): AgentPlaygroundMessage[] {
  const lastAssistantIndex = findLastIndex(
    messages,
    (message) => message.role === "assistant",
  );
  if (lastAssistantIndex === -1) {
    return [
      ...messages,
      { ...createTextMessage("assistant", ""), tools: [tool] },
    ];
  }
  return messages.map((message, index) => {
    if (index !== lastAssistantIndex) return message;
    const toolsById = new Map(
      message.tools.map((candidate) => [candidate.id, candidate]),
    );
    toolsById.set(tool.id, tool);
    return { ...message, tools: [...toolsById.values()] };
  });
}

function toolFromEvent(event: ServerEvent): AgentToolSummary | null {
  const payload = asRecord(event.payload);
  const id = stringValue(payload.toolCallId) ?? stringValue(payload.id);
  const name = stringValue(payload.toolName) ?? stringValue(payload.name);
  if (!id && !name) return null;
  if (
    event.type === "tool_start" ||
    event.type === "tool_update" ||
    event.type === "tool_input_start"
  ) {
    return { id: id ?? event.id, name: name ?? "tool", status: "running" };
  }
  if (event.type === "tool_end") {
    return {
      id: id ?? event.id,
      name: name ?? "tool",
      status: payload.isError ? "failed" : "complete",
    };
  }
  if (event.type === "tool_approval_required") {
    return {
      id: id ?? event.id,
      name: name ?? "tool",
      status: "requires-action",
    };
  }
  return null;
}

function toolFromPart(part: unknown): AgentToolSummary | null {
  const record = asRecord(part);
  const type = record.type;
  if (type !== "tool-call" && type !== "tool_call" && type !== "tool_result")
    return null;
  const id =
    stringValue(record.toolCallId) ??
    stringValue(record.id) ??
    stringValue(record.name) ??
    "tool";
  const name =
    stringValue(record.toolName) ?? stringValue(record.name) ?? "tool";
  const status =
    record.status &&
    typeof record.status === "object" &&
    "type" in record.status
      ? stringValue((record.status as any).type)
      : record.result !== undefined
        ? "complete"
        : "running";
  return {
    id,
    name,
    status:
      status === "complete"
        ? "complete"
        : status === "requires-action"
          ? "requires-action"
          : "running",
  };
}

function assistantTextFromEvent(event: ServerEvent): string | null {
  const payload = asRecord(event.payload);
  const candidates = [
    payload.text,
    payload.delta,
    payload.message,
    asRecord(payload.data).text,
    asRecord(payload.data).delta,
  ];
  const text = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  if (typeof text === "string") return text;
  if (event.type === "error" || event.type === "agent_error") {
    return (
      stringValue(asRecord(payload.error).message) ??
      stringValue(payload.error) ??
      "The agent reported an error."
    );
  }
  return null;
}

function textFromPart(part: unknown): string {
  const record = asRecord(part);
  if (record.type === "text") return stringValue(record.text) ?? "";
  if (record.type === "reasoning") return stringValue(record.text) ?? "";
  return "";
}

function toWorkspaceEnvItem(value: unknown): WorkspaceEnvRequestItem | null {
  const record = asRecord(value);
  const name = stringValue(record.name);
  if (!name) return null;
  return {
    name,
    required: record.required === true,
    secret: record.secret !== false,
    envFile: record.envFile === ".env" ? ".env" : ".env.local",
    ...(stringValue(record.description)
      ? { description: stringValue(record.description) as string }
      : {}),
  };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index] as T)) return index;
  }
  return -1;
}
