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
import { matchesTriggerItemQuery } from "../primitives/composer/trigger/matchesTriggerItemQuery";
import {
  shallowEqualRecords,
  useModelContextSnapshot,
  type ModelContextSnapshotSource,
} from "./useModelContextSnapshot";

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
  /**
   * Wrap tools in a dedicated category. Selects drill-down mode on its own
   * when `categories` is unset and `items` is omitted.
   */
  readonly category?: { readonly id: string; readonly label: string };
  /** Format tool name for display. */
  readonly formatLabel?: (toolName: string) => string;
  /** Default icon key for each tool. */
  readonly icon?: string;
};

export type Unstable_UseMentionAdapterOptions = {
  /**
   * Flat mention list. Ignored when `categories` is set, and keeps the
   * adapter flat when a tool `category` is configured.
   */
  readonly items?: readonly Unstable_Mention[];
  /** Categorized mentions for drill-down navigation. */
  readonly categories?: readonly Unstable_MentionCategory[];
  /**
   * How tools registered in model context integrate.
   * - `false`: exclude.
   * - `true`: include (default when no `items`/`categories`; as a category
   *   if `categories` is set, flat otherwise).
   * - object: explicit config; `category` also selects drill-down mode.
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

const EMPTY_TOOL_MENTIONS: Readonly<Record<string, string | undefined>> =
  Object.freeze({});

// The description is copied out rather than reached through the tool, so a
// provider that returns a stable tool object and edits it in place is observed.
const toolMentionSource: ModelContextSnapshotSource<
  Readonly<Record<string, string | undefined>>
> = {
  empty: EMPTY_TOOL_MENTIONS,
  read: (aui) => {
    const tools = aui.thread.getModelContext().tools;
    if (!tools) return EMPTY_TOOL_MENTIONS;
    const mentions = Object.create(null) as Record<string, string | undefined>;
    for (const [name, tool] of Object.entries(tools)) {
      mentions[name] = tool.description;
    }
    return mentions;
  },
  subscribe: (aui, onChange) => {
    const unsubscribeContext = aui.on("thread.modelContextUpdate", onChange);
    // Rebinding the thread event subject to a new thread does not replay it,
    // so a switch between threads carrying different providers is its own
    // refresh trigger. Subscribed globally because a composer can render
    // without a thread list scope.
    const unsubscribeSelection = aui.on(
      { scope: "*", event: "threads.selectionChanged" },
      onChange,
    );
    return () => {
      unsubscribeContext();
      unsubscribeSelection();
    };
  },
  isEqual: shallowEqualRecords,
};

/**
 * @deprecated Under active development and might change without notice.
 *
 * Creates a spreadable `{ adapter, directive }` bundle for `@` mentions.
 * Supports tools registered in model context, explicit items, or both —
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
  const isCategorized =
    (categories !== undefined && categories.length > 0) ||
    (toolsConfig?.category !== undefined && items === undefined);
  const toolMentions = useModelContextSnapshot(
    aui,
    wantsTools,
    toolMentionSource,
  );

  const adapter = useMemo<Unstable_TriggerAdapter>(() => {
    const formatLabel = toolsConfig?.formatLabel;
    const defaultIcon = toolsConfig?.icon;
    const toolItems = wantsTools
      ? Object.entries(toolMentions).map(([name, description]) =>
          toTriggerItem({
            id: name,
            type: "tool",
            label: formatLabel ? formatLabel(name) : name,
            description,
            icon: defaultIcon,
          }),
        )
      : [];

    // Categorized: drill-down mode
    if (isCategorized) {
      const groups = (categories ?? []).map((cat) => ({
        id: cat.id,
        label: cat.label,
        items: cat.items.map(toTriggerItem),
      }));
      const allGroups =
        toolItems.length > 0
          ? [
              ...groups,
              {
                id: toolsConfig?.category?.id ?? "tools",
                label: toolsConfig?.category?.label ?? "Tools",
                items: toolItems,
              },
            ]
          : groups;

      return {
        categories: () => allGroups.map(({ id, label }) => ({ id, label })),
        categoryItems: (id) => allGroups.find((g) => g.id === id)?.items ?? [],
        search: (query) => {
          const lower = query.toLowerCase();
          return allGroups
            .flatMap((g) => g.items)
            .filter((item) => matchesTriggerItemQuery(item, lower));
        },
      };
    }

    // Flat: items + (optionally) tools, all in one search pool
    const flatItems = (items ?? []).map(toTriggerItem);
    // Dedupe by id — explicit items win.
    const seen = new Set(flatItems.map((i) => i.id));
    const flatPool = [
      ...flatItems,
      ...toolItems.filter((t) => !seen.has(t.id)),
    ];

    return {
      categories: (): readonly Unstable_TriggerCategory[] => [],
      categoryItems: () => [],
      search: (query) => {
        const lower = query.toLowerCase();
        return flatPool.filter((item) => matchesTriggerItemQuery(item, lower));
      },
    };
  }, [items, categories, wantsTools, toolsConfig, isCategorized, toolMentions]);

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
