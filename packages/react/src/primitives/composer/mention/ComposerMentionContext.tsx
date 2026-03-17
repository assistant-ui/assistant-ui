"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  type FC,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  Unstable_MentionAdapter,
  Unstable_MentionCategory,
  Unstable_MentionItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";

// =============================================================================
// Minimal keyboard event interface — works with both React and DOM events
// =============================================================================

type MentionKeyEvent = {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault(): void;
};

// =============================================================================
// Context Types
// =============================================================================

type MentionPopoverState = {
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_MentionCategory[];
  readonly items: readonly Unstable_MentionItem[];
  readonly highlightedIndex: number;
  readonly isSearchMode: boolean;
};

type MentionPopoverActions = {
  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_MentionItem): void;
  close(): void;
  handleKeyDown(e: MentionKeyEvent): boolean;
};

type MentionContextValue = MentionPopoverState &
  MentionPopoverActions & {
    readonly formatter: Unstable_DirectiveFormatter;
  };

const MentionContext = createContext<MentionContextValue | null>(null);

export const useMentionContext = () => {
  const ctx = useContext(MentionContext);
  if (!ctx)
    throw new Error(
      "useMentionContext must be used within ComposerPrimitive.MentionRoot",
    );
  return ctx;
};

export const useMentionContextOptional = () => {
  return useContext(MentionContext);
};

// =============================================================================
// Internal context — input→provider communication (cursor position + override)
// =============================================================================

type SelectItemOverride = (item: Unstable_MentionItem) => boolean;

type MentionInternalContextValue = {
  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

const MentionInternalContext =
  createContext<MentionInternalContextValue | null>(null);

export const useMentionInternalContext = () => {
  return useContext(MentionInternalContext);
};

// =============================================================================
// Mention trigger detection (cursor-aware)
// =============================================================================

/** @internal Exported for testing only. */
export function detectMentionTrigger(
  text: string,
  triggerChar: string,
  cursorPosition: number,
): {
  query: string;
  offset: number;
} | null {
  // Only consider text up to the cursor
  const textUpToCursor = text.slice(0, cursorPosition);

  // Search backwards from cursor for the trigger character
  // Uses same boundary rules as Lexical's findTriggerMatch:
  // stop at space or newline during scan
  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;

    // Stop at whitespace — trigger must be contiguous with cursor
    if (char === " " || char === "\n") return null;

    if (textUpToCursor.startsWith(triggerChar, i)) {
      // Trigger must be preceded by space, newline, or be at start of text
      if (
        i > 0 &&
        textUpToCursor[i - 1] !== " " &&
        textUpToCursor[i - 1] !== "\n"
      )
        continue;

      const query = textUpToCursor.slice(i + triggerChar.length);

      return { query, offset: i };
    }
  }

  return null;
}

// =============================================================================
// Provider Component
// =============================================================================

export namespace ComposerPrimitiveMentionRoot {
  export type Props = {
    children: ReactNode;
    adapter?: Unstable_MentionAdapter | undefined;
    /** Character(s) that trigger the mention popover. @default "@" */
    trigger?: string | undefined;
    /** Custom formatter for serializing/parsing mention directives. */
    formatter?: Unstable_DirectiveFormatter | undefined;
  };
}

export const ComposerPrimitiveMentionRoot: FC<
  ComposerPrimitiveMentionRoot.Props
