import type {
  MastraMessage,
  MastraContent,
  MastraToolCall,
  MastraToolCallStatus,
  MastraMessageStatus,
} from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

type ToolCallContent = MastraContent & {
  type: "tool_call";
  tool_call: MastraToolCall;
};

// Default append message function for Mastra messages
export const appendMastraChunk = (
  prev: MastraMessage | undefined,
  curr: MastraMessage,
): MastraMessage => {
  if (!prev) {
    return curr;
  }

  // Handle text content accumulation
  const newContent = appendContent(prev.content, curr.content);

  // Merge metadata
  const newMetadata = {
    ...prev.metadata,
    ...curr.metadata,
  };

  // Update status if provided
  const newStatus: MastraMessageStatus | undefined = curr.status ?? prev.status;

  return {
    ...prev,
    ...curr,
    content: newContent,
    metadata: newMetadata,
    ...(newStatus && { status: newStatus }),
    timestamp: curr.timestamp ?? prev.timestamp ?? new Date().toISOString(),
  };
};

// Append content between messages
const appendContent = (
  prevContent: string | MastraContent[],
  currContent: string | MastraContent[],
): string | MastraContent[] => {
  // Handle string content
  if (typeof prevContent === "string" && typeof currContent === "string") {
    return prevContent + currContent;
  }

  // Handle mixed content - convert to array
  const prevArray =
    typeof prevContent === "string"
      ? [{ type: "text" as const, text: prevContent }]
      : prevContent;

  const currArray =
    typeof currContent === "string"
      ? [{ type: "text" as const, text: currContent }]
      : currContent;

  // Merge content arrays
  const mergedContent: MastraContent[] = [...prevArray];

  for (const currPart of currArray) {
    const existingIndex = mergedContent.findIndex(
      (part) =>
        // For tool calls, match by ID
        (currPart.type === "tool_call" &&
          part.type === "tool_call" &&
          (part as ToolCallContent).tool_call?.id ===
            (currPart as ToolCallContent).tool_call?.id) ||
        // For other types, just append
        currPart.type !== "tool_call",
    );

    if (
      existingIndex >= 0 &&
      mergedContent[existingIndex]?.type === "tool_call" &&
      currPart.type === "tool_call"
    ) {
      // Merge tool call
      const existingPart = mergedContent[existingIndex] as ToolCallContent;
      const currToolPart = currPart as ToolCallContent;
      if (existingPart.tool_call && currToolPart.tool_call) {
        mergedContent[existingIndex] = {
          type: "tool_call",
          tool_call: appendToolCall(
            existingPart.tool_call,
            currToolPart.tool_call,
          ),
        };
      }
    } else {
      // Append new content
      mergedContent.push(currPart);
    }
  }

  return mergedContent;
};

// Append tool call information
const appendToolCall = (
  prev: MastraToolCall,
  curr: MastraToolCall,
): MastraToolCall => {
  // Merge arguments
  const newArguments = { ...prev.arguments, ...curr.arguments };

  // Update status
  const newStatus: MastraToolCallStatus | undefined =
    curr.status ?? prev.status;

  // Update result and error
  const newResult = curr.result ?? prev.result;
  const newError = curr.error ?? prev.error;

  return {
    ...prev,
    ...curr,
    arguments: newArguments,
    status: newStatus as MastraToolCallStatus,
    result: newResult,
    ...(newError && { error: newError }),
  };
};

// Parse partial tool call from streaming data
export const parsePartialToolCall = (
  chunk: Partial<MastraToolCall>,
  existing?: MastraToolCall,
): MastraToolCall => {
  const base = existing ?? {
    id: chunk.id ?? crypto.randomUUID(),
    name: chunk.name ?? "",
    arguments: {},
    status: "input-streaming" as MastraToolCallStatus,
  };

  // Merge arguments
  let newArguments = { ...base.arguments };
  if (chunk.arguments) {
    // If we have partial JSON, try to parse it
    if (typeof chunk.arguments === "string") {
      try {
        const parsed = parsePartialJsonObject(chunk.arguments);
        newArguments = { ...newArguments, ...parsed };
      } catch {
        // If parsing fails, keep as string for now
        newArguments = { ...newArguments, _partial: chunk.arguments };
      }
    } else {
      newArguments = { ...newArguments, ...chunk.arguments };
    }
  }

  return {
    ...base,
    ...chunk,
    arguments: newArguments,
    status: (chunk.status ?? base.status) as MastraToolCallStatus,
    result: chunk.result ?? base.result,
    error: chunk.error ?? base.error,
  } as MastraToolCall;
};

// Check if a message is a partial chunk
export const isMastraPartialMessage = (
  message: Partial<MastraMessage>,
): boolean => {
  return (
    !message.id ||
    message.status === "running" ||
    (Array.isArray(message.content) &&
      message.content.some(
        (part) =>
          part.type === "tool_call" &&
          part.tool_call.status === "input-streaming",
      ))
  );
};

// Get the current status of a message
export const getMastraMessageStatus = (
  message: MastraMessage,
): MastraMessageStatus => {
  if (message.status) {
    return message.status;
  }

  // Infer status from content
  if (Array.isArray(message.content)) {
    const hasRunningToolCalls = message.content.some(
      (part) =>
        part.type === "tool_call" &&
        part.tool_call.status === "input-streaming",
    );

    if (hasRunningToolCalls) {
      return "running";
    }

    const hasErrorToolCalls = message.content.some(
      (part) =>
        part.type === "tool_call" && part.tool_call.status === "output-error",
    );

    if (hasErrorToolCalls) {
      return "incomplete";
    }
  }

  return "complete";
};

// Extract tool calls from a message
export const extractMastraToolCalls = (
  message: MastraMessage,
): MastraToolCall[] => {
  if (!Array.isArray(message.content)) {
    return [];
  }

  return message.content
    .filter(
      (part): part is MastraContent & { type: "tool_call" } =>
        part.type === "tool_call",
    )
    .map((part) => part.tool_call);
};

// Extract tool results from a message
export const extractMastraToolResults = (
  message: MastraMessage,
): MastraToolCall[] => {
  if (!Array.isArray(message.content)) {
    return [];
  }

  return message.content
    .filter(
      (part): part is MastraContent & { type: "tool_result" } =>
        part.type === "tool_result",
    )
    .map(
      (part) =>
        ({
          id: part.tool_result.tool_call_id,
          name: "unknown", // We don't have the name in tool results
          arguments: {},
          result: part.tool_result.result,
          error: part.tool_result.error,
          status: part.tool_result.status ?? "complete",
        }) as MastraToolCall,
    );
};
