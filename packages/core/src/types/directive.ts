import type { TriggerItem } from "./trigger";

/** Parsed segment from directive text: either literal text or a resolved directive. */
export type DirectiveSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly type: string;
      readonly label: string;
      readonly id: string;
    };

/** @deprecated Use `DirectiveSegment` instead. */
export type Unstable_DirectiveSegment = DirectiveSegment;

/** Configurable formatter for directive serialization and parsing. */
export type DirectiveFormatter = {
  /** Serialize a trigger item to directive text. */
  serialize(item: TriggerItem): string;
  /** Parse text into alternating text and directive segments. */
  parse(text: string): readonly DirectiveSegment[];
};

/** @deprecated Use `DirectiveFormatter` instead. */
export type Unstable_DirectiveFormatter = DirectiveFormatter;
