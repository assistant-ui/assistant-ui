/**
 * Buffer client tool results for a turn and release them only once every
 * pending tool call has one. This lets the LangGraph runtime resume a turn
 * that has parallel tool calls in a single run, instead of resuming once per
 * result (which would resume the graph while sibling tool calls are still
 * executing).
 *
 * Mutates `buffer`. Returns the batch (in pending-tool-call order) when the
 * turn is complete, or `null` while results are still outstanding.
 *
 * A result whose tool call isn't among the turn's pending calls (a late or
 * duplicate result) is released on its own rather than buffered indefinitely.
 */
export const bufferToolResult = <T extends { tool_call_id: string }>(
  buffer: Map<string, T>,
  pendingToolCalls: readonly { id: string }[],
  result: T,
): T[] | null => {
  buffer.set(result.tool_call_id, result);

  const pendingIds = pendingToolCalls.map((toolCall) => toolCall.id);
  const expected = pendingIds.includes(result.tool_call_id)
    ? pendingIds
    : [result.tool_call_id];

  if (!expected.every((id) => buffer.has(id))) return null;

  const batch = expected.map((id) => buffer.get(id)!);
  for (const id of expected) buffer.delete(id);
  return batch;
};
