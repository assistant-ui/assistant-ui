"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type FC,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  Unstable_MentionAdapter,
  Unstable_MentionCategory,
  Unstable_MentionItem,
} from "@assistant-ui/core";

// =============================================================================
// Context Types
// =============================================================================

type MentionPopoverState = {
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_MentionCategory[];
  readonly items: readonly Unstable_MentionItem[];
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

function detectMentionTrigger(text: string): {
  query: string;
  offset: number;
} | null {
  const lastAtIndex = text.lastIndexOf("@");
  if (lastAtIndex === -1) return null;

  if (lastAtIndex > 0 && !/\s/.test(text[lastAtIndex - 1]!)) return null;

  const query = text.slice(lastAtIndex + 1);

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

  const runtimeAdapter = useMemo(() => {
    try {
      const runtime = aui.composer().__internal_getRuntime?.();
      return (runtime as any)?._core?.getState()?.getMentionAdapter?.();
    } catch {
      return undefined;
    }
  }, [aui]);
  const adapter = adapterProp ?? runtimeAdapter;

  // Detect trigger
  const trigger = useMemo(() => detectMentionTrigger(text), [text]);
  const open = trigger !== null && adapter !== undefined;
  const query = trigger?.query ?? "";

  // Category navigation — reset when popover closes
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const effectiveActiveCategoryId = open ? activeCategoryId : null;

  // Derive categories and items synchronously from adapter
  const categories = useMemo<readonly Unstable_MentionCategory[]>(() => {
    if (!open || !adapter) return [];
    return adapter.categories();
  }, [open, adapter]);

  const allItems = useMemo<readonly Unstable_MentionItem[]>(() => {
    if (!effectiveActiveCategoryId || !adapter) return [];
    return adapter.categoryItems(effectiveActiveCategoryId);
  }, [effectiveActiveCategoryId, adapter]);

  // Filter by query
  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    const lower = query.toLowerCase();
    return categories.filter((cat) => cat.label.toLowerCase().includes(lower));
  }, [categories, query]);

  const filteredItems = useMemo(() => {
    if (!query) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.id.toLowerCase().includes(lower) ||
        item.label.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower),
    );
  }, [allItems, query]);

  const selectCategory = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
  }, []);

  const goBack = useCallback(() => {
    setActiveCategoryId(null);
  }, []);

  const selectItem = useCallback(
    (item: Unstable_MentionItem) => {
      if (!trigger) return;

      const currentText = aui.composer().getState().text;
      const before = currentText.slice(0, trigger.offset);
      const after = currentText.slice(
        trigger.offset + 1 + trigger.query.length,
      );
      const attrs = item.id !== item.label ? `{name=${item.id}}` : "";
      const directive = `:${item.type}[${item.label}]${attrs}`;
      const newText =
        before + directive + (after.startsWith(" ") ? after : ` ${after}`);

      aui.composer().setText(newText);
      setActiveCategoryId(null);
    },
    [aui, trigger],
  );

  const close = useCallback(() => {
    if (!trigger) return;
    const currentText = aui.composer().getState().text;
    const before = currentText.slice(0, trigger.offset);
    const after = currentText.slice(trigger.offset + 1 + trigger.query.length);
    aui.composer().setText(before + after);
    setActiveCategoryId(null);
  }, [aui, trigger]);

  const value = useMemo<MentionContextValue>(
    () => ({
      open,
      query,
      activeCategoryId: effectiveActiveCategoryId,
      categories: filteredCategories,
      items: filteredItems,
      selectCategory,
      goBack,
      selectItem,
      close,
    }),
    [
      open,
      query,
      effectiveActiveCategoryId,
      filteredCategories,
      filteredItems,
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
