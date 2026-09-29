type PendingToolCallMessage<TToolCall> =
  | { toolCalls: readonly TToolCall[] }
  | { toolCallId: string }
  | undefined;

export const scanPendingToolCalls = <TMessage, TToolCall>(
  messages: readonly TMessage[],
  getMessage: (message: TMessage) => PendingToolCallMessage<TToolCall>,
  getToolCallId: (toolCall: TToolCall) => string,
): TToolCall[] => {
  const pending = new Map<string, TToolCall>();
  for (const message of messages) {
    const value = getMessage(message);
    if (!value) continue;
    if ("toolCalls" in value) {
      for (const toolCall of value.toolCalls) {
        pending.set(getToolCallId(toolCall), toolCall);
      }
    } else {
      pending.delete(value.toolCallId);
    }
  }
  return [...pending.values()];
};

export const createToolCallCancellationStub = (toolCall: {
  readonly id: string;
  readonly name: string;
}) => ({
  type: "tool" as const,
  name: toolCall.name,
  tool_call_id: toolCall.id,
  content: JSON.stringify({ cancelled: true }),
  status: "error" as const,
});
