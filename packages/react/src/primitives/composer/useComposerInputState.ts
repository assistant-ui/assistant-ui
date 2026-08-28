"use client";

import { useAuiState } from "@assistant-ui/store";
import { useTriggerPopoverActiveAriaOptional } from "./trigger/TriggerPopoverRootContext";

export type TriggerPopoverAriaProps = {
  "aria-controls"?: string;
  "aria-expanded"?: true;
  "aria-haspopup"?: "listbox";
  "aria-activedescendant"?: string | undefined;
};

export function useComposerInputValue() {
  return useAuiState("composer", (s) => (s.isEditing ? s.text : ""));
}

export function useComposerInputDisabled(disabled?: boolean | undefined) {
  const threadDisabled = useAuiState("thread", (s) => s.isDisabled);
  const dictationInputDisabled = useAuiState(
    "composer",
    (s) => s.dictation?.inputDisabled,
  );
  const composerDisabled = threadDisabled || dictationInputDisabled;
  return Boolean(composerDisabled) || Boolean(disabled);
}

export function useTriggerPopoverAriaProps(): TriggerPopoverAriaProps {
  const activeAria = useTriggerPopoverActiveAriaOptional();
  if (!activeAria) return {};

  return {
    "aria-controls": activeAria.popoverId,
    "aria-expanded": true,
    "aria-haspopup": "listbox",
    "aria-activedescendant": activeAria.highlightedItemId,
  };
}
