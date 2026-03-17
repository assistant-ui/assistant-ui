type ComposerStateLike = {
  isEmpty: boolean;
  text: string;
  attachments: readonly unknown[];
};

type RunStartsByThread = Map<string, number[]>;

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

export function recordRunStartedAt(
  runStartsByThread: RunStartsByThread,
  threadId: string,
  startedAt: number,
): void {
  const existing = runStartsByThread.get(threadId);
  if (existing) {
    existing.push(startedAt);
    return;
  }

  runStartsByThread.set(threadId, [startedAt]);
}

export function consumeRunStartedAt(
  runStartsByThread: RunStartsByThread,
  threadId: string,
): number | undefined {
  const existing = runStartsByThread.get(threadId);
  if (existing === undefined || existing.length === 0) return undefined;

  const startedAt = existing.shift();
  if (existing.length === 0) {
    runStartsByThread.delete(threadId);
  }

  return startedAt;
}

export function pruneStaleRunStarts(
  runStartsByThread: RunStartsByThread,
  now: number,
  staleThresholdMs: number,
): void {
  for (const [threadId, startedAtQueue] of runStartsByThread.entries()) {
    const freshStarts = startedAtQueue.filter(
      (startedAt) => now - startedAt <= staleThresholdMs,
    );

    if (freshStarts.length === 0) {
      runStartsByThread.delete(threadId);
      continue;
    }

    if (freshStarts.length !== startedAtQueue.length) {
      runStartsByThread.set(threadId, freshStarts);
    }
  }
}
