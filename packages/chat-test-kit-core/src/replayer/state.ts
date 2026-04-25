export type ReplayerPhase =
  | "idle"
  | "running"
  | "complete"
  | "error"
  | "cancelled";

export type ReplayerState = {
  phase: ReplayerPhase;
  currentTurnIndex: number;
  currentChunkIndex: number | null;
  pendingToolCalls: string[];
  lastError: { code?: number; message: string } | null;
};

export function initialReplayerState(): ReplayerState {
  return {
    phase: "idle",
    currentTurnIndex: 0,
    currentChunkIndex: null,
    pendingToolCalls: [],
    lastError: null,
  };
}
