type ToolCallLike = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
};

/** The part of a thread message the history readers need. */
export type MessageLike = { readonly content: string | readonly unknown[] };

export function* toolCalls(messages: readonly MessageLike[]) {
  for (const message of messages) {
    if (typeof message.content === "string") continue;
    for (const part of message.content) {
      const call = part as ToolCallLike;
      if (call?.type === "tool-call" && call.toolCallId && call.toolName) {
        yield {
          id: call.toolCallId,
          name: call.toolName,
          args: (call.args ?? {}) as Record<string, unknown>,
        };
      }
    }
  }
}
