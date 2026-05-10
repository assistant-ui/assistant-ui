import {
  resource,
  tapEffect,
  tapEffectEvent,
  tapMemo,
  tapState,
} from "@assistant-ui/tap";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "@assistant-ui/core";

function matchesQuery(item: Unstable_TriggerItem, lower: string): boolean {
  return (
    item.id.toLowerCase().includes(lower) ||
    item.label.toLowerCase().includes(lower) ||
    (item.description?.toLowerCase().includes(lower) ?? false)
  );
}

export type TriggerNavigationResourceOutput = {
  /** Filtered categories visible in the list (empty in search mode). */
  readonly categories: readonly Unstable_TriggerCategory[];
  /** Filtered items visible in the list. */
  readonly items: readonly Unstable_TriggerItem[];
  /** `true` when the current list is search results rather than categories. */
  readonly isSearchMode: boolean;
  /** Currently drilled-into category id (or `null` for the top level). */
  readonly activeCategoryId: string | null;
  /** Flat list used for keyboard navigation (categories or items). */
  readonly navigableList: readonly (
    | Unstable_TriggerCategory
    | Unstable_TriggerItem
  )[];
  /** Drill into a category. */
  selectCategory(categoryId: string): void;
  /** Return to the top-level category list. */
  goBack(): void;
};

/**
 * Computes categories, items, search results, and navigation state from the
 * adapter + current query. Pure derivation — no side effects on the composer.
 */
export const TriggerNavigationResource = resource(
  ({
    adapter,
    query,
    open,
  }: {
    adapter: Unstable_TriggerAdapter | undefined;
    query: string;
    open: boolean;
  }): TriggerNavigationResourceOutput => {
    const [activeCategoryId, setActiveCategoryId] = tapState<string | null>(
      null,
    );

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

      // fallback: no adapter.search
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

    const selectCategory = tapEffectEvent((categoryId: string) => {
      setActiveCategoryId(categoryId);
    });

    const goBack = tapEffectEvent(() => {
      setActiveCategoryId(null);
    });

    return {
      categories: filteredCategories,
      items: filteredItems,
      isSearchMode,
      activeCategoryId: effectiveActiveCategoryId,
      navigableList,
      selectCategory,
      goBack,
    };
  },
);
