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
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";

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

// =============================================================================
// Mention trigger detection
// =============================================================================

function detectMentionTrigger(
  text: string,
  triggerChar: string,
): {
  query: string;
  offset: number;
} | null {
  const lastTriggerIndex = text.lastIndexOf(triggerChar);
  if (lastTriggerIndex === -1) return null;

  if (lastTriggerIndex > 0 && !/\s/.test(text[lastTriggerIndex - 1]!))
    return null;

  const query = text.slice(lastTriggerIndex + triggerChar.length);

  if (query.includes("\n")) return null;

  return { query, offset: lastTriggerIndex };
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
  const trigger = useMemo(
    () => detectMentionTrigger(text, triggerChar),
    [text, triggerChar],
  );
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
        trigger.offset + triggerChar.length + trigger.query.length,
      );
      const directive = formatter.serialize(item);
      const newText =
        before + directive + (after.startsWith(" ") ? after : ` ${after}`);

      aui.composer().setText(newText);
      setActiveCategoryId(null);
    },
    [aui, trigger, triggerChar, formatter],
  );

  const close = useCallback(() => {
    if (!trigger) return;
    const currentText = aui.composer().getState().text;
    const before = currentText.slice(0, trigger.offset);
    const after = currentText.slice(
      trigger.offset + triggerChar.length + trigger.query.length,
    );
    aui.composer().setText(before + after);
    setActiveCategoryId(null);
  }, [aui, trigger, triggerChar]);

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
      formatter,
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
      formatter,
    ],
  );

  return (
    <MentionContext.Provider value={value}>{children}</MentionContext.Provider>
  );
};

ComposerPrimitiveMentionRoot.displayName = "ComposerPrimitive.MentionRoot";
