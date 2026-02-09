"use client";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import { createInlineElementMarkdownComponents } from "@assistant-ui/react";
import { cardRenderer } from "./inline-elements/card-renderer";
import type { FC } from "react";

// Create registry with card renderer
const registry = {
  renderers: [cardRenderer],
};

// Create markdown components with inline element support
const components = unstable_memoizeMarkdownComponents({
  ...createInlineElementMarkdownComponents(registry),
});

/**
 * Markdown text component with inline card support
 */
export const MarkdownWithCards: FC = () => {
  return <MarkdownTextPrimitive components={components} />;
};
