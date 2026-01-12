import type { UIMessage } from "ai";
import { createResumableStateStorage } from "@assistant-ui/react";

const aiSdkStorage = createResumableStateStorage({
  streamIdKey: "aui-resumable-stream-id",
  messagesKey: "aui-resumable-user-messages",
});

export function unstable_getPendingStreamId(): string | null {
  return aiSdkStorage.getStreamId();
}

export function unstable_setPendingStreamId(streamId: string): void {
  aiSdkStorage.setStreamId(streamId);
}

export function unstable_clearPendingStreamId(): void {
  aiSdkStorage.clearStreamId();
}

export function unstable_storeUserMessages(messages: UIMessage[]): void {
  aiSdkStorage.setMessages(messages);
}

export function unstable_getStoredUserMessages(): UIMessage[] | null {
  return aiSdkStorage.getMessages<UIMessage>();
}

export function unstable_clearStoredUserMessages(): void {
  aiSdkStorage.clearMessages();
}

export function unstable_clearAllResumableState(): void {
  aiSdkStorage.clearAll();
}
