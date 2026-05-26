"use client";

import { useAui, useAuiState } from "@assistant-ui/store";

export const useArtifactVersionPickerPrevious = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.artifacts.isFirst);
  return {
    disabled,
    previous: () => aui.artifacts().selectPrevious(),
  };
};
