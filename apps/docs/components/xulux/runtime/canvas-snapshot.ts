import type { XuluxPreviewFrame } from "../templates/types";
import type { XuluxCanvasSnapshot } from "./types";

export type XuluxCanvasState = {
  status: "empty" | "loading" | "ready" | "error";
  url: string | null;
  source: "template" | "agent_template" | null;
  error: string | null;
  downloadUrl?: string;
  previewFrame?: XuluxPreviewFrame;
  templateId?: string;
  versionId?: string;
  title?: string;
};

export const EMPTY_CANVAS: XuluxCanvasState = {
  status: "empty",
  url: null,
  source: null,
  error: null,
};

export function toCanvasSnapshot(
  canvas: XuluxCanvasState,
  title: string | undefined,
): XuluxCanvasSnapshot {
  const resolvedTitle = canvas.title ?? title;
  return {
    status: canvas.status === "loading" ? "empty" : canvas.status,
    url: canvas.url,
    source: canvas.source,
    error: canvas.error,
    ...(canvas.downloadUrl ? { downloadUrl: canvas.downloadUrl } : {}),
    ...(canvas.previewFrame ? { previewFrame: canvas.previewFrame } : {}),
    ...(canvas.templateId ? { templateId: canvas.templateId } : {}),
    ...(canvas.versionId ? { versionId: canvas.versionId } : {}),
    ...(resolvedTitle ? { title: resolvedTitle } : {}),
  };
}

export function fromCanvasSnapshot(
  snapshot: XuluxCanvasSnapshot | undefined,
): XuluxCanvasState {
  if (!snapshot || snapshot.source === "refresh") {
    return { ...EMPTY_CANVAS };
  }
  return {
    status: snapshot.status,
    url: snapshot.url,
    source: snapshot.source,
    error: snapshot.error,
    ...(snapshot.downloadUrl ? { downloadUrl: snapshot.downloadUrl } : {}),
    ...(snapshot.previewFrame ? { previewFrame: snapshot.previewFrame } : {}),
    ...(snapshot.templateId ? { templateId: snapshot.templateId } : {}),
    ...(snapshot.versionId ? { versionId: snapshot.versionId } : {}),
    ...(snapshot.title ? { title: snapshot.title } : {}),
  };
}
