"use client";

import { Fragment, type ReactNode } from "react";
import {
  processTextWithInlineElements,
  type InlineElementPrimitive,
  useMessagePartText,
} from "@assistant-ui/react";
import { cardRenderer } from "./card-renderer";

// Create registry with card renderer
const inlineElementRegistry: InlineElementPrimitive.Registry = {
  renderers: [cardRenderer],
};

/**
 * Custom Text component that processes inline elements.
 *
 * This component replaces the default Text component and processes
 * special inline element syntax like %(text)[{type: "card", data: {...}}]
 */
export function TextWithInlineElements() {
  const text = useMessagePartText();

  // Handle empty/null text
  if (!text) {
    return null;
  }

  // Process text with inline element renderers
  const parts = processTextWithInlineElements(text, inlineElementRegistry);

  // Ensure we only render valid React children
  return (
    <>
      {parts.map((part) => {
        const content = part.content;
        // Only render if content is a valid React child (string, number, or ReactNode)
        if (
          typeof content === "string" ||
          typeof content === "number" ||
          content === null ||
          content === undefined
        ) {
          return <Fragment key={part.key}>{content}</Fragment>;
        }
        // For ReactNode elements
        return <Fragment key={part.key}>{content as ReactNode}</Fragment>;
      })}
    </>
  );
}
