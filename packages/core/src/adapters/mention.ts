import type {
  Unstable_MentionCategory,
  Unstable_MentionItem,
} from "../types/mention";

// =============================================================================
// Mention Adapter
// =============================================================================

/**
 * Adapter for providing mention categories and items to the mention picker.
 *
 * All methods are synchronous by design — the adapter drives UI display and
 * must return data immediately. Use external state management (e.g. React
 * Query, SWR, or local state) to handle async data fetching, then expose
 * the loaded results synchronously through this adapter.
 */
export type Unstable_MentionAdapter = {
  /** Return the top-level categories for the mention picker. */
  categories(): readonly Unstable_MentionCategory[];

  /** Return items within a category. */
  categoryItems(categoryId: string): readonly Unstable_MentionItem[];

  /** Global search across all categories (optional). */
  search?(query: string): readonly Unstable_MentionItem[];
};
