import type {
  Unstable_MentionCategory,
  Unstable_MentionItem,
} from "../types/mention";

// =============================================================================
// Mention Adapter
// =============================================================================

export type Unstable_MentionAdapter = {
  /** Return the top-level categories for the mention picker. */
  categories():
    | Promise<readonly Unstable_MentionCategory[]>
    | readonly Unstable_MentionCategory[];

  /** Return items within a category (supports async loading). */
  categoryItems(
    categoryId: string,
  ): Promise<readonly Unstable_MentionItem[]> | readonly Unstable_MentionItem[];

  /** Global search across all categories (optional). */
  search?(
    query: string,
  ): Promise<readonly Unstable_MentionItem[]> | readonly Unstable_MentionItem[];

  /** Post-selection resolve/validate (optional, like AttachmentAdapter.send). */
  resolve?(
    item: Unstable_MentionItem,
  ): Promise<Unstable_MentionItem> | Unstable_MentionItem;
};
