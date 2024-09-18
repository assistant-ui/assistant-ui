import { useCallback } from "react";
import { useComposer } from "../../context";
import { useThreadComposerStore } from "../../context/react/ThreadContext";

export const useComposerAddAttachment = () => {
  const disabled = useComposer((c) => !c.isEditing);

  const threadComposerStore = useThreadComposerStore();
  const threadRuntimeStore = useThreadComposerStore();
  const callback = useCallback(() => {
    const { addAttachment } = threadComposerStore.getState();
    const { attachmentAccept } = threadRuntimeStore.getState();

    const input = document.createElement("input");
    input.type = "file";
    if (attachmentAccept !== "*") {
      input.accept = attachmentAccept;
    }

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      addAttachment(file);
    };

    input.click();
  }, [threadComposerStore, threadRuntimeStore]);

  if (disabled) return null;
  return callback;
};
