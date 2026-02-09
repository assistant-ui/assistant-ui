import type { ReactNode } from "react";
import type {
  InlineElementRegistry,
  InlineElementMatch,
  InlineElementRenderer,
} from "./types";

/**
 * A processed part of text - either plain text or a rendered inline element.
 */
export interface ProcessedTextPart {
  /** The type of this part */
  type: "text" | "element";
  /** The content - a string for text parts, a ReactNode for element parts */
  content: string | ReactNode;
  /** Unique key for React rendering */
  key: string;
}

/**
 * Process text with inline element renderers.
 *
 * Finds all matches from all renderers, resolves conflicts (first wins),
 * and returns an array of text/element parts ready to render.
 *
 * **Conflict Resolution:**
 * - Matches are sorted by position (earliest first)
 * - At the same position, longer matches are preferred
 * - Overlapping matches are skipped (first wins)
 *
 * @param text - The text to process
 * @param registry - Registry of inline element renderers (optional)
 * @returns Array of parts (text or elements) with keys for React rendering
 *
 * @example
 * ```tsx
 * import { processTextWithInlineElements } from "@assistant-ui/react";
 * import { Fragment } from "react";
 *
 * const MyTextComponent = () => {
 *   const text = useMessagePartText();
 *
 *   const registry = {
 *     renderers: [citationRenderer, cardRenderer],
 *   };
 *
 *   const parts = processTextWithInlineElements(text, registry);
 *
 *   return (
 *     <p>
 *       {parts.map(p => <Fragment key={p.key}>{p.content}</Fragment>)}
 *     </p>
 *   );
 * };
 * ```
 */
export function processTextWithInlineElements(
  text: string,
  registry: InlineElementRegistry | undefined,
): ProcessedTextPart[] {
  if (!registry || registry.renderers.length === 0) {
    return [{ type: "text", content: text, key: "0" }];
  }

  // Collect all matches from all renderers
  const allMatches: Array<
    InlineElementMatch & { renderer: InlineElementRenderer }
  > = [];

  for (const renderer of registry.renderers) {
    const matches = renderer.match(text);
    for (const match of matches) {
      allMatches.push({ ...match, renderer });
    }
  }

  // Sort matches by index (earliest first), then by length (longest first for same position)
  allMatches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.length - a.length; // Prefer longer matches at same position
  });

  // Filter out overlapping matches (first wins)
  const nonOverlappingMatches: typeof allMatches = [];
  let lastEndIndex = 0;

  for (const match of allMatches) {
    // Skip if this match overlaps with previous match
    if (match.index < lastEndIndex) continue;

    nonOverlappingMatches.push(match);
    lastEndIndex = match.index + match.length;
  }

  // If no matches found, return text as-is
  if (nonOverlappingMatches.length === 0) {
    return [{ type: "text", content: text, key: "0" }];
  }

  // Build parts array
  const parts: ProcessedTextPart[] = [];
  let lastIndex = 0;
  let partKey = 0;

  for (const match of nonOverlappingMatches) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
        key: `text-${partKey++}`,
      });
    }

    // Add rendered element
    parts.push({
      type: "element",
      content: match.renderer.render({
        payload: match.payload,
        displayText: match.displayText,
      }),
      key: `element-${partKey++}`,
    });

    lastIndex = match.index + match.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
      key: `text-${partKey++}`,
    });
  }

  return parts;
}
