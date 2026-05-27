/** Detects whether text looks like OpenUI Lang (starts with `root =`). */
const ROOT_ASSIGNMENT = /^\s*root\s*=/m;

const stripMarkdownFence = (text: string): string => {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^```(?:openui|oui|openui-lang)?\s*\n?([\s\S]*?)\n?```\s*$/i,
  );
  return match ? match[1]!.trim() : trimmed;
};

export const isOpenUILangText = (text: string): boolean =>
  ROOT_ASSIGNMENT.test(stripMarkdownFence(text));

/** Text echo of OpenUI Lang — hide when a renderer already consumed it. */
export const isLeakedOpenUILangText = isOpenUILangText;

/**
 * Split assistant text into an OpenUI Lang `source` and optional markdown remainder.
 * Returns null when no OpenUI Lang is detected.
 */
export const extractOpenUILangFromText = (
  text: string,
): { source: string; remainder: string } | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(
    /^([\s\S]*?)```(?:openui|oui|openui-lang)?\s*\n([\s\S]*?)\n?```\s*([\s\S]*)$/i,
  );
  if (fenced) {
    const [, before, lang, after] = fenced;
    const source = lang!.trim();
    if (!ROOT_ASSIGNMENT.test(source)) return null;
    const remainder = [before!.trim(), after!.trim()]
      .filter(Boolean)
      .join("\n\n");
    return { source, remainder };
  }

  const source = stripMarkdownFence(trimmed);
  if (!ROOT_ASSIGNMENT.test(source)) return null;

  return { source, remainder: "" };
};
