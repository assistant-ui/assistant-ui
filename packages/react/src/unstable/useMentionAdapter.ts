"use client";

import { useMemo, type FC } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerAdapter,
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

/** Icon component shape consumed by `ComposerTriggerPopover`'s `iconMap`. */
export type Unstable_IconComponent = FC<{ className?: string }>;

export type Unstable_Mention = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  /** Shortcut for `metadata.icon`; merged with `metadata` if both are given. */
  readonly icon?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

export type Unstable_MentionCategory = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly Unstable_Mention[];
};

export type Unstable_ModelContextToolsOptions = {
  /** Wrap tools in a dedicated category (drill-down mode). */
  readonly category?: { readonly id: string; readonly label: string };
  /** Format tool name for display. */
  readonly formatLabel?: (toolName: string) => string;
  /** Default icon key for each tool. */
  readonly icon?: string;
};

export type Unstable_UseMentionAdapterOptions = {
  /** Flat mention list. Ignored when `categories` is set. */
  readonly items?: readonly Unstable_Mention[];
  /** Categorized mentions for drill-down navigation. */
  readonly categories?: readonly Unstable_MentionCategory[];
  /**
   * How tools registered via `useAssistantTool` integrate.
   * - `false`: exclude.
   * - `true`: include (default when no `items`/`categories`; as a category
   *   if `categories` is set, flat otherwise).
   * - object: explicit config.
   *
   * Omitted → defaults to `true` iff neither `items` nor `categories`.
   */
  readonly includeModelContextTools?:
    | boolean
    | Unstable_ModelContextToolsOptions;
  /** Directive formatter. @default unstable_defaultDirectiveFormatter */
  readonly formatter?: Unstable_DirectiveFormatter;
  /** Fires after an item is inserted into the composer. */
  readonly onInserted?: (item: Unstable_TriggerItem) => void;
  /** Maps `metadata.icon` / `category.id` string keys to React components. */
  readonly iconMap?: Record<string, Unstable_IconComponent>;
  /** Fallback icon when no entry in `iconMap` matches. */
  readonly fallbackIcon?: Unstable_IconComponent;
};

export type Unstable_MentionDirective = {
  readonly formatter: Unstable_DirectiveFormatter;
  readonly onInserted?: ((item: Unstable_TriggerItem) => void) | undefined;
};

/**
 * @deprecated Under active development and might change without notice.
 *
 * Creates a spreadable `{ adapter, directive }` bundle for `@` mentions.
 * Supports tools registered via `useAssistantTool`, explicit items, or both —
 * flat or categorized.
 *
 * @example
 * ```tsx
 * const mention = unstable_useMentionAdapter();
 * <ComposerTriggerPopover char="@" {...mention} />
 * ```
 */
export function unstable_useMentionAdapter(
  options?: Unstable_UseMentionAdapterOptions,
): {
  adapter: Unstable_TriggerAdapter;
  directive: Unstable_MentionDirective;
  iconMap?: Record<string, Unstable_IconComponent>;
  fallbackIcon?: Unstable_IconComponent;
} {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const aui = useAui();

  const items = options?.items;
  const categories = options?.categories;
  const includeTools =
    options?.includeModelContextTools ?? (!items && !categories);
  const toolsConfig =
    typeof includeTools === "object" ? includeTools : undefined;
  const wantsTools = includeTools !== false;
  const formatter = options?.formatter;
  const onInserted = options?.onInserted;

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const adapter = useMemo<Unstable_TriggerAdapter>(() => {
    const getModelContextTools = (): Unstable_TriggerItem[] => {
      if (!wantsTools) return [];
      const ctx = aui.thread().getModelContext();
      const tools = ctx.tools;
      if (!tools) return [];
      const formatLabel = toolsConfig?.formatLabel;
      const defaultIcon = toolsConfig?.icon;
      return Object.entries(tools).map(([name, tool]) =>
        toTriggerItem({
          id: name,
          type: "tool",
          label: formatLabel ? formatLabel(name) : name,
          description: tool.description ?? undefined,
          icon: defaultIcon,
        }),
      );
    };

    // Categorized: drill-down mode
    if (categories && categories.length > 0) {
      const groups = categories.map((cat) => ({
        id: cat.id,
        label: cat.label,
        items: cat.items.map(toTriggerItem),
      }));

      let toolCategory: {
        id: string;
        label: string;
        items: Unstable_TriggerItem[];
      } | null = null;
      if (wantsTools) {
        const toolItems = getModelContextTools();
        if (toolItems.length > 0) {
          toolCategory = {
            id: toolsConfig?.category?.id ?? "tools",
            label: toolsConfig?.category?.label ?? "Tools",
            items: toolItems,
          };
        }
      }
      const allGroups = toolCategory ? [...groups, toolCategory] : groups;

      return {
        categories: () => allGroups.map(({ id, label }) => ({ id, label })),
        categoryItems: (id) => allGroups.find((g) => g.id === id)?.items ?? [],
        search: (query) => {
          const lower = query.toLowerCase();
          return allGroups
            .flatMap((g) => g.items)
            .filter((item) => matchesQuery(item, lower));
        },
      };
    }

    // Flat: items + (optionally) tools, all in one search pool
    const flatItems = (items ?? []).map(toTriggerItem);
    const getFlatPool = (): Unstable_TriggerItem[] => {
      if (!wantsTools) return flatItems;
      const toolItems = getModelContextTools();
      // Dedupe by id — explicit items win.
      const seen = new Set(flatItems.map((i) => i.id));
      return [...flatItems, ...toolItems.filter((t) => !seen.has(t.id))];
    };

    return {
      categories: (): readonly Unstable_TriggerCategory[] => [],
      categoryItems: () => [],
      search: (query) => {
        const lower = query.toLowerCase();
        return getFlatPool().filter((item) => matchesQuery(item, lower));
      },
    };
  }, [aui, items, categories, wantsTools, toolsConfig]);

  // biome-ignore lint/correctness/useHookAtTopLevel: `unstable_` prefix not recognized as hook
  const directive = useMemo<Unstable_MentionDirective>(
    () => ({
      formatter: formatter ?? unstable_defaultDirectiveFormatter,
      ...(onInserted ? { onInserted } : {}),
    }),
    [formatter, onInserted],
  );

  return {
    adapter,
    directive,
    ...(options?.iconMap ? { iconMap: options.iconMap } : {}),
    ...(options?.fallbackIcon ? { fallbackIcon: options.fallbackIcon } : {}),
  };
}

function toTriggerItem(m: Unstable_Mention): Unstable_TriggerItem {
  const metadata =
    m.icon !== undefined ? { ...(m.metadata ?? {}), icon: m.icon } : m.metadata;
  return {
    id: m.id,
    type: m.type,
    label: m.label,
    ...(m.description !== undefined ? { description: m.description } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

function matchesQuery(item: Unstable_TriggerItem, lower: string): boolean {
  if (!lower) return true;
  if (item.id.toLowerCase().includes(lower)) return true;
  if (item.label.toLowerCase().includes(lower)) return true;
  if (item.description?.toLowerCase().includes(lower)) return true;
  return false;
}
