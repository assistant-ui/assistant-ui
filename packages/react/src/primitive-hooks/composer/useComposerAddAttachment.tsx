import { useCallback } from "react";
import { useThreadContext } from "../../context";
import { generateId } from "../../internal";

export const useComposerAddAttachment = () => {
  const { useComposer } = useThreadContext();

  const disabled = useComposer((c) => !c.isEditing);

  const callback = useCallback(() => {
    const { addAttachment } = useComposer.getState();

    const input = document.createElement("input");
    input.type = "file";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      addAttachment({
        id: generateId(),
        file,
      });
    };

    input.click();
  }, [useComposer]);

  if (disabled) return null;
  return callback;
};
