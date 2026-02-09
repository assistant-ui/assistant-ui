import type { ReactNode } from "react";

/**
 * Represents a match found in text for an inline element.
 *
 * @template TPayload - The type of data associated with this match
 */
export interface InlineElementMatch<TPayload = unknown> {
  /** The start position of the match in the text */
  index: number;
  /** The length of the matched text */
  length: number;
  /** Type-safe payload data for rendering */
  payload: TPayload;
  /** Human-readable text to display for this element */
  displayText: string;
}

/**
 * Defines how to find and render inline elements in text.
 *
 * @template TPayload - The type of data associated with matches from this renderer
 *
 * @example
 * ```typescript
 * interface CitationPayload {
 *   documentId: string;
 *   pageNumber?: number;
 * }
 *
 * const citationRenderer: InlineElementRenderer<CitationPayload> = {
 *   type: 'citation',
 *   match: (text) => {
 *     // Find all [doc:id] or [doc:id:p5] tokens
 *     const regex = /\[doc:([^:]+)(?::p(\d+))?\]/g;
 *     const matches: InlineElementMatch<CitationPayload>[] = [];
 *     let match;
 *
 *     while ((match = regex.exec(text)) !== null) {
 *       matches.push({
 *         index: match.index,
 *         length: match[0].length,
 *         payload: {
 *           documentId: match[1],
 *           pageNumber: match[2] ? parseInt(match[2]) : undefined,
 *         },
 *         displayText: `Doc ${match[1]}`,
 *       });
 *     }
 *
 *     return matches;
 *   },
 *   render: ({ payload, displayText }) => (
 *     <a href={`/docs/${payload.documentId}`}>{displayText}</a>
 *   ),
 * };
 * ```
 */
export interface InlineElementRenderer<TPayload = unknown> {
  /** Unique identifier for this renderer type */
  type: string;
  /**
   * Find all matches of this inline element type in the given text.
   *
   * @param text - The text to search for matches
   * @returns Array of matches with their positions and payloads
   */
  match: (text: string) => InlineElementMatch<TPayload>[];
  /**
   * Render a matched inline element.
   *
   * @param props - The payload and display text for this match
   * @returns React element to render
   */
  render: (props: { payload: TPayload; displayText: string }) => ReactNode;
}

/**
 * A collection of inline element renderers.
 *
 * @example
 * ```typescript
 * const registry: InlineElementRegistry = {
 *   renderers: [citationRenderer, cardRenderer],
 * };
 * ```
 */
export interface InlineElementRegistry {
  /** Array of renderers to use for processing text */
  renderers: InlineElementRenderer<any>[];
}
