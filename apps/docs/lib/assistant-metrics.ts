type TextPartLike = { type: string; text?: string };
type ToolCallPartLike = { type: string; toolName?: string };

export function getTextLength(parts: readonly TextPartLike[]): number {
  let length = 0;
  for (const part of parts) {
    if (part.type !== "text" || !part.text) continue;
    length += part.text.length;
  }
  return length;
}

export function countToolCalls(parts: readonly { type: string }[]): number {
  let count = 0;
  for (const part of parts) {
    if (part.type === "tool-call") count += 1;
  }
  return count;
}

export function getToolCallToolNames(
  parts: readonly ToolCallPartLike[],
): string[] {
  const toolNames: string[] = [];
  for (const part of parts) {
    if (part.type !== "tool-call") continue;
    if (typeof part.toolName !== "string") continue;
    toolNames.push(part.toolName);
  }
  return toolNames;
}

const TRACE_ID_RE = /^[0-9a-f]{32}$/;

export function getMessageTraceId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const custom = (metadata as { custom?: unknown }).custom;
  if (!custom || typeof custom !== "object") return undefined;
  const traceId = (custom as { traceId?: unknown }).traceId;
  return typeof traceId === "string" && TRACE_ID_RE.test(traceId)
    ? traceId
    : undefined;
}
