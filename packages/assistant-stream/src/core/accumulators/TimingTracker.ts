import type { AssistantMessageTiming } from "../utils/types";

export class TimingTracker {
  private _streamStartTime: number;
  private _firstTokenTime: number | undefined;
  private _totalChunks = 0;
  private _toolCallIds = new Set<string>();

  constructor() {
    this._streamStartTime = Date.now();
  }

  recordChunk(): void {
    this._totalChunks++;
  }

  recordFirstToken(): void {
    if (this._firstTokenTime === undefined) {
      this._firstTokenTime = Date.now();
    }
  }

  recordToolCallStart(toolCallId: string): void {
    this._toolCallIds.add(toolCallId);
  }

  getTiming(outputTokens?: number, totalText?: string): AssistantMessageTiming {
    const now = Date.now();
    const totalStreamTime = now - this._streamStartTime;

    const tokenCount =
      outputTokens && outputTokens > 0
        ? outputTokens
        : totalText
          ? Math.ceil(totalText.length / 4)
          : undefined;

    const tokensPerSecond =
      tokenCount && totalStreamTime > 0
        ? (tokenCount / totalStreamTime) * 1000
        : undefined;

    return {
      streamStartTime: this._streamStartTime,
      ...(this._firstTokenTime !== undefined
        ? { firstTokenTime: this._firstTokenTime - this._streamStartTime }
        : undefined),
      totalStreamTime,
      ...(tokenCount !== undefined ? { tokenCount } : undefined),
      ...(tokensPerSecond !== undefined ? { tokensPerSecond } : undefined),
      totalChunks: this._totalChunks,
      toolCallCount: this._toolCallIds.size,
    };
  }
}
