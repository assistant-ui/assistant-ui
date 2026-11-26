import type { ContentRecord } from "./content-search";
import { tokenize } from "./query";

// Shorter words have too many neighbours one edit away ("muse" and "use").
const MIN_LENGTH = 5;

/**
 * Damerau-Levenshtein distance (adjacent swaps count as one edit), giving up
 * once it exceeds `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before = Array.from({ length: b.length + 1 }, (_, j) => j);
  let previous = before;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        previous[j]! + 1,
        row[j - 1]! + 1,
        previous[j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, before[j - 2]! + 1);
      }
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    before = previous;
    previous = row;
  }
  return previous[b.length]!;
}

/**
 * Builds a corrector from the words in the docs. It returns the query with each
 * misspelled word replaced by the closest docs word, or undefined when every
 * word already appears in the docs or none has a close match.
 */
export function createSpellingCorrector(records: readonly ContentRecord[]) {
  const counts = new Map<string, number>();
  for (const page of records) {
    const texts = [
      page.title,
      page.description,
      ...page.headings.map((heading) => heading.content),
      ...page.contents,
    ];
    for (const text of texts) {
      for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
        if (word.length >= MIN_LENGTH - 1) {
          counts.set(word, (counts.get(word) ?? 0) + 1);
        }
      }
    }
  }
  const words = [...counts.keys()];

  const correctWord = (token: string) => {
    // Search matches substrings, so a word typed in part ("footno") or found
    // inside a longer docs word already matches and needs no correction.
    if (words.some((word) => word.includes(token))) return token;
    // One edit, keeping the first letter: replaying real searches, two edits
    // mostly turned real words into other ones ("marketing" into "marking").
    let best: { word: string; distance: number; count: number } | undefined;
    for (const word of words) {
      if (word[0] !== token[0]) continue;
      const distance = editDistance(token, word, 1);
      if (distance > 1) continue;
      const count = counts.get(word)!;
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && count > best.count)
      ) {
        best = { word, distance, count };
      }
    }
    return best?.word ?? token;
  };

  return (query: string): string | undefined => {
    const tokens = tokenize(query);
    const corrected = tokens
      // `tokenize` keeps punctuation such as a trailing "?" on the word.
      .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter((token) => token.length > 0)
      .map((token) =>
        token.length >= MIN_LENGTH && /^[a-z]+$/.test(token)
          ? correctWord(token)
          : token,
      )
      .join(" ");
    return corrected !== tokens.join(" ") ? corrected : undefined;
  };
}
