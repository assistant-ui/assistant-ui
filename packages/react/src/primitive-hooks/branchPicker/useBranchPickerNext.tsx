import { useCallback } from "react";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";
import { useEditComposerStore, useMessageStore } from "../../context";
import { useMessageRuntime } from "../../context/react/MessageContext";

export const useBranchPickerNext = () => {
  const messageRuntime = useMessageRuntime();
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const disabled = useCombinedStore(
    [messageStore, editComposerStore],
    (m, c) => c.isEditing || m.branchNumber >= m.branchCount,
  );

  const callback = useCallback(() => {
    messageRuntime.switchToBranch({ position: "next" });
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};
