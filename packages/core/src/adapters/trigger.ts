import type {
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "../types/trigger";

/**
 * Adapter for providing categories and items to a trigger popover.
 *
 * All methods are synchronous by design — the adapter drives UI display and
 * must return data immediately. Use external state management (e.g. React
 * Query, SWR, or local state) to handle async data fetching, then expose
 * the loaded results synchronously through this adapter.
 */
export type Unstable_TriggerAdapter = {
  /** Return the top-level categories for the trigger popover. */
  categories(): readonly Unstable_TriggerCategory[];

  /** Return items within a category. */
  categoryItems(categoryId: string): readonly Unstable_TriggerItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly Unstable_TriggerItem[];
};

export type Unstable_SlashCommandItem = Unstable_TriggerItem & {
  /** Action to execute when the command is selected. */
  readonly execute?: (() => void) | undefined;
};

// narrower return types so consumers get SlashCommandItem directly without casting
export type Unstable_SlashCommandAdapter = Omit<
  Unstable_TriggerAdapter,
  "categoryItems" | "search"
> & {
  /** Return commands within a category. */
  categoryItems(categoryId: string): readonly Unstable_SlashCommandItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly Unstable_SlashCommandItem[];
};
