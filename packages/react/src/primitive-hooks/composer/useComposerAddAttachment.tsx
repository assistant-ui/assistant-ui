import { useCallback } from "react";
import { useThreadContext } from "../../context";

export const useComposerAddAttachment = () => {
  const { useComposer, useThreadRuntime } = useThreadContext();

  const disabled = useComposer((c) => !c.isEditing);

  const callback = useCallback(() => {
    const { addAttachment } = useComposer.getState();
    const { attachmentAccept } = useThreadRuntime.getState().composer;

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
  }, [useComposer, useThreadRuntime]);

  if (disabled) return null;
  return callback;
};
