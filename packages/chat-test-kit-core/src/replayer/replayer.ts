import type { RuntimeAdapter } from "../adapter/types";
import type {
  AssistantStreamTurn,
  Injection,
  Transcript,
  Turn,
} from "../transcript/types";
import type { VirtualClock } from "./clock";
import { findInjectionAtChunk, findInjectionsAtTurn } from "./injection";
import { type ReplayerState, initialReplayerState } from "./state";

export type ReplayerOptions = {
  transcript: Transcript;
  adapter: RuntimeAdapter;
  clock: VirtualClock;
};

type StreamCursor = {
  turn: AssistantStreamTurn;
  nextChunkIndex: number;
  finishEmitted: boolean;
};

export class Replayer {
  state: ReplayerState = initialReplayerState();
  private readonly transcript: Transcript;
  private readonly adapter: RuntimeAdapter;
  private readonly clock: VirtualClock;
  private streamCursor: StreamCursor | null = null;
  private consumedInjections = new WeakSet<Injection>();
  // why: abortAndRestart restarts the prefix but skips the turn that triggered
  // the abort, so retries do not re-execute the failed turn. Without this set,
  // restart would re-run the aborted stream/tool-call after the injection is
  // consumed, producing an unintended success on the second pass.
  private consumedTurnIndices = new Set<number>();

  constructor(options: ReplayerOptions) {
    this.transcript = options.transcript;
    this.adapter = options.adapter;
    this.clock = options.clock;
  }

  async tick(): Promise<void> {
    if (this.isFinished()) return;
    this.state = { ...this.state, phase: "running" };

    if (this.streamCursor) {
      await this.tickStream();
      return;
    }

    if (this.state.currentTurnIndex >= this.transcript.turns.length) {
      this.finalize();
      return;
    }

    const turn = this.transcript.turns[this.state.currentTurnIndex];
    if (!turn) {
      this.finalize();
      return;
    }

    if (this.consumedTurnIndices.has(this.state.currentTurnIndex)) {
      this.state = {
        ...this.state,
        currentTurnIndex: this.state.currentTurnIndex + 1,
      };
      return;
    }

    const turnIndex = this.state.currentTurnIndex;
    const turnInjections = findInjectionsAtTurn(
      this.transcript,
      turnIndex,
    ).filter((injection) => !this.consumedInjections.has(injection));

    for (const injection of turnInjections) {
      await this.applyInjection(injection);
      if (this.isFinished()) return;
      if (this.state.currentTurnIndex !== turnIndex) return;
    }

    if (turn.kind === "assistantStream") {
      this.streamCursor = {
        turn,
        nextChunkIndex: 0,
        finishEmitted: false,
      };
      await this.tickStream();
      return;
    }

    await this.runTurn(turn);
    if (this.isFinished()) return;
    this.state = {
      ...this.state,
      currentTurnIndex: this.state.currentTurnIndex + 1,
    };
  }

  async advanceToNextTurn(): Promise<void> {
    const start = this.state.currentTurnIndex;
    while (this.state.currentTurnIndex === start) {
      if (this.isFinished()) return;
      await this.tick();
    }
  }

  async advanceToIdle(): Promise<void> {
    while (!this.isFinished()) {
      await this.tick();
    }
    this.finalize();
  }

  async cancel(): Promise<void> {
    if (this.isFinished()) return;
    await this.adapter.abort();
    this.streamCursor = null;
    this.state = {
      ...this.state,
      phase: "cancelled",
      currentChunkIndex: null,
    };
  }

  private async runTurn(turn: Turn): Promise<void> {
    switch (turn.kind) {
      case "user":
        await this.adapter.sendUserMessage(turn.content);
        return;
      case "metadata":
        return;
      case "delay":
        this.clock.advance(turn.ms);
        return;
      case "assistantToolCall":
        await this.adapter.emit({
          type: "tool-call",
          toolCallId: turn.toolCallId,
          toolName: turn.name,
          args: turn.args,
          argsText: turn.argsText,
        });
        this.state = {
          ...this.state,
          pendingToolCalls: [...this.state.pendingToolCalls, turn.toolCallId],
        };
        return;
      case "toolResult":
        await this.adapter.emit({
          type: "tool-result",
          toolCallId: turn.toolCallId,
          value: turn.value,
        });
        this.state = {
          ...this.state,
          pendingToolCalls: this.state.pendingToolCalls.filter(
            (id) => id !== turn.toolCallId,
          ),
        };
        return;
      case "assistantStream":
        return;
    }
  }

