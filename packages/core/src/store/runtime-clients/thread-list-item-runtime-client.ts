import { useEffect, useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { useAssistantEmit } from "@assistant-ui/store/client";
import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import { useSubscribable } from "./useSubscribable";
import { handleThreadListAction } from "./handle-thread-list-action";

const useThreadListItemClient = ({
  runtime,
  mainThreadIsRunning = false,
}: {
  runtime: ThreadListItemRuntime;
  // A thread list that cannot report per-thread run state still leaves the open
  // thread observable, and the thread client tracks that reactively. Omitted
  // where the runtime state is already authoritative for every thread.
  mainThreadIsRunning?: boolean | undefined;
}): ClientOutput<"threadListItem"> => {
  const runtimeState = useSubscribable(runtime);
  const state = useMemo(() => {
    const isRunning =
      runtimeState.isRunning || (runtimeState.isMain && mainThreadIsRunning);
    if (isRunning === runtimeState.isRunning) return runtimeState;
    return { ...runtimeState, isRunning };
  }, [runtimeState, mainThreadIsRunning]);
  const emit = useAssistantEmit();

  // Emitted after the flush that rebinds the derived scopes; the runtime's own
  // synchronous notification would be delivered against the pre-switch binding.
  const { isMain, id: threadId } = runtimeState;
  const selectionRef = useRef({ isMain, threadId });
  useEffect(() => {
    const previous = selectionRef.current;
    if (previous.isMain === isMain && previous.threadId === threadId) return;
    selectionRef.current = { isMain, threadId };
    emit(isMain ? "threadListItem.switchedTo" : "threadListItem.switchedAway", {
      threadId,
    });
  }, [isMain, threadId, emit]);

  return {
    getState: () => state,
    switchTo: (options) =>
      handleThreadListAction("switch", () => runtime.switchTo(options)),
    rename: (newTitle) =>
      handleThreadListAction("rename", () => runtime.rename(newTitle)),
    updateCustom: (custom) =>
      handleThreadListAction("update custom metadata", () =>
        runtime.updateCustom(custom),
      ),
    archive: () => handleThreadListAction("archive", () => runtime.archive()),
    unarchive: () =>
      handleThreadListAction("unarchive", () => runtime.unarchive()),
    delete: () => handleThreadListAction("delete", () => runtime.delete()),
    generateTitle: (options) =>
      handleThreadListAction("generate title", () =>
        runtime.generateTitle(options),
      ),
    initialize: runtime.initialize,
    detach: runtime.detach,
    __internal_getRuntime: () => runtime,
  };
};

export const ThreadListItemClient = resource(useThreadListItemClient);
