import { AssistantMessageTiming } from "../utils/types";

export class TimingTracker {
  readonly streamStartTime: number;
  private firstChunkTime: number | undefined;
  private firstTokenTime: number | undefined;
  private lastChunkTime: number;
  private largestChunkGap = 0;
  private chunkCount = 0;
  private toolCallStartTimes = new Map<string, number>();
  private toolCallTotalTime = 0;
  private toolCallCount = 0;
  private serverTiming:
    | {
        processingTime?: number;
        queueTime?: number;
        custom?: Record<string, unknown>;
      }
    | undefined;

  constructor() {
    this.streamStartTime = Date.now();
    this.lastChunkTime = this.streamStartTime;
  }

  recordChunk(): void {
    const now = Date.now();
    this.chunkCount++;

    const gap = now - this.lastChunkTime;
    if (gap > this.largestChunkGap) {
      this.largestChunkGap = gap;
    }
    this.lastChunkTime = now;

    if (this.firstChunkTime === undefined) {
      this.firstChunkTime = now - this.streamStartTime;
    }
  }

  recordFirstToken(): void {
    if (this.firstTokenTime === undefined) {
      this.firstTokenTime = Date.now() - this.streamStartTime;
    }
  }

  recordToolCallStart(toolCallId: string): void {
    this.toolCallStartTimes.set(toolCallId, Date.now());
    this.toolCallCount++;
  }

  recordToolCallEnd(toolCallId: string): void {
    const startTime = this.toolCallStartTimes.get(toolCallId);
    if (startTime !== undefined) {
      this.toolCallTotalTime += Date.now() - startTime;
      this.toolCallStartTimes.delete(toolCallId);
    }
  }

  setServerTiming(timing: {
    processingTime?: number;
    queueTime?: number;
    custom?: Record<string, unknown>;
  }): void {
    this.serverTiming = timing;
  }

  getTiming(completionTokens?: number): AssistantMessageTiming {
    const totalStreamTime = Date.now() - this.streamStartTime;
    const tokensPerSecond =
      totalStreamTime > 0 && completionTokens !== undefined
        ? Math.round((completionTokens / totalStreamTime) * 1000 * 100) / 100
        : null;

    const timing: AssistantMessageTiming = {
      streamStartTime: this.streamStartTime,
      totalStreamTime,
      totalChunks: this.chunkCount,
    };

    if (this.firstChunkTime !== undefined) {
      timing.timeToFirstChunk = this.firstChunkTime;
    }
    if (this.firstTokenTime !== undefined) {
      timing.timeToFirstToken = this.firstTokenTime;
    }
    if (tokensPerSecond !== null) {
      timing.tokensPerSecond = tokensPerSecond;
    }
    if (this.largestChunkGap > 0) {
      timing.largestChunkGap = this.largestChunkGap;
    }
    if (this.toolCallCount > 0) {
      timing.toolCallCount = this.toolCallCount;
    }
    if (this.toolCallTotalTime > 0) {
      timing.toolCallTotalTime = this.toolCallTotalTime;
    }
    if (this.serverTiming !== undefined) {
      timing.server = this.serverTiming;
    }

    return timing;
  }
}
