import { useCallback } from "react";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import {
  useEditComposerStore,
  useMessageStore,
  useThreadActionsStore,
} from "../../context";

export const useBranchPickerNext = () => {
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const threadActionsStore = useThreadActionsStore();
  const disabled = useCombinedStore(
    [messageStore, editComposerStore],
    (m, c) =>
      c.isEditing || m.branches.indexOf(m.message.id) + 1 >= m.branches.length,
  );

  const callback = useCallback(() => {
    const { message, branches } = messageStore.getState();
    threadActionsStore
      .getState()
      .switchToBranch(branches[branches.indexOf(message.id) + 1]!);
  }, [threadActionsStore, messageStore]);

  if (disabled) return null;
  return callback;
};
