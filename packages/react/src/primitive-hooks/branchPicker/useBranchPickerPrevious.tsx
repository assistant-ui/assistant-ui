import { useCallback } from "react";
import {
  useEditComposerStore,
  useMessageStore,
} from "../../context/react/MessageContext";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useBranchPickerPrevious = () => {
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const threadRuntime = useThreadRuntime();

  const disabled = useCombinedStore(
    [messageStore, editComposerStore],
    (m, c) => c.isEditing || m.branches.indexOf(m.message.id) <= 0,
  );

  const callback = useCallback(() => {
    const { message, branches } = messageStore.getState();
    threadRuntime.switchToBranch(branches[branches.indexOf(message.id) - 1]!);
  }, [threadRuntime, messageStore]);

  if (disabled) return null;
  return callback;
};
