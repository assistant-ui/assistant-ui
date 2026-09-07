import type {
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "../types/trigger";

/**
 * Adapter providing synchronous categories and items to a trigger popover.
 *
 * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
 */
export type Unstable_TriggerAdapter = {
  /** Return the top-level categories for the trigger popover. */
  categories(): readonly Unstable_TriggerCategory[];

  /** Return items within a category. */
  categoryItems(categoryId: string): readonly Unstable_TriggerItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly Unstable_TriggerItem[];
};
