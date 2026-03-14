"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
  type FC,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  Unstable_MentionCategory,
  Unstable_MentionItem,
} from "@assistant-ui/core";
import type { Unstable_MentionAdapter } from "@assistant-ui/core";

// =============================================================================
// Context Types
// =============================================================================

type MentionPopoverState = {
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_MentionCategory[];
  readonly items: readonly Unstable_MentionItem[];
  readonly isLoading: boolean;
};

type MentionPopoverActions = {
  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_MentionItem): void;
  close(): void;
};

type MentionContextValue = MentionPopoverState & MentionPopoverActions;

const MentionContext = createContext<MentionContextValue | null>(null);

export const useMentionContext = () => {
  const ctx = useContext(MentionContext);
  if (!ctx)
    throw new Error(
      "useMentionContext must be used within ComposerPrimitive.MentionRoot",
    );
  return ctx;
};

// =============================================================================
// Mention trigger detection
// =============================================================================

/**
 * Detects `@query` pattern at the end of text (or before cursor).
 * Returns the query string after `@`, or null if no active trigger.
 */
function detectMentionTrigger(text: string): {
  query: string;
  offset: number;
} | null {
  // Find the last `@` that starts a mention
  const lastAtIndex = text.lastIndexOf("@");
  if (lastAtIndex === -1) return null;

  // The `@` must be at start or preceded by whitespace
  if (lastAtIndex > 0 && !/\s/.test(text[lastAtIndex - 1]!)) return null;

  const query = text.slice(lastAtIndex + 1);

  // If query contains whitespace followed by more text, it's not a mention trigger
  // Allow spaces in query for multi-word searches, but not newlines
  if (query.includes("\n")) return null;

  return { query, offset: lastAtIndex };
}

// =============================================================================
// Provider Component
// =============================================================================

export namespace ComposerPrimitiveMentionRoot {
  export type Props = {
    children: ReactNode;
    adapter?: Unstable_MentionAdapter | undefined;
  };
}

export const ComposerPrimitiveMentionRoot: FC<
  ComposerPrimitiveMentionRoot.Props
> = ({ children, adapter: adapterProp }) => {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);

  // Adapter can be passed as prop or retrieved from runtime
  const runtimeAdapter = useMemo(() => {
    try {
      const runtime = aui.composer().__internal_getRuntime?.();
      return (runtime as any)?._core?.getState()?.getMentionAdapter?.();
    } catch {
      return undefined;
    }
  }, [aui]);
  const adapter = adapterProp ?? runtimeAdapter;

  const [categories, setCategories] = useState<
    readonly Unstable_MentionCategory[]
  >([]);
  const [items, setItems] = useState<readonly Unstable_MentionItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detect trigger
  const trigger = useMemo(() => detectMentionTrigger(text), [text]);
  const open = trigger !== null && adapter !== undefined;

  // Load categories when popover opens
  useEffect(() => {
    if (!open || !adapter) {
      setCategories([]);
      setItems([]);
      setActiveCategoryId(null);
      return;
    }

    let cancelled = false;
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const result = await adapter.categories();
        if (!cancelled) setCategories(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [open, adapter]);

  // Load items when category is selected
  useEffect(() => {
    if (!activeCategoryId || !adapter) {
      setItems([]);
      return;
    }

    let cancelled = false;
    const loadItems = async () => {
      setIsLoading(true);
      try {
        const result = await adapter.categoryItems(activeCategoryId);
        if (!cancelled) setItems(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadItems();

    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, adapter]);

  // Search filtering
  const query = trigger?.query ?? "";
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower),
    );
  }, [items, query]);

  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    const lower = query.toLowerCase();
    return categories.filter((cat) => cat.label.toLowerCase().includes(lower));
  }, [categories, query]);

  const selectCategory = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
  }, []);

  const goBack = useCallback(() => {
    setActiveCategoryId(null);
    setItems([]);
  }, []);

  const selectItem = useCallback(
    (item: Unstable_MentionItem) => {
      if (!trigger) return;

      const currentText = aui.composer().getState().text;
      // Replace `@query` with a directive `:type[label]`
      const before = currentText.slice(0, trigger.offset);
      const after = currentText.slice(
        trigger.offset + 1 + trigger.query.length,
      );
      const directive = `:${item.type}[${item.label}]`;
      const newText =
        before + directive + (after.startsWith(" ") ? after : ` ${after}`);

      aui.composer().setText(newText);
    },
    [aui, trigger],
  );

  const close = useCallback(() => {
    // Remove the `@query` from text to dismiss
    if (!trigger) return;
    const currentText = aui.composer().getState().text;
    const before = currentText.slice(0, trigger.offset);
    const after = currentText.slice(trigger.offset + 1 + trigger.query.length);
    aui.composer().setText(before + after);
  }, [aui, trigger]);

  const value = useMemo<MentionContextValue>(
    () => ({
      open,
      query,
      activeCategoryId,
      categories: activeCategoryId ? filteredCategories : filteredCategories,
      items: filteredItems,
      isLoading,
      selectCategory,
      goBack,
      selectItem,
      close,
    }),
    [
      open,
      query,
      activeCategoryId,
      filteredCategories,
      filteredItems,
      isLoading,
      selectCategory,
      goBack,
      selectItem,
      close,
    ],
  );

  return (
    <MentionContext.Provider value={value}>{children}</MentionContext.Provider>
  );
};

ComposerPrimitiveMentionRoot.displayName = "ComposerPrimitive.MentionRoot";
