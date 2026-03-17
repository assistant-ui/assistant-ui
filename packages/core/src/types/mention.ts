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

// =============================================================================
// Directive Segment (parsed representation of mention directives in text)
// =============================================================================

/** Parsed segment from directive text */
export type Unstable_DirectiveSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly type: string;
      readonly label: string;
      readonly id: string;
    };

// =============================================================================
// Directive Formatter (configurable serialization/parsing for mentions)
// =============================================================================

/** Configurable formatter for mention directive serialization/parsing */
export type Unstable_DirectiveFormatter = {
  /** Serialize a mention item to directive text */
  serialize(item: Unstable_MentionItem): string;
  /** Parse text into alternating text and mention segments */
  parse(text: string): readonly Unstable_DirectiveSegment[];
};
