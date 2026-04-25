import type {
  AssistantEvent,
  ReplayerState,
  RuntimeSnapshot,
  TranscriptType,
} from "@assistant-ui/chat-test-kit-core";
import type { AssistantRuntime } from "@assistant-ui/react";
import type { FC, ReactNode } from "react";

export type HarnessOptions = {
  transcript: TranscriptType;
  autoAdvance?: boolean;
};

export type TimelineEntry =
  | { kind: "user-submit"; at: number; content: string }
  | { kind: "event"; at: number; event: AssistantEvent };

export type ChatTestHarness = {
  wrapper: FC<{ children: ReactNode }>;

  waitForIdle(): Promise<void>;
  cancel(): Promise<void>;

  advanceChunk(): Promise<void>;
  advanceToolCall(): Promise<void>;
  inject: {
    disconnect(opts?: { afterChunk?: number }): Promise<void>;
    transportError(opts: { code?: number; message: string }): Promise<void>;
  };

  getReplayState(): ReplayerState;
  timeline(): TimelineEntry[];
  getRuntimeSnapshot(): RuntimeSnapshot;
  getRuntime(): AssistantRuntime | null;
};
