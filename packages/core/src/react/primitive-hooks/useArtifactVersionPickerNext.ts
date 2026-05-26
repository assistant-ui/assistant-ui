"use client";

import { useAui, useAuiState } from "@assistant-ui/store";

export const useArtifactVersionPickerNext = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.artifacts.isLast);
  return {
    disabled,
    next: () => aui.artifacts().selectNext(),
  };
};
