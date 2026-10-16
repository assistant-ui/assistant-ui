import type { DirectiveFormatter, DirectiveSegment } from "../types/directive";
import type { TriggerItem } from "../types/trigger";

const DIRECTIVE_RE =
  /:(?:!(?:([\w-]{1,64})\[((?:[A-Za-z0-9_.!~*'()-]|%[0-9A-Fa-f]{2})+)\](?:\{name=((?:[A-Za-z0-9_.!~*'()-]|%[0-9A-Fa-f]{2})+)\})?)|([\w-]{1,64})\[([^\]\n]{1,1024})\](?:\{name=([^}\n]{1,1024})\})?)/gu;

/**
 * Default directive formatter using the `:type[label]{name=id}` syntax.
 *
 * When `id` equals `label`, the `{name=…}` attribute is omitted for brevity.
 */
export const defaultDirectiveFormatter: DirectiveFormatter = {
  serialize(item: TriggerItem): string {
    if (item.label.includes("]") || item.id.includes("}")) {
      const attrs =
        item.id !== item.label ? `{name=${encodeURIComponent(item.id)}}` : "";
      return `:!${item.type}[${encodeURIComponent(item.label)}]${attrs}`;
    }

    const attrs = item.id !== item.label ? `{name=${item.id}}` : "";
    return `:${item.type}[${item.label}]${attrs}`;
  },

  parse(text: string): DirectiveSegment[] {
    const segments: DirectiveSegment[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(DIRECTIVE_RE)) {
      if (match.index > lastIndex) {
        segments.push({
          kind: "text",
          text: text.slice(lastIndex, match.index),
        });
      }
      let type: string;
      let label: string;
      let id: string;
      if (match[1] !== undefined) {
        try {
          type = match[1];
          label = decodeURIComponent(match[2]!);
          id = match[3] === undefined ? label : decodeURIComponent(match[3]);
        } catch {
          segments.push({ kind: "text", text: match[0] });
          lastIndex = match.index + match[0].length;
          continue;
        }
      } else {
        type = match[4]!;
        label = match[5]!;
        id = match[6] ?? label;
      }
      segments.push({
        kind: "mention",
        type,
        label,
        id,
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ kind: "text", text: text.slice(lastIndex) });
    }

    return segments;
  },
};

/** @deprecated Use `defaultDirectiveFormatter` instead. */
export const unstable_defaultDirectiveFormatter = defaultDirectiveFormatter;
