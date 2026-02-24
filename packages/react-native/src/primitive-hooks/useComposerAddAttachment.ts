import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import type { CreateAttachment } from "@assistant-ui/core";

export const useComposerAddAttachment = () => {
  const aui = useAui();

  const addAttachment = useCallback(
    (file: File | CreateAttachment) => {
      return aui.composer().addAttachment(file);
    },
    [aui],
  );

  return { addAttachment };
};
