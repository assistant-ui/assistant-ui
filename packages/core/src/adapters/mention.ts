import type {
  Unstable_MentionItem,
  Unstable_DirectiveSegment,
  Unstable_DirectiveFormatter,
} from "../types/mention";
import type { Unstable_TriggerAdapter } from "./trigger";

// =============================================================================
// Mention Adapter — alias of the generic TriggerAdapter
// =============================================================================

export type Unstable_MentionAdapter = Unstable_TriggerAdapter;

// =============================================================================
// Default Directive Formatter
// =============================================================================

const DIRECTIVE_RE = /:([\w-]+)\[([^\]]+)\](?:\{name=([^}]+)\})?/g;

/**
 * Default directive formatter using the `:type[label]{name=id}` syntax.
 *
 * When `id` equals `label`, the `{name=…}` attribute is omitted for brevity.
 */
export const unstable_defaultDirectiveFormatter: Unstable_DirectiveFormatter = {
  serialize(item: Unstable_MentionItem): string {
    const attrs = item.id !== item.label ? `{name=${item.id}}` : "";
    return `:${item.type}[${item.label}]${attrs}`;
  },

  parse(text: string): Unstable_DirectiveSegment[] {
    const segments: Unstable_DirectiveSegment[] = [];
    let lastIndex = 0;

    DIRECTIVE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DIRECTIVE_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          kind: "text",
          text: text.slice(lastIndex, match.index),
        });
      }
      const label = match[2]!;
      segments.push({
        kind: "mention",
        type: match[1]!,
        label,
        id: match[3] ?? label,
      });
      lastIndex = DIRECTIVE_RE.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ kind: "text", text: text.slice(lastIndex) });
    }

    return segments;
  },
};
