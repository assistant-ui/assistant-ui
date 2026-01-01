import type { UIMessage } from "ai";

const STREAM_ID_KEY = "resumable-stream-id";
const USER_MESSAGES_KEY = "resumable-user-messages";

export function getPendingStreamId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STREAM_ID_KEY);
}

export function setPendingStreamId(streamId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAM_ID_KEY, streamId);
}

export function clearPendingStreamId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STREAM_ID_KEY);
}

export function storeUserMessages(messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_MESSAGES_KEY, JSON.stringify(messages));
}

export function getStoredUserMessages(): UIMessage[] | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_MESSAGES_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearStoredUserMessages(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_MESSAGES_KEY);
}

export function clearAllResumableState(): void {
  clearPendingStreamId();
  clearStoredUserMessages();
}

type UIMessageChunk =
  | { type: "text-delta"; id: string; delta: string }
  | { type: "start" }
  | { type: "start-step" }
  | { type: "finish"; finishReason: string }
  | { type: "finish-step" }
  | { type: "text-start"; id: string }
  | { type: string };

export async function parseStreamToText(response: Response): Promise<string> {
  const text = await response.text();
  const lines = text.split("\n");
  let result = "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;

    try {
      const chunk = JSON.parse(jsonStr) as UIMessageChunk;
      if (chunk.type === "text-delta" && "delta" in chunk) {
        result += chunk.delta;
      }
    } catch {}
  }

  return result;
}
