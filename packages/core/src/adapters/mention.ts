import type {
  Unstable_MentionCategory,
  Unstable_MentionItem,
  Unstable_DirectiveSegment,
  Unstable_DirectiveFormatter,
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
