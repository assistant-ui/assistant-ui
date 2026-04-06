import type { Unstable_TriggerItem, Unstable_TriggerCategory } from "./trigger";

// =============================================================================
// Mention Item — alias of the generic TriggerItem for backward compatibility
// =============================================================================

export type Unstable_MentionItem = Unstable_TriggerItem;

// =============================================================================
// Mention Category — alias of the generic TriggerCategory
// =============================================================================

export type Unstable_MentionCategory = Unstable_TriggerCategory;

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
