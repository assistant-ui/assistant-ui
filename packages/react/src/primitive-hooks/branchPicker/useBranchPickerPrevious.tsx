import { useCallback } from "react";
import {
  useEditComposerStore,
  useMessageRuntime,
  useMessageStore,
} from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useBranchPickerPrevious = () => {
  const messageRuntime = useMessageRuntime();
  const messageStore = useMessageStore();
  const editComposerStore = useEditComposerStore();
  const disabled = useCombinedStore(
    [messageStore, editComposerStore],
    (m, c) => c.isEditing || m.branchNumber >= m.branchCount,
  );

  const callback = useCallback(() => {
    messageRuntime.switchToBranch({ position: "previous" });
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};
