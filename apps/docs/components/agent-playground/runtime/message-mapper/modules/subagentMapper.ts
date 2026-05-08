import type { ServerEvent } from "../../../augment/types";
import type { AssistantToolPart } from "../../assistantTypes";
import { asRecord } from "./guards";
import { subagentIdFromPayload } from "./ids";
import { mergeToolArgs } from "./merge";
import { findToolPart, replaceMessage, upsertToolPart } from "./storeMutations";
import type { AugmentAssistantStore } from "./store";

type NestedToolInfo = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown | undefined;
  isError?: boolean | undefined;
  status: "running" | "complete";
};

export function appendSubagentTextDelta(
  store: AugmentAssistantStore,
  event: ServerEvent,
): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const subagentId = subagentIdFromPayload(payload, event);
  const delta = String(
    payload.textDelta ?? payload.delta ?? payload.text ?? "",
  );
  if (!delta) return store;

  const existing = findToolPart(store, subagentId);
  const currentText =
    typeof existing?.args.subagentText === "string"
      ? existing.args.subagentText
      : "";
  const tool: AssistantToolPart = {
    type: "tool-call",
    toolCallId: subagentId,
    toolName: "subagent",
    args: mergeToolArgs(existing?.args ?? {}, {
      subagentText: `${currentText}${delta}`,
    }),
    result: existing?.result,
    status: { type: "running" },
  };
  return upsertToolPart(store, tool);
}

export function subagentPartFromEvent(
  event: ServerEvent,
  options: { status: "running" | "complete" },
): AssistantToolPart {
  const payload = asRecord(event.payload);
  const args: Record<string, unknown> = {};
  if (typeof payload.subagentName === "string")
    args.subagentName = payload.subagentName;
  else if (typeof payload.name === "string") args.subagentName = payload.name;
  else if (typeof payload.type === "string") args.subagentName = payload.type;
  if (typeof payload.agentType === "string") args.agentType = payload.agentType;
  if (typeof payload.modelId === "string") args.modelId = payload.modelId;
  if (typeof payload.task === "string") args.task = payload.task;
  const subagentId = subagentIdFromPayload(payload, event);
  const result =
    options.status === "complete"
      ? (payload.result ?? payload.output ?? payload.summary)
      : (payload.status ?? payload.message ?? payload.output);

  return {
    type: "tool-call",
    toolCallId: subagentId,
    toolName: "subagent",
    args,
    argsText: JSON.stringify(args),
    result,
    isError: Boolean(payload.isError),
    status: {
      type:
        options.status === "complete"
          ? payload.isError
            ? "incomplete"
            : "complete"
          : "running",
      reason: payload.isError ? "error" : undefined,
    },
  };
}

export function appendNestedToolToSubagent(
  store: AugmentAssistantStore,
  event: ServerEvent,
  status: "running" | "complete",
): AugmentAssistantStore {
  const payload = asRecord(event.payload);
  const parentId = subagentIdFromPayload(payload, event);
  const subToolName = String(payload.subToolName ?? payload.toolName ?? "tool");
  const subToolArgs = asRecord(payload.subToolArgs ?? payload.args);
  const messageIndex = store.messages.findIndex(
    (message) =>
      message.role === "assistant" &&
      message.content.some(
        (part) => part.type === "tool-call" && part.toolCallId === parentId,
      ),
  );
  if (messageIndex === -1) return store;

  const message = store.messages[messageIndex]!;
  const parentIndex = message.content.findIndex(
    (part) => part.type === "tool-call" && part.toolCallId === parentId,
  );
  if (parentIndex === -1) {
    return store;
  }

  const parentPart = message.content[parentIndex] as AssistantToolPart;
  const existingNestedTools = Array.isArray(parentPart.args.nestedTools)
    ? (parentPart.args.nestedTools as NestedToolInfo[])
    : [];

  const explicitSubId =
    typeof payload.subToolCallId === "string" ? payload.subToolCallId : "";
  const legacySubId =
    typeof payload.toolCallId === "string" && payload.toolCallId !== parentId
      ? payload.toolCallId
      : "";
  const runningMatch =
    status === "complete"
      ? [...existingNestedTools]
          .reverse()
          .find(
            (tool) =>
              tool.toolName === subToolName && tool.status === "running",
          )
      : undefined;
  const subToolCallId =
    explicitSubId ||
    legacySubId ||
    runningMatch?.toolCallId ||
    `${parentId}:${subToolName}:${existingNestedTools.filter((tool) => tool.toolName === subToolName).length + 1}`;

  const nestedTool: NestedToolInfo = {
    toolCallId: subToolCallId,
    toolName: subToolName,
    args: subToolArgs,
    result:
      status === "complete"
        ? (payload.subToolResult ?? payload.result)
        : undefined,
    isError: status === "complete" ? Boolean(payload.isError) : undefined,
    status,
  };

  const existingNestedIndex = existingNestedTools.findIndex(
    (tool) => tool.toolCallId === subToolCallId,
  );
  let updatedNestedTools: NestedToolInfo[];
  if (existingNestedIndex === -1) {
    updatedNestedTools = [...existingNestedTools, nestedTool];
  } else {
    updatedNestedTools = [...existingNestedTools];
    const existingNestedTool = updatedNestedTools[existingNestedIndex]!;
    updatedNestedTools[existingNestedIndex] = {
      ...existingNestedTool,
      ...nestedTool,
      args: mergeToolArgs(existingNestedTool.args, nestedTool.args),
      result:
        nestedTool.result !== undefined
          ? nestedTool.result
          : existingNestedTool.result,
      isError: nestedTool.isError ?? existingNestedTool.isError,
    };
  }

  const updatedParent: AssistantToolPart = {
    ...parentPart,
    args: { ...parentPart.args, nestedTools: updatedNestedTools },
  };

  const updatedContent = [...message.content];
  updatedContent[parentIndex] = updatedParent;

  return replaceMessage(store, { ...message, content: updatedContent });
}
