import {
  resource,
  tapState,
  tapMemo,
  tapEffectEvent,
  tapEffect,
  tapRef,
} from "@assistant-ui/tap";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import type { AssistantClient } from "@assistant-ui/store";
import { detectTrigger } from "./detectTrigger";

function isTriggerItem(
  x: Unstable_TriggerItem | Unstable_TriggerCategory,
): x is Unstable_TriggerItem {
  return "type" in x;
}

function matchesQuery(item: Unstable_TriggerItem, lower: string): boolean {
  return (
    item.id.toLowerCase().includes(lower) ||
    item.label.toLowerCase().includes(lower) ||
    (item.description?.toLowerCase().includes(lower) ?? false)
  );
}

export type TriggerPopoverKeyEvent = {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
};

export type SelectItemOverride = (item: Unstable_TriggerItem) => boolean;

export type OnSelectBehavior =
  | {
      type: "insertDirective";
      formatter: Unstable_DirectiveFormatter;
    }
  | {
      type: "action";
      handler: (item: Unstable_TriggerItem) => void;
    };

export type TriggerPopoverResourceOutput = {
  // State
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_TriggerCategory[];
  readonly items: readonly Unstable_TriggerItem[];
  readonly highlightedIndex: number;
  readonly isSearchMode: boolean;
  /** Stable ID prefix for generating accessible element IDs. */
  readonly popoverId: string;
  /** ID of the currently highlighted item (for aria-activedescendant). */
  readonly highlightedItemId: string | undefined;

  // Actions
  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_TriggerItem): void;
  close(): void;
  handleKeyDown(e: TriggerPopoverKeyEvent): boolean;

  // Internal (for ComposerInput integration)
  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

