type ComposerStateLike = {
  isEmpty: boolean;
  text: string;
  attachments: readonly unknown[];
};

export function getComposerMessageMetrics(
  composerState: ComposerStateLike,
): { messageLength: number; attachmentsCount: number } | undefined {
  if (composerState.isEmpty) return undefined;

  return {
    messageLength: composerState.text.length,
    attachmentsCount: composerState.attachments.length,
  };
}

export const queueMicrotaskSafe =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (callback: () => void) => Promise.resolve().then(callback);
