"use client";

import { useEffect, useRef } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  getXuluxTextFromParts,
  updateXuluxPendingUserMessage,
  updateXuluxThreadStatus,
} from "./xulux-local-storage";

export function XuluxThreadStatusObserver() {
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
      updateXuluxPendingUserMessage(remoteId, latestUserText);
    }
  }, [isRunning, messages, remoteId]);

  useEffect(() => {
    const prior = previous.current;
    previous.current = { remoteId, isRunning };

    if (!remoteId) return;
    if (prior.remoteId !== remoteId) return;

    if (isRunning && !prior.isRunning) {
      updateXuluxThreadStatus(remoteId, "running");
      return;
    }

    if (!isRunning && prior.isRunning) {
      updateXuluxThreadStatus(remoteId, "idle");
      updateXuluxPendingUserMessage(remoteId, null);
    }
  }, [remoteId, isRunning]);

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

    const text = getXuluxTextFromParts(message.content);
    if (text) return text;
  }

  return null;
}
