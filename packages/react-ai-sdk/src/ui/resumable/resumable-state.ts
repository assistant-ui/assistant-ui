import type { UIMessage } from "ai";

const STREAM_ID_KEY = "aui-resumable-stream-id";
const USER_MESSAGES_KEY = "aui-resumable-user-messages";

export function unstable_getPendingStreamId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STREAM_ID_KEY);
}

export function unstable_setPendingStreamId(streamId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAM_ID_KEY, streamId);
}

export function unstable_clearPendingStreamId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STREAM_ID_KEY);
}

export function unstable_storeUserMessages(messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_MESSAGES_KEY, JSON.stringify(messages));
}

export function unstable_getStoredUserMessages(): UIMessage[] | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_MESSAGES_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function unstable_clearStoredUserMessages(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_MESSAGES_KEY);
}

export function unstable_clearAllResumableState(): void {
  unstable_clearPendingStreamId();
  unstable_clearStoredUserMessages();
}
