"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuiState, type ToolCallMessagePart } from "@assistant-ui/react";
import type { XuluxJsonObject } from "../runtime/types";

type OpenTemplatePreviewResult =
  | {
      success: true;
      templateId: string;
      versionId?: string;
      previewUrl: string;
      downloadUrl: string;
      title: string;
      summary?: string;
      customized?: boolean;
      config?: XuluxJsonObject;
    }
  | {
      success: false;
      error: string;
    };

type TemplatePreviewReady = {
  previewUrl: string;
  downloadUrl: string;
  templateId: string;
  versionId?: string;
  title: string;
  customized: boolean;
  config?: XuluxJsonObject;
};

function isOpenTemplatePreviewCall(part: unknown): part is ToolCallMessagePart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as ToolCallMessagePart).type === "tool-call" &&
    (part as ToolCallMessagePart).toolName === "openTemplatePreview"
  );
}

function getResult(
  part: ToolCallMessagePart,
): OpenTemplatePreviewResult | null {
  const result = (part as ToolCallMessagePart & { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  return result as OpenTemplatePreviewResult;
}

export function XuluxTemplatePreviewObserver({
  onTemplatePreviewReady,
  onCanvasError,
}: {
  onTemplatePreviewReady: (preview: TemplatePreviewReady) => void;
  onCanvasError: (error: string) => void;
}) {
  const handledKeyRef = useRef<string | null>(null);

  const latestCall = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    return messages
      .flatMap((message) => message.content.filter(isOpenTemplatePreviewCall))
      .at(-1);
  });

  const result = useMemo(() => {
    if (!latestCall) return null;
    const toolCallId =
      (latestCall as ToolCallMessagePart & { toolCallId?: string })
        .toolCallId ?? "";
    const payload = getResult(latestCall);
    if (!payload) return null;
    return { toolCallId, payload };
  }, [latestCall]);

  useEffect(() => {
    if (!result) return;
    const { toolCallId, payload } = result;
    const key = `${toolCallId}:${payload.success ? "ok" : "err"}`;
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    if (payload.success) {
      onTemplatePreviewReady({
        previewUrl: payload.previewUrl,
        downloadUrl: payload.downloadUrl,
        templateId: payload.templateId,
        ...(payload.versionId !== undefined
          ? { versionId: payload.versionId }
          : {}),
        title: payload.title,
        customized: payload.customized ?? false,
        ...(payload.config ? { config: payload.config } : {}),
      });
    } else {
      onCanvasError(payload.error);
    }
  }, [onCanvasError, onTemplatePreviewReady, result]);

  return null;
}
