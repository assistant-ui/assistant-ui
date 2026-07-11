"use client";

import { useSyncExternalStore } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useComposerInputPluginRegistryOptional } from "./ComposerInputPluginContext";
import { useTriggerPopoverActiveAriaOptional } from "./trigger/TriggerPopoverRootContext";

export type TriggerPopoverAriaProps = {
  "aria-controls"?: string;
  "aria-expanded"?: true;
  "aria-haspopup"?: "listbox";
  "aria-activedescendant"?: string | undefined;
};

export function useComposerInputValue() {
  return useAuiState((s) => (s.composer.isEditing ? s.composer.text : ""));
}

export function useComposerInputDisabled(disabled?: boolean | undefined) {
  const composerDisabled = useAuiState(
    (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
  );
  return Boolean(composerDisabled) || Boolean(disabled);
}

const noopSubscribe = () => () => {};
const getNullDescendant = () => null;

/**
 * ARIA combobox attributes describing the popup currently coupled to the
 * composer input, read from the composer input plugin registry's active
 * descendant channel. Returns an empty object when no registry is in scope or
 * no popup is open.
 */
export function useComposerAriaProps(): TriggerPopoverAriaProps {
  const registry = useComposerInputPluginRegistryOptional();
  const activeDescendant = useSyncExternalStore(
    registry ? registry.subscribeActiveDescendant : noopSubscribe,
    registry ? registry.getActiveDescendant : getNullDescendant,
    registry ? registry.getActiveDescendant : getNullDescendant,
  );
  if (!activeDescendant) return {};

  return {
    "aria-controls": activeDescendant.popoverId,
    "aria-expanded": true,
    "aria-haspopup": "listbox",
    "aria-activedescendant": activeDescendant.highlightedItemId,
  };
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