  private async tickStream(): Promise<void> {
    const cursor = this.streamCursor;
    if (!cursor) return;

    if (cursor.nextChunkIndex < cursor.turn.chunks.length) {
      if (
        cursor.nextChunkIndex > 0 &&
        cursor.turn.interChunkDelayMs !== undefined
      ) {
        this.clock.advance(cursor.turn.interChunkDelayMs);
      }

      this.state = {
        ...this.state,
        currentChunkIndex: cursor.nextChunkIndex,
      };
      await this.adapter.emit({
        type: "text-delta",
        delta: cursor.turn.chunks[cursor.nextChunkIndex] ?? "",
      });

      const injection = findInjectionAtChunk(
        this.transcript,
        this.state.currentTurnIndex,
        cursor.nextChunkIndex,
      );
      cursor.nextChunkIndex += 1;
      if (injection && !this.consumedInjections.has(injection)) {
        await this.applyInjection(injection);
        return;
      }

      if (
        cursor.nextChunkIndex >= cursor.turn.chunks.length &&
        !cursor.turn.finish
      ) {
        this.completeStream();
      }
      return;
    }

    if (cursor.turn.finish && !cursor.finishEmitted) {
      await this.adapter.emit({
        type: "finish",
        reason: cursor.turn.finish.reason,
      });
      cursor.finishEmitted = true;
      this.completeStream();
      return;
    }

    this.completeStream();
  }

  private completeStream(): void {
    this.streamCursor = null;
    this.state = {
      ...this.state,
      currentChunkIndex: null,
      currentTurnIndex: this.state.currentTurnIndex + 1,
    };
  }

  private async applyInjection(injection: Injection): Promise<void> {
    switch (injection.kind) {
      case "cancel":
        await this.cancel();
        return;
      case "disconnect":
        await this.adapter.emit({ type: "disconnect" });
        this.streamCursor = null;
        this.state = {
          ...this.state,
          phase: "error",
          currentChunkIndex: null,
          lastError: { message: "Replayer: stream disconnected" },
        };
        return;
      case "transportError":
        await this.adapter.emit({
          type: "transport-error",
          ...(injection.code !== undefined ? { code: injection.code } : {}),
          message: injection.message,
        });
        this.state = {
          ...this.state,
          phase: "error",
          lastError: {
            ...(injection.code !== undefined ? { code: injection.code } : {}),
            message: injection.message,
          },
        };
        return;
      case "interrupt":
        await this.adapter.abort();
        this.streamCursor = null;
        this.state = {
          ...this.state,
          phase: "cancelled",
          currentChunkIndex: null,
          lastError: { message: injection.reason ?? "interrupted" },
        };
        return;
      case "abortAndRestart":
        await this.adapter.abort();
        this.streamCursor = null;
        this.consumedInjections.add(injection);
        this.consumedTurnIndices.add(injection.at.turnIndex);
        this.state = {
          ...this.state,
          currentTurnIndex: 0,
          currentChunkIndex: null,
          pendingToolCalls: [],
          phase: "running",
          lastError: null,
        };
        return;
    }
  }

  private isFinished(): boolean {
    return (
      this.state.phase === "complete" ||
      this.state.phase === "error" ||
      this.state.phase === "cancelled"
    );
  }

  private finalize(): void {
    if (this.isFinished()) return;
    if (this.state.pendingToolCalls.length > 0) {
      this.state = {
        ...this.state,
        phase: "error",
        lastError: {
          message: `Replayer: ${this.state.pendingToolCalls.length} unresolved tool call(s) at end of transcript`,
        },
      };
      return;
    }
    this.state = { ...this.state, phase: "complete" };
  }
}
