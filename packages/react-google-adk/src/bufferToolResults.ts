export const takeBufferedToolResults = <T extends { tool_call_id: string }>(
  buffer: Map<string, T>,
  pendingToolCallIds: readonly string[],
  includePartial = false,
): T[] | null => {
  if (!includePartial && !pendingToolCallIds.every((id) => buffer.has(id)))
    return null;

  const batch = pendingToolCallIds.flatMap((id) => {
    const result = buffer.get(id);
    return result ? [result] : [];
  });
  for (const result of batch) buffer.delete(result.tool_call_id);
  return batch.length > 0 ? batch : null;
};
