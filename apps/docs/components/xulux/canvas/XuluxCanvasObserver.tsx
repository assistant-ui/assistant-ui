"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuiState, type ToolCallMessagePart } from "@assistant-ui/react";

type RefreshCanvasResult = {
  url?: unknown;
  error?: unknown;
};

function isRefreshCanvasCall(part: unknown): part is ToolCallMessagePart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as ToolCallMessagePart).type === "tool-call" &&
    (part as ToolCallMessagePart).toolName === "refreshCanvas"
  );
}

function getResult(part: ToolCallMessagePart): RefreshCanvasResult | null {
  const result = (part as ToolCallMessagePart & { result?: unknown }).result;
  return result && typeof result === "object"
    ? (result as RefreshCanvasResult)
    : null;
}

export function XuluxCanvasObserver({
  onCanvasReady,
  onCanvasError,
}: {
  onCanvasReady: (url: string) => void;
  onCanvasError: (error: string) => void;
}) {
  const handledKeyRef = useRef<string | null>(null);
  const latestRefresh = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    return messages
      .flatMap((message) => message.content.filter(isRefreshCanvasCall))
      .at(-1);
  });

  const result = useMemo(() => {
    if (!latestRefresh) return null;
    const toolCallId =
      (latestRefresh as ToolCallMessagePart & { toolCallId?: string })
        .toolCallId ?? "";
    const payload = getResult(latestRefresh);
    if (!payload) return null;
    return { toolCallId, payload };
  }, [latestRefresh]);

  useEffect(() => {
    if (!result) return;
    const url = result.payload.url;
    const error = result.payload.error;
    const key = `${result.toolCallId}:${String(url ?? error ?? "")}`;
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    if (typeof url === "string" && url.length > 0) {
      onCanvasReady(url);
      return;
    }

    if (typeof error === "string" && error.length > 0) {
      onCanvasError(error);
    }
  }, [onCanvasError, onCanvasReady, result]);

  return null;
}
