import { A2AMessage } from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

export const appendA2AChunk = (
  prev: A2AMessage | undefined,
  curr: A2AMessage,
): A2AMessage => {
  // If no previous message or different message type, return current as-is
  if (!prev || prev.role !== curr.role || prev.id !== curr.id) {
    return curr;
  }

  // For assistant messages, we need to handle streaming content and tool calls
  if (curr.role === "assistant") {
    const newContent = Array.isArray(prev.content)
      ? [...prev.content]
      : typeof prev.content === "string"
        ? [{ type: "text" as const, text: prev.content }]
        : [];

    // Append new content chunks
    if (typeof curr.content === "string") {
      const lastIndex = newContent.length - 1;
      const lastPart = newContent[lastIndex];

      if (lastPart?.type === "text") {
        // Append to existing text part
        (lastPart as { type: "text"; text: string }).text += curr.content;
      } else {
        // Create new text part
        newContent.push({ type: "text", text: curr.content });
      }
    } else if (Array.isArray(curr.content)) {
      for (const contentPart of curr.content) {
        const lastIndex = newContent.length - 1;
        const lastPart = newContent[lastIndex];

        if (contentPart.type === "text" && lastPart?.type === "text") {
          // Append to existing text part
          (lastPart as { type: "text"; text: string }).text += contentPart.text;
        } else {
          // Add new content part
          newContent.push(contentPart);
        }
      }
    }

    // Merge tool calls - A2A typically sends complete tool calls rather than chunks
    const newToolCalls = [...(prev.tool_calls ?? [])];
    if (curr.tool_calls) {
      for (const toolCall of curr.tool_calls) {
        const existingIndex = newToolCalls.findIndex(
          (tc) => tc.id === toolCall.id,
        );
        if (existingIndex >= 0) {
          // Update existing tool call (merge args if needed)
          const existing = newToolCalls[existingIndex]!;
          newToolCalls[existingIndex] = {
            ...existing,
            ...toolCall,
            // If argsText is provided in chunks, concatenate it
            argsText: (existing.argsText || "") + (toolCall.argsText || ""),
            // Try to parse merged args, fallback to existing or new args
            args:
              parsePartialJsonObject(
                (existing.argsText || "") + (toolCall.argsText || ""),
              ) ||
              toolCall.args ||
              existing.args,
          };
        } else {
          // Add new tool call
          newToolCalls.push(toolCall);
        }
      }
    }

    // Merge artifacts
    const newArtifacts = [...(prev.artifacts ?? [])];
    if (curr.artifacts) {
      for (const artifact of curr.artifacts) {
        const existingIndex = newArtifacts.findIndex(
          (a) => a.name === artifact.name,
        );
        if (existingIndex >= 0) {
          // Merge artifact parts
          const existingArtifact = newArtifacts[existingIndex]!;
          newArtifacts[existingIndex] = {
            name: existingArtifact.name,
            parts: [...existingArtifact.parts, ...artifact.parts],
          };
        } else {
          // Add new artifact
          newArtifacts.push(artifact);
        }
      }
    }

    const result: A2AMessage = {
      ...prev,
      content: newContent,
    };
    const newStatus = curr.status || prev.status;
    if (newStatus) result.status = newStatus;
    if (newToolCalls.length > 0) result.tool_calls = newToolCalls;
    if (newArtifacts.length > 0) result.artifacts = newArtifacts;
    return result;
  }

  // For other message types (user, system, tool), just return the current message
  // as they typically don't stream in chunks
  const result: A2AMessage = {
    ...prev,
    ...curr,
  };
  // Preserve any existing artifacts and merge with new ones
  if (curr.artifacts || prev.artifacts) {
    result.artifacts = [...(prev.artifacts ?? []), ...(curr.artifacts ?? [])];
  }
  return result;
};
