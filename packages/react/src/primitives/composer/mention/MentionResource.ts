import {
  resource,
  tapState,
  tapMemo,
  tapEffectEvent,
  tapEffect,
  tapRef,
} from "@assistant-ui/tap";
import type {
  Unstable_MentionAdapter,
  Unstable_MentionCategory,
  Unstable_MentionItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import type { AssistantClient } from "@assistant-ui/store";
import { detectMentionTrigger } from "./detectMentionTrigger";

// =============================================================================
// Types
// =============================================================================

export type MentionKeyEvent = {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
};

export type SelectItemOverride = (item: Unstable_MentionItem) => boolean;

export type MentionResourceOutput = {
  // State
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_MentionCategory[];
  readonly items: readonly Unstable_MentionItem[];
  readonly highlightedIndex: number;
  readonly isSearchMode: boolean;
  readonly formatter: Unstable_DirectiveFormatter;

  // Actions
  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_MentionItem): void;
  close(): void;
  handleKeyDown(e: MentionKeyEvent): boolean;

  // Internal (for ComposerInput integration)
  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

// =============================================================================
// Resource
// =============================================================================

export const MentionResource = resource(
  ({
    adapter,
    text,
    triggerChar,
    formatter,
    aui,
  }: {
    adapter: Unstable_MentionAdapter | undefined;
    text: string;
    triggerChar: string;
    formatter: Unstable_DirectiveFormatter;
    aui: AssistantClient;
  }): MentionResourceOutput => {
    // -------------------------------------------------------------------------
    // Cursor tracking + trigger detection
    // -------------------------------------------------------------------------

    const [cursorPosition, setCursorPosition] = tapState(text.length);

    const trigger = tapMemo(() => {
      const pos = Math.min(cursorPosition, text.length);
      return detectMentionTrigger(text, triggerChar, pos);
    }, [cursorPosition, text, triggerChar]);

    const open = trigger !== null && adapter !== undefined;
    const query = trigger?.query ?? "";

    // -------------------------------------------------------------------------
    // Category navigation
    // -------------------------------------------------------------------------

    const [activeCategoryId, setActiveCategoryId] = tapState<string | null>(
      null,
    );

    // Reset when popover closes
    tapEffect(() => {
      if (!open) setActiveCategoryId(null);
    }, [open]);

    const categories = tapMemo<readonly Unstable_MentionCategory[]>(() => {
      if (!open || !adapter) return [];
      return adapter.categories();
    }, [open, adapter]);

    const effectiveActiveCategoryId = open ? activeCategoryId : null;

    // -------------------------------------------------------------------------
    // Items + search
    // -------------------------------------------------------------------------

    const allItems = tapMemo<readonly Unstable_MentionItem[]>(() => {
      if (!effectiveActiveCategoryId || !adapter) return [];
      return adapter.categoryItems(effectiveActiveCategoryId);
    }, [effectiveActiveCategoryId, adapter]);

    const searchResults = tapMemo<
      readonly Unstable_MentionItem[] | null
    >(() => {
      if (!open || !adapter || !query || effectiveActiveCategoryId) return null;
      if (adapter.search) return adapter.search(query);

      const cats = adapter.categories();
      const all: Unstable_MentionItem[] = [];
      const lower = query.toLowerCase();
      for (const cat of cats) {
        for (const item of adapter.categoryItems(cat.id)) {
          if (
            item.id.toLowerCase().includes(lower) ||
            item.label.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower)
          ) {
            all.push(item);
          }
        }
      }
      return all;
    }, [open, adapter, query, effectiveActiveCategoryId]);

    const isSearchMode = searchResults !== null;

    // -------------------------------------------------------------------------
    // Filtering
    // -------------------------------------------------------------------------

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
      return allItems.filter(
        (item) =>
          item.id.toLowerCase().includes(lower) ||
          item.label.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower),
      );
    }, [allItems, query, isSearchMode, searchResults]);

    // -------------------------------------------------------------------------
    // Keyboard navigation
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Lexical select-item override
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // Actions (stable via tapEffectEvent)
    // -------------------------------------------------------------------------

    const selectCategory = tapEffectEvent((categoryId: string) => {
      setActiveCategoryId(categoryId);
      setHighlightedIndex(0);
    });

    const goBack = tapEffectEvent(() => {
      setActiveCategoryId(null);
      setHighlightedIndex(0);
    });

    const selectItem = tapEffectEvent((item: Unstable_MentionItem) => {
      if (!trigger) return;

      // Try the Lexical override first
      if (selectItemOverrideRef.current?.(item)) {
        setActiveCategoryId(null);
        setHighlightedIndex(0);
        return;
      }

      // Default: text-based replacement (textarea path)
      const currentText = aui.composer().getState().text;
      const before = currentText.slice(0, trigger.offset);
      const after = currentText.slice(
        trigger.offset + triggerChar.length + trigger.query.length,
      );
      const directive = formatter.serialize(item);
      const newText =
        before + directive + (after.startsWith(" ") ? after : ` ${after}`);

      aui.composer().setText(newText);
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

    const handleKeyDown = tapEffectEvent((e: MentionKeyEvent): boolean => {
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

          if (isSearchMode || effectiveActiveCategoryId) {
            selectItem(item as Unstable_MentionItem);
          } else {
            selectCategory((item as Unstable_MentionCategory).id);
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
    });

    // -------------------------------------------------------------------------
    // Output
    // -------------------------------------------------------------------------

    return {
      open,
      query,
      activeCategoryId: effectiveActiveCategoryId,
      categories: filteredCategories,
      items: filteredItems,
      highlightedIndex,
      isSearchMode,
      formatter,
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
