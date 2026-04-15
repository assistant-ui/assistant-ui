import type {
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "../types/trigger";

/** Adapter providing synchronous categories and items to a trigger popover. */
export type Unstable_TriggerAdapter = {
  /** Return the top-level categories for the trigger popover. */
  categories(): readonly Unstable_TriggerCategory[];

  /** Return items within a category. */
  categoryItems(categoryId: string): readonly Unstable_TriggerItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly Unstable_TriggerItem[];
};