export const TriggerPopoverResource = resource(
  ({
    adapter,
    text,
    triggerChar,
    onSelect,
    aui,
    popoverId,
  }: {
    adapter: Unstable_TriggerAdapter | undefined;
    text: string;
    triggerChar: string;
    onSelect: OnSelectBehavior;
    aui: AssistantClient;
    /** Stable ID for accessible element IDs (pass React's useId() from component layer). */
    popoverId: string;
  }): TriggerPopoverResourceOutput => {
    const [cursorPosition, setCursorPosition] = tapState(text.length);

    const trigger = tapMemo(() => {
      const pos = Math.min(cursorPosition, text.length);
      return detectTrigger(text, triggerChar, pos);
    }, [cursorPosition, text, triggerChar]);

    const open = trigger !== null && adapter !== undefined;
    const query = trigger?.query ?? "";

    const [activeCategoryId, setActiveCategoryId] = tapState<string | null>(
      null,
    );

    // Reset when popover closes
    tapEffect(() => {
      if (!open) setActiveCategoryId(null);
    }, [open]);

    const categories = tapMemo<readonly Unstable_TriggerCategory[]>(() => {
      if (!open || !adapter) return [];
      return adapter.categories();
    }, [open, adapter]);

    const effectiveActiveCategoryId = open ? activeCategoryId : null;

    const allItems = tapMemo<readonly Unstable_TriggerItem[]>(() => {
      if (!effectiveActiveCategoryId || !adapter) return [];
      return adapter.categoryItems(effectiveActiveCategoryId);
    }, [effectiveActiveCategoryId, adapter]);

    const searchResults = tapMemo<
      readonly Unstable_TriggerItem[] | null
    >(() => {
      if (!open || !adapter || effectiveActiveCategoryId) return null;
      // If categories exist and query is empty, show categories first (not search)
      if (!query && categories.length > 0) return null;
      if (adapter.search) return adapter.search(query);

      // Fallback: search all categories manually (reuse already-computed list)
      const all: Unstable_TriggerItem[] = [];
      const lower = query.toLowerCase();
      for (const cat of categories) {
        for (const item of adapter.categoryItems(cat.id)) {
          if (matchesQuery(item, lower)) {
            all.push(item);
          }
        }
      }
      return all;
    }, [open, adapter, query, effectiveActiveCategoryId, categories]);

    const isSearchMode = searchResults !== null;

    const filteredCategories = tapMemo(() => {
      if (isSearchMode) return [];
      if (!query) return categories;
      const lower = query.toLowerCase();
      return categories.filter((cat) =>
        cat.label.toLowerCase().includes(lower),
      );
    }, [categories, query, isSearchMode]);

    const filteredItems = tapMemo(() => {
      if (isSearchMode) return searchResults ?? [];
      if (!query) return allItems;
      const lower = query.toLowerCase();
      return allItems.filter((item) => matchesQuery(item, lower));
    }, [allItems, query, isSearchMode, searchResults]);

    const [highlightedIndex, setHighlightedIndex] = tapState(0);

    const navigableList = tapMemo(() => {
      if (isSearchMode) return searchResults ?? [];
      if (effectiveActiveCategoryId) return filteredItems;
      return filteredCategories;
    }, [
      isSearchMode,
      searchResults,
      effectiveActiveCategoryId,
      filteredItems,
      filteredCategories,
    ]);

    // Reset highlight when list changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on list change
    tapEffect(() => {
      setHighlightedIndex(0);
    }, [navigableList]);

    // Select-item override: lets Lexical's MentionPlugin intercept selection and drive its own node insertion.
    const selectItemOverrideRef = tapRef<SelectItemOverride | null>(null);

    const registerSelectItemOverride = tapEffectEvent(
      (fn: SelectItemOverride) => {
        selectItemOverrideRef.current = fn;
        return () => {
          if (selectItemOverrideRef.current === fn) {
            selectItemOverrideRef.current = null;
          }
        };
      },
    );

    const selectCategory = tapEffectEvent((categoryId: string) => {
      setActiveCategoryId(categoryId);
      setHighlightedIndex(0);
    });

    const goBack = tapEffectEvent(() => {
      setActiveCategoryId(null);
      setHighlightedIndex(0);
    });

    const selectItem = tapEffectEvent((item: Unstable_TriggerItem) => {
      if (!trigger) return;

      // Try the override first (e.g. Lexical MentionPlugin)
      if (selectItemOverrideRef.current?.(item)) {
        setActiveCategoryId(null);
        setHighlightedIndex(0);
        return;
      }

      if (onSelect.type === "insertDirective") {
        // Insert directive text (mention path)
        const currentText = aui.composer().getState().text;
        const before = currentText.slice(0, trigger.offset);
        const after = currentText.slice(
          trigger.offset + triggerChar.length + trigger.query.length,
        );
        const directive = onSelect.formatter.serialize(item);
        const newText =
          before + directive + (after.startsWith(" ") ? after : ` ${after}`);

        aui.composer().setText(newText);
      } else if (onSelect.type === "action") {
        // Execute action + clear trigger text (slash command path)
        const currentText = aui.composer().getState().text;
        const before = currentText.slice(0, trigger.offset);
        const after = currentText.slice(
          trigger.offset + triggerChar.length + trigger.query.length,
        );
        const newText = before + after.trimStart();
        aui.composer().setText(newText);

        onSelect.handler(item);
      }

      setActiveCategoryId(null);
      setHighlightedIndex(0);
    });

    const close = tapEffectEvent(() => {
      setActiveCategoryId(null);
      setHighlightedIndex(0);
      // Move cursor before the trigger so trigger detection deactivates
      if (trigger) {
        setCursorPosition(trigger.offset);
      }
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
            if (effectiveActiveCategoryId && query === "") {
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

    // Compute highlighted item ID for aria-activedescendant
    const highlightedEntry = navigableList[highlightedIndex];
    const highlightedItemId =
      open && highlightedEntry
        ? `${popoverId}-option-${highlightedEntry.id}`
        : undefined;

    return {
      open,
      query,
      activeCategoryId: effectiveActiveCategoryId,
      categories: filteredCategories,
      items: filteredItems,
      highlightedIndex,
      isSearchMode,
      popoverId,
      highlightedItemId,
      selectCategory,
      goBack,
      selectItem,
      close,
      handleKeyDown,
      setCursorPosition,
      registerSelectItemOverride,
    };
  },
);
