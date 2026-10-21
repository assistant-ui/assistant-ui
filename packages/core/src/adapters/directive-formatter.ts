import type { DirectiveFormatter, DirectiveSegment } from "../types/directive";
import type { TriggerItem } from "../types/trigger";

const QUOTED_VALUE = String.raw`"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[\da-fA-F]{4})){1,1024}"`;
const DIRECTIVE_RE = new RegExp(
  String.raw`:([\w-]{1,64})(?:\[([^\]\n]{1,1024})\](?:\{name=([^}\n]{1,1024})\})?|\{label=(${QUOTED_VALUE})(?: name=(${QUOTED_VALUE}))?\})`,
  "gu",
);

/**
 * Default directive formatter using the `:type[label]{name=id}` syntax.
 *
 * When `id` equals `label`, the `{name=…}` attribute is omitted for brevity.
 * Labels containing `]` or distinct IDs containing `}` use
 * `:type{label="..." name="..."}` with JSON-quoted values instead. The `name`
 * field is omitted when it equals the label. Existing bracket syntax stays literal.
 */
export const defaultDirectiveFormatter: DirectiveFormatter = {
  serialize(item: TriggerItem): string {
    if (
      item.label.includes("]") ||
      (item.id !== item.label && item.id.includes("}"))
    ) {
      const name =
        item.id !== item.label ? ` name=${JSON.stringify(item.id)}` : "";
      return `:${item.type}{label=${JSON.stringify(item.label)}${name}}`;
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
      const label: string =
        match[4] === undefined ? match[2]! : JSON.parse(match[4]);
      const id: string =
        match[5] === undefined ? (match[3] ?? label) : JSON.parse(match[5]);
      segments.push({
        kind: "mention",
        type: match[1]!,
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
