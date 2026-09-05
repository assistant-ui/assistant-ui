import type { Unstable_TriggerItem } from "./trigger";

/** Parsed segment from directive text: either literal text or a resolved directive. */
export type Unstable_DirectiveSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly type: string;
      readonly label: string;
      readonly id: string;
    };

/** Configurable formatter for directive serialization and parsing. */
export type Unstable_DirectiveFormatter = {
  /** Serialize a trigger item to directive text. */
  serialize(item: Unstable_TriggerItem): string;
  /** Parse text into alternating text and directive segments. */
  parse(text: string): readonly Unstable_DirectiveSegment[];
};
