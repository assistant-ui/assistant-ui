import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessageChunk,
} from "ai";
import { findXuluxSuggestion } from "../landing/xulux-suggestions";

const WORDS_PER_CHUNK = 4;

export type XuluxSuggestionReplayTiming = {
  initialDelayInMs: number | null;
  chunkDelayInMs: number | null;
};

const DEFAULT_TIMING: XuluxSuggestionReplayTiming = {
  initialDelayInMs: 120,
  chunkDelayInMs: 24,
};

export function createXuluxSuggestionReplayResponse(
  suggestionId: string,
  timing: XuluxSuggestionReplayTiming = DEFAULT_TIMING,
): Response | null {
  const suggestion = findXuluxSuggestion(suggestionId);
  if (!suggestion) return null;

  const chunks = createXuluxSuggestionReplayChunks(suggestionId);
  if (!chunks) return null;

  return createUIMessageStreamResponse({
    stream: simulateReadableStream({
      chunks,
      initialDelayInMs: timing.initialDelayInMs,
      chunkDelayInMs: timing.chunkDelayInMs,
    }),
  });
}

export function createXuluxSuggestionReplayChunks(
  suggestionId: string,
): UIMessageChunk[] | null {
  const suggestion = findXuluxSuggestion(suggestionId);
  if (!suggestion) return null;

  const textPartId = `text-${suggestion.id}`;
  const chunks: UIMessageChunk[] = [{ type: "start" }, { type: "start-step" }];

  const preview = suggestion.replay.preview;
  if (preview) {
    const toolCallId = `preview-${suggestion.id}-${crypto.randomUUID()}`;
    chunks.push(
      {
        type: "tool-input-available",
        toolCallId,
        toolName: "openTemplatePreview",
        input: {
          templateId: preview.templateId,
          ...(preview.versionId ? { versionId: preview.versionId } : {}),
        },
      },
      {
        type: "tool-output-available",
        toolCallId,
        output: {
          success: true,
          templateId: preview.templateId,
          ...(preview.versionId ? { versionId: preview.versionId } : {}),
          previewUrl: preview.previewUrl,
          downloadUrl: preview.downloadUrl,
          title: preview.title,
          customized: false,
        },
      },
      { type: "finish-step" },
      { type: "start-step" },
    );
  }

  chunks.push({ type: "text-start", id: textPartId });
  for (const delta of splitReplayText(suggestion.replay.text)) {
    chunks.push({ type: "text-delta", id: textPartId, delta });
  }
  chunks.push(
    { type: "text-end", id: textPartId },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  );

  return chunks;
}

export function splitReplayText(text: string): string[] {
  const words = text.match(/\S+\s*/g) ?? [text];
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += WORDS_PER_CHUNK) {
    chunks.push(words.slice(index, index + WORDS_PER_CHUNK).join(""));
  }

  return chunks;
}
