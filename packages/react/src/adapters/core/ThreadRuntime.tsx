"use client";

import type {
  AppendMessage,
  ThreadMessage,
} from "../../utils/context/stores/AssistantTypes";

export type MessageUpdateCallback = (
  parentId: string | null,
  message: ThreadMessage,
) => void;
export type StatusUpdateCallback = (isRunning: boolean) => void;
export type Unsubscribe = () => void;

export type ThreadRuntime = {
  append(message: AppendMessage): Promise<{ parentId: string; id: string }>;
  startRun(parentId: string | null): Promise<{ id: string }>;
  cancelRun(): void;
  subscribeToMessageUpdates(callback: MessageUpdateCallback): Unsubscribe;
  subscribeToStatusUpdates(callback: StatusUpdateCallback): Unsubscribe;
};
