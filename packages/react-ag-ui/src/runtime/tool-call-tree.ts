import type {
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/core";

type AssistantContent = readonly ThreadAssistantMessagePart[];

/**
 * A subagent run renders as a nested assistant message on its spawning call's
 * ToolCallMessagePart.messages, so the subagent's own tool calls live below
 * the top-level content. Every seam that resolves, inspects, gates, or
 * exports tool calls has to walk that tree, or a subagent's call is
 * unreachable.
 */
export function* iterateToolCallParts(
  content: AssistantContent,
): Generator<ToolCallMessagePart> {
  for (const part of content) {
    if (part.type !== "tool-call") continue;
    yield part;
    for (const nested of part.messages ?? []) {
      if (nested.role !== "assistant") continue;
      yield* iterateToolCallParts((nested as ThreadAssistantMessage).content);
    }
  }
}

export function mapToolCallPartsDeep(
  content: AssistantContent,
  fn: (part: ToolCallMessagePart) => ToolCallMessagePart,
): { content: AssistantContent; changed: boolean } {
  let changed = false;
  const next = content.map((part): ThreadAssistantMessagePart => {
    if (part.type !== "tool-call") return part;
    let mapped = fn(part);
    if (mapped.messages !== undefined) {
      let nestedChanged = false;
      const nestedMessages = mapped.messages.map((nested) => {
        if (nested.role !== "assistant") return nested;
        const assistant = nested as ThreadAssistantMessage;
        const result = mapToolCallPartsDeep(assistant.content, fn);
        if (!result.changed) return nested;
        nestedChanged = true;
        return { ...assistant, content: result.content };
      });
      if (nestedChanged) {
        mapped =
          mapped === part
            ? { ...part, messages: nestedMessages }
            : { ...mapped, messages: nestedMessages };
      }
    }
    if (mapped !== part) changed = true;
    return mapped;
  });
  return changed ? { content: next, changed } : { content, changed };
}
