export type DocumentEditResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

const countOccurrences = (content: string, find: string) => {
  let count = 0;
  let index = content.indexOf(find);
  while (index !== -1) {
    count += 1;
    index = content.indexOf(find, index + find.length);
  }
  return count;
};

/**
 * Replaces the single occurrence of `find` in `content`. An edit that matches
 * nothing or more than one place is rejected with a message the model can act
 * on, so a vague edit never lands in the wrong paragraph.
 */
export function replaceOnce(
  content: string,
  find: string,
  replace: string,
): DocumentEditResult {
  if (find === "") {
    return {
      ok: false,
      error:
        "find is empty. Pass the exact text to replace, or call write_document to replace the whole document.",
    };
  }

  const occurrences = countOccurrences(content, find);
  if (occurrences === 0) {
    return {
      ok: false,
      error:
        "find does not match the document. Call read_document and copy the text exactly, including whitespace and punctuation.",
    };
  }
  if (occurrences > 1) {
    return {
      ok: false,
      error: `find matches ${occurrences} places. Include more of the surrounding text so it matches exactly one.`,
    };
  }

  const index = content.indexOf(find);
  return {
    ok: true,
    content:
      content.slice(0, index) + replace + content.slice(index + find.length),
  };
}

export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

/** The document's first heading, which stands in for a title. */
export function documentTitle(content: string): string {
  return /^#{1,6}[ \t]+(.+)$/m.exec(content)?.[1]?.trim() || "Untitled";
}
