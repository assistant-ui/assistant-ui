import type {
  AssistantThreadMessageLike,
  AssistantToolPart,
} from "../../assistantTypes";
import { mergeToolArgs, mergeToolPart } from "./merge";
import type { AugmentAssistantStore } from "./store";

export function upsertToolPart(
  store: AugmentAssistantStore,
  tool: AssistantToolPart,
): AugmentAssistantStore {
  const message = ensureLastAssistantMessage(store);
  const existingIndex = message.content.findIndex(
    (part) => part.type === "tool-call" && part.toolCallId === tool.toolCallId,
  );
  const content = [...message.content];
  if (existingIndex === -1) {
    content.push(tool);
  } else {
    const existing = content[existingIndex] as AssistantToolPart;
    content[existingIndex] = {
      ...existing,
      ...tool,
      args: mergeToolArgs(existing.args, tool.args),
      argsText:
        tool.argsText && tool.argsText !== "{}"
          ? tool.argsText
          : existing.argsText,
      result: tool.result !== undefined ? tool.result : existing.result,
      isError: tool.isError ?? existing.isError,
      artifact: tool.artifact ?? existing.artifact,
      status: tool.status ?? existing.status,
    };
  }
  return replaceMessage(store, {
    ...message,
    content,
    status: { type: "running" },
  });
}

export function ensureLastAssistantMessage(
  store: AugmentAssistantStore,
): AssistantThreadMessageLike {
  const last = store.messages.at(-1);
  if (last?.role === "assistant") return last;
  return {
    id: `assistant-${store.threadId ?? "current"}-${crypto.randomUUID()}`,
    role: "assistant",
    createdAt: new Date(),
    content: [],
    status: { type: "running" },
  };
}

export function replaceMessage(
  store: AugmentAssistantStore,
  message: AssistantThreadMessageLike,
): AugmentAssistantStore {
  const index = store.messages.findIndex((item) => item.id === message.id);
  if (index === -1) return { ...store, messages: [...store.messages, message] };
  const messages = [...store.messages];
  messages[index] = message;
  return { ...store, messages };
}

export function findToolPart(
  store: AugmentAssistantStore,
  toolCallId: string,
): AssistantToolPart | null {
  for (const message of store.messages) {
    const part = message.content.find(
      (candidate) =>
        candidate.type === "tool-call" && candidate.toolCallId === toolCallId,
    );
    if (part?.type === "tool-call") return part;
  }
  return null;
}

export function updateToolPartIfPresent(
  store: AugmentAssistantStore,
  tool: AssistantToolPart,
): { store: AugmentAssistantStore; found: boolean } {
  let found = false;
  const messages = store.messages.map((message) => {
    let changed = false;
    const content = message.content.map((part) => {
      if (part.type !== "tool-call" || part.toolCallId !== tool.toolCallId)
        return part;
      found = true;
      changed = true;
      return mergeToolPart(part, tool);
    });
    if (!changed) return message;
    const status =
      tool.status?.type === "running" || tool.status?.type === "requires-action"
        ? { type: "running" as const }
        : message.status;
    return { ...message, content, status };
  });
  return found ? { store: { ...store, messages }, found } : { store, found };
}

export function updateToolPartByNameIfPresent(
  store: AugmentAssistantStore,
  toolName: string,
  tool: AssistantToolPart,
): { store: AugmentAssistantStore; found: boolean } {
  let found = false;
  const messages = store.messages.map((message) => {
    if (found) return message;
    let changed = false;
    const content = message.content.map((part) => {
      if (found || part.type !== "tool-call" || part.toolName !== toolName)
        return part;
      found = true;
      changed = true;
      return mergeToolPart(part, tool);
    });
    return changed ? { ...message, content } : message;
  });
  return found ? { store: { ...store, messages }, found } : { store, found };
}
