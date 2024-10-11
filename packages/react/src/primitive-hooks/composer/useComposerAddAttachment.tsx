import { useCallback } from "react";
import { useComposer, useComposerRuntime } from "../../context";

export const useComposerAddAttachment = () => {
  const disabled = useComposer((c) => !c.isEditing);

  const composerRuntime = useComposerRuntime();
  const callback = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";

    const attachmentAccept = composerRuntime.getAttachmentAccept();
    if (attachmentAccept !== "*") {
      input.accept = attachmentAccept;
    }

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      composerRuntime.addAttachment(file);
    };

    input.click();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};
