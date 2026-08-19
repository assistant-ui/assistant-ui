"use client";

import { useEffect, useRef } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  updateXuluxPendingUserMessage,
  updateXuluxThreadStatus,
} from "./xulux-local-storage";

export function XuluxThreadStatusObserver({ userId }: { userId: string }) {
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const messages = useAuiState((state) => state.thread.messages);
  const previous = useRef<{
    remoteId: string | undefined;
    isRunning: boolean;
  }>({ remoteId: undefined, isRunning: false });

  useEffect(() => {
    if (!remoteId || !isRunning) return;

    const latestUserText = getLatestUserText(messages);
    if (latestUserText) {
      updateXuluxPendingUserMessage(userId, remoteId, latestUserText);
    }
  }, [isRunning, messages, remoteId, userId]);

  useEffect(() => {
    const prior = previous.current;
    previous.current = { remoteId, isRunning };

    if (!remoteId) return;
    if (prior.remoteId !== remoteId) return;

    if (isRunning && !prior.isRunning) {
      updateXuluxThreadStatus(userId, remoteId, "running");
      return;
    }

    if (!isRunning && prior.isRunning) {
      updateXuluxThreadStatus(userId, remoteId, "idle");
      updateXuluxPendingUserMessage(userId, remoteId, null);
    }
  }, [remoteId, isRunning, userId]);

  return null;
}

function getLatestUserText(
  messages: readonly {
    role: string;
    content: readonly unknown[];
  }[],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;

    const text = message.content
      .flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const typedPart = part as Record<string, unknown>;
        return typedPart.type === "text" && typeof typedPart.text === "string"
          ? [typedPart.text]
          : [];
      })
      .join("\n")
      .trim();

    if (text) return text;
  }

  return null;
}
