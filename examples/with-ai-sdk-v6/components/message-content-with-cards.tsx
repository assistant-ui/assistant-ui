"use client";

import { Fragment, type FC } from "react";
import {
  useMessage,
  processTextWithInlineElements,
  type InlineElementPrimitive,
} from "@assistant-ui/react";
import { cardRenderer } from "./inline-elements/card-renderer";

// Create registry with card renderer
const inlineElementRegistry: InlineElementPrimitive.Registry = {
  renderers: [cardRenderer],
};

/**
 * Custom message content renderer that processes inline card elements.
 * Works by getting the full text content and processing it for inline elements.
 */
export const MessageContentWithCards: FC = () => {
  const message = useMessage();

  // Get text from message content
  const textParts = message.content.filter((part) => part.type === "text");

  if (textParts.length === 0) {
    return null;
  }

  // Combine all text parts
  const fullText = textParts.map((part) => part.text).join("\n\n");

  // Process with inline elements
  const parts = processTextWithInlineElements(fullText, inlineElementRegistry);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part) => (
        <Fragment key={part.key}>{part.content}</Fragment>
      ))}
    </div>
  );
};
