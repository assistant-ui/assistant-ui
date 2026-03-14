import type { ReadonlyJSONObject } from "assistant-stream/utils";

// =============================================================================
// Mention Item (user-facing definition for items that can be @-mentioned)
// =============================================================================

export type Unstable_MentionItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly icon?: string | undefined;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

// =============================================================================
// Mention Category (for hierarchical navigation)
// =============================================================================

export type Unstable_MentionCategory = {
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
};
