import type { TriggerCategory, TriggerItem } from "../types/trigger";

/** Adapter providing synchronous categories and items to a trigger popover. */
export type TriggerAdapter = {
  /** Return the top-level categories for the trigger popover. */
  categories(): readonly TriggerCategory[];

  /** Return items within a category. */
  categoryItems(categoryId: string): readonly TriggerItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly TriggerItem[];
};

/** @deprecated Use `TriggerAdapter` instead. */
export type Unstable_TriggerAdapter = TriggerAdapter;