> = ({
  children,
  adapter: adapterProp,
  trigger: triggerChar = "@",
  formatter: formatterProp,
}) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const formatter = formatterProp ?? unstable_defaultDirectiveFormatter;

  // Re-read when thread model context changes (tools registered/unregistered)
  const modelContext = useAuiState(() => {
    try {
      return aui.thread().getModelContext();
    } catch {
      return undefined;
    }
  });
  const runtimeAdapter = useMemo(() => {
    // modelContext is included to recompute when tools change
    void modelContext;
    try {
      const runtime = aui.composer().__internal_getRuntime?.();
      return (runtime as any)?._core?.getState()?.getMentionAdapter?.();
    } catch {
      return undefined;
    }
  }, [aui, modelContext]);
  const adapter = adapterProp ?? runtimeAdapter;

  // ---------------------------------------------------------------------------
  // Cursor position — stored in ref, promoted to state only when trigger changes
  // ---------------------------------------------------------------------------

  const cursorRef = useRef(text.length);
  const textRef = useRef(text);
  textRef.current = text;

  const [trigger, setTrigger] = useState<{
    query: string;
    offset: number;
  } | null>(null);

  const recomputeTrigger = useCallback(() => {
    const pos = Math.min(cursorRef.current, textRef.current.length);
    const next = detectMentionTrigger(textRef.current, triggerChar, pos);
    setTrigger((prev) => {
      if (prev?.query === next?.query && prev?.offset === next?.offset)
        return prev;
      return next;
    });
  }, [triggerChar]);

  // Recompute when text changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute on text change
  useEffect(() => {
    recomputeTrigger();
  }, [text, recomputeTrigger]);

  const setCursorPosition = useCallback(
    (pos: number) => {
      cursorRef.current = pos;
      recomputeTrigger();
    },
    [recomputeTrigger],
  );

  // ---------------------------------------------------------------------------
  // Select-item override registration (for Lexical bridge)
  // ---------------------------------------------------------------------------

  const selectItemOverrideRef = useRef<SelectItemOverride | null>(null);

  const registerSelectItemOverride = useCallback((fn: SelectItemOverride) => {
    selectItemOverrideRef.current = fn;
    return () => {
      if (selectItemOverrideRef.current === fn) {
        selectItemOverrideRef.current = null;
      }
    };
  }, []);

  const internalContextValue = useMemo<MentionInternalContextValue>(
    () => ({ setCursorPosition, registerSelectItemOverride }),
    [setCursorPosition, registerSelectItemOverride],
  );

  // ---------------------------------------------------------------------------
  // Popover state
  // ---------------------------------------------------------------------------

  const open = trigger !== null && adapter !== undefined;
  const query = trigger?.query ?? "";

  // Category navigation — reset when popover closes
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveCategoryId(null);
    }
  }, [open]);

  // Derive categories synchronously from adapter
  const categories = useMemo<readonly Unstable_MentionCategory[]>(() => {
    if (!open || !adapter) return [];
    return adapter.categories();
  }, [open, adapter]);

  // Auto-drill into single category on open (avoids extra click for common case).
  // Only applies when query is empty — once the user types, search mode takes over.
  const autoDrilledCategoryId =
    !activeCategoryId && !query && categories.length === 1
      ? categories[0]!.id
      : null;
  const effectiveActiveCategoryId = open
    ? (activeCategoryId ?? autoDrilledCategoryId)
    : null;

  const allItems = useMemo<readonly Unstable_MentionItem[]>(() => {
    if (!effectiveActiveCategoryId || !adapter) return [];
    return adapter.categoryItems(effectiveActiveCategoryId);
  }, [effectiveActiveCategoryId, adapter]);

  // Search mode: when query is non-empty and no category selected,
  // use adapter.search() to show results directly
  const searchResults = useMemo<readonly Unstable_MentionItem[] | null>(() => {
    if (!open || !adapter || !query || effectiveActiveCategoryId) return null;
    if (adapter.search) {
      return adapter.search(query);
    }
    // Fallback: search across all categories' items
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

  // Filter categories by query (only when not in search mode)
  const filteredCategories = useMemo(() => {
    if (isSearchMode) return [];
    if (!query) return categories;
    const lower = query.toLowerCase();
    return categories.filter((cat) => cat.label.toLowerCase().includes(lower));
  }, [categories, query, isSearchMode]);

  // Filter items by query (within selected category)
  const filteredItems = useMemo(() => {
    if (isSearchMode) return searchResults;
    if (!query) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.id.toLowerCase().includes(lower) ||
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower),
    );
  }, [allItems, query, isSearchMode, searchResults]);

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const navigableList = useMemo(() => {
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

  // Reset highlighted index when list changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on list change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [navigableList]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const selectCategory = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
    setHighlightedIndex(0);
  }, []);

  const goBack = useCallback(() => {
    setActiveCategoryId(null);
    setHighlightedIndex(0);
  }, []);

  const selectItem = useCallback(
    (item: Unstable_MentionItem) => {
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
    },
    [aui, trigger, triggerChar, formatter],
  );

  const close = useCallback(() => {
    setActiveCategoryId(null);
    setHighlightedIndex(0);
    // Move cursor before the trigger so trigger detection deactivates
    // without deleting the user's text
    if (trigger) {
      cursorRef.current = trigger.offset;
      recomputeTrigger();
    }
  }, [trigger, recomputeTrigger]);

  const handleKeyDown = useCallback(
    (e: MentionKeyEvent): boolean => {
      if (!open) return false;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const max = navigableList.length - 1;
            return prev < max ? prev + 1 : 0;
          });
          return true;
        }
        case "ArrowUp": {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const max = navigableList.length - 1;
            return prev > 0 ? prev - 1 : max;
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
    },
    [
      open,
      navigableList,
      highlightedIndex,
      isSearchMode,
      effectiveActiveCategoryId,
      query,
      selectItem,
      selectCategory,
      close,
      goBack,
    ],
  );

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = useMemo<MentionContextValue>(
    () => ({
      open,
      query,
      activeCategoryId: effectiveActiveCategoryId,
      categories: filteredCategories,
      items: filteredItems,
      highlightedIndex,
      isSearchMode,
      selectCategory,
      goBack,
      selectItem,
      close,
      handleKeyDown,
      formatter,
    }),
    [
      open,
      query,
      effectiveActiveCategoryId,
      filteredCategories,
      filteredItems,
      highlightedIndex,
      isSearchMode,
      selectCategory,
      goBack,
      selectItem,
      close,
      handleKeyDown,
      formatter,
    ],
  );

  return (
    <MentionContext.Provider value={value}>
      <MentionInternalContext.Provider value={internalContextValue}>
        {children}
      </MentionInternalContext.Provider>
    </MentionContext.Provider>
  );
};

ComposerPrimitiveMentionRoot.displayName = "ComposerPrimitive.MentionRoot";
