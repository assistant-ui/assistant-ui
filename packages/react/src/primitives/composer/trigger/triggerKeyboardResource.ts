import {
  resource,
  tapEffect,
  tapEffectEvent,
  tapState,
} from "@assistant-ui/tap";
import type {
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "@assistant-ui/core";

/** Relies on `Unstable_TriggerCategory` never carrying a `type` field. */
function isTriggerItem(
  x: Unstable_TriggerItem | Unstable_TriggerCategory,
): x is Unstable_TriggerItem {
  return "type" in x;
}

/** Key event shape accepted by the keyboard handler. */
export type TriggerPopoverKeyEvent = {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
};

export type TriggerKeyboardResourceOutput = {
  /** Index of the currently highlighted entry within the navigable list. */
  readonly highlightedIndex: number;
  /** ID of the currently highlighted item (for `aria-activedescendant`). */
  readonly highlightedItemId: string | undefined;
  /** Move the highlight to an entry index (e.g. from pointer hover). Out-of-range values are ignored. */
  highlightIndex(index: number): void;
  /** Handle a key event; returns `true` if it was consumed. */
  handleKeyDown(e: TriggerPopoverKeyEvent): boolean;
};

/**
 * Owns keyboard-driven highlight state for the popover. Delegates selection,
 * category drill-in, back, and close to the callbacks supplied by the parent.
 */
export const TriggerKeyboardResource = resource(
  ({
    navigableList,
    isSearchMode,
    activeCategoryId,
    query,
    popoverId,
    open,
    selectItem,
    selectCategory,
    goBack,
    close,
  }: {
    navigableList: readonly (Unstable_TriggerCategory | Unstable_TriggerItem)[];
    isSearchMode: boolean;
    activeCategoryId: string | null;
    query: string;
    popoverId: string;
    open: boolean;
    selectItem: (item: Unstable_TriggerItem) => void;
    selectCategory: (categoryId: string) => void;
    goBack: () => void;
    close: () => void;
  }): TriggerKeyboardResourceOutput => {
    const [highlightedIndex, setHighlightedIndex] = tapState(0);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on list change
    tapEffect(() => {
      setHighlightedIndex(0);
    }, [navigableList]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset
    tapEffect(() => {
      setHighlightedIndex(0);
    }, [isSearchMode, activeCategoryId]);

    const highlightIndex = tapEffectEvent((index: number) => {
      if (index < 0 || index >= navigableList.length) return;
      if (index === highlightedIndex) return;
      setHighlightedIndex(index);
    });

    const handleKeyDown = tapEffectEvent(
      (e: TriggerPopoverKeyEvent): boolean => {
        if (!open) return false;

        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            setHighlightedIndex((prev) => {
              const len = navigableList.length;
              if (len === 0) return 0;
              return prev < len - 1 ? prev + 1 : 0;
            });
            return true;
          }
          case "ArrowUp": {
            e.preventDefault();
            setHighlightedIndex((prev) => {
              const len = navigableList.length;
              if (len === 0) return 0;
              return prev > 0 ? prev - 1 : len - 1;
            });
            return true;
          }
          case "Enter": {
            if (e.shiftKey) return false;
            e.preventDefault();
            const item = navigableList[highlightedIndex];
            if (!item) return true;

            if (isTriggerItem(item)) {
              selectItem(item);
            } else {
              selectCategory(item.id);
            }
            return true;
          }
          case "Escape": {
            e.preventDefault();
            close();
            return true;
          }
          case "Backspace": {
            if (activeCategoryId && query === "") {
              e.preventDefault();
              goBack();
              return true;
            }
            return false;
          }
          default:
            return false;
        }
      },
    );

    const highlightedEntry = navigableList[highlightedIndex];
    const highlightedItemId =
      open && highlightedEntry
        ? `${popoverId}-option-${highlightedEntry.id}`
        : undefined;

    return {
      highlightedIndex,
      highlightedItemId,
      highlightIndex,
      handleKeyDown,
    };
  },
);
