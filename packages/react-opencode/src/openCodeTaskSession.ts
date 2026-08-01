import type { Part } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getSessionId = (metadata: unknown) => {
  if (!isRecord(metadata)) return undefined;

  const value = metadata.sessionId ?? metadata.sessionID;
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const getOpenCodeTaskSessionId = (part: Part) => {
  if (part.type !== "tool" || part.tool !== "task") return undefined;

  const state: unknown = part.state;
  const stateSessionId = isRecord(state)
    ? getSessionId(state.metadata)
    : undefined;
  return stateSessionId ?? getSessionId(part.metadata);
};
