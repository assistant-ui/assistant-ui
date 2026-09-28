import { useCallback } from "react";
import { getClientId, useAui, useAuiState } from "@assistant-ui/store";

const pendingResumes = new WeakMap<getClientId.ClientId, Promise<void>>();

/** Resumes an adapter-owned checkpoint without resending or regenerating a message. */
export const useComposerResume = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      !s.thread.canResume ||
      s.composer.type !== "thread" ||
      !s.composer.isEmpty,
  );

  const resume = useCallback(async () => {
    const thread = aui.thread();
    // The main thread facade can survive a thread switch. Use its list item
    // when available so a pending request does not lock the next thread.
    const identity = getClientId(
      aui.threadListItem.source !== null ? aui.threadListItem() : thread,
    );
    const pending = pendingResumes.get(identity);
    if (pending) return pending;
    const state = thread.getState();
    const composer = aui.composer.getState();
    if (!state.canResume || composer.type !== "thread" || !composer.isEmpty)
      return;
    // Publish the guard before invoking the adapter, without delaying the
    // call across a possible thread switch or relying on a React rerender.
    let start!: () => void;
    const attempt = new Promise<void>((resolve, reject) => {
      start = () => {
        try {
          resolve(
            thread.resumeRun({ parentId: state.messages.at(-1)?.id ?? null }),
          );
        } catch (error) {
          reject(error);
        }
      };
    }).finally(() => pendingResumes.delete(identity));
    pendingResumes.set(identity, attempt);
    start();
    return attempt;
  }, [aui]);

  return { resume, disabled };
};
