export type WidgetEdit = { old_string: string; new_string: string };

export type ApplyEditsResult =
  | { ok: true; code: string }
  | { ok: false; error: string; index: number };

const countOccurrences = (haystack: string, needle: string) => {
  let count = 0;
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    count++;
    if (count > 1) break;
  }
  return count;
};

const preview = (text: string) =>
  JSON.stringify(text.length > 80 ? `${text.slice(0, 80)}…` : text);

/**
 * Applies exact string replacements in order. Each `old_string` must occur
 * exactly once in the code as it stands after the previous edits; on any
 * failure no edit is applied.
 */
export function applyWidgetEdits(
  code: string,
  edits: readonly WidgetEdit[],
): ApplyEditsResult {
  if (edits.length === 0) {
    return {
      ok: false,
      error: "edits must contain at least one replacement",
      index: -1,
    };
  }
  let next = code;
  for (const [index, edit] of edits.entries()) {
    if (!edit.old_string) {
      return { ok: false, error: `edits[${index}].old_string is empty`, index };
    }
    if (edit.old_string === edit.new_string) {
      return {
        ok: false,
        error: `edits[${index}] does not change anything`,
        index,
      };
    }
    const count = countOccurrences(next, edit.old_string);
    if (count === 0) {
      return {
        ok: false,
        error: `edits[${index}].old_string was not found: ${preview(edit.old_string)}. Copy it exactly from the widget's latest code.`,
        index,
      };
    }
    if (count > 1) {
      return {
        ok: false,
        error: `edits[${index}].old_string occurs more than once: ${preview(edit.old_string)}. Include surrounding text so it matches exactly one place.`,
        index,
      };
    }
    const at = next.indexOf(edit.old_string);
    next =
      next.slice(0, at) +
      edit.new_string +
      next.slice(at + edit.old_string.length);
  }
  return { ok: true, code: next };
}
