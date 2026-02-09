"use client";

import type { ComponentProps, ReactNode } from "react";
import { Fragment } from "react";
import type { InlineElementRegistry } from "./types";
import { processTextWithInlineElements } from "./processTextWithInlineElements";

/**
 * Process React children, applying inline element rendering to string children.
 */
const processChildren = (
  children: ReactNode,
  registry: InlineElementRegistry,
): ReactNode => {
  if (!children) return children;

  if (typeof children === "string") {
    const parts = processTextWithInlineElements(children, registry);
    if (parts.length === 1 && typeof parts[0]?.content === "string") {
      return parts[0].content;
    }
    return parts.map((part) => (
      <Fragment key={part.key}>{part.content}</Fragment>
    ));
  }

  if (Array.isArray(children)) {
    return children.map((child, index) =>
      typeof child === "string" ? (
        <Fragment key={index}>{processChildren(child, registry)}</Fragment>
      ) : (
        child
      ),
    );
  }

  return children;
};

/**
 * Create markdown component overrides that process text with inline elements.
 *
 * Use with `@assistant-ui/react-markdown`'s `MarkdownTextPrimitive` component.
 *
 * @param registry - The inline element registry to use for processing text
 *
 * @example
 * ```tsx
 * import { MarkdownTextPrimitive, unstable_memoizeMarkdownComponents } from "@assistant-ui/react-markdown";
 * import { createInlineElementMarkdownComponents } from "@assistant-ui/react";
 *
 * const registry = {
 *   renderers: [citationRenderer, cardRenderer],
 * };
 *
 * const components = unstable_memoizeMarkdownComponents({
 *   ...createInlineElementMarkdownComponents(registry),
 *   // other custom components...
 * });
 *
 * const MyMarkdownText = () => {
 *   return <MarkdownTextPrimitive components={components} />;
 * };
 * ```
 */
export function createInlineElementMarkdownComponents(
  registry: InlineElementRegistry,
) {
  return {
    p: ({ children, ...props }: ComponentProps<"p">) => (
      <p {...props}>{processChildren(children, registry)}</p>
    ),
    li: ({ children, ...props }: ComponentProps<"li">) => (
      <li {...props}>{processChildren(children, registry)}</li>
    ),
    td: ({ children, ...props }: ComponentProps<"td">) => (
      <td {...props}>{processChildren(children, registry)}</td>
    ),
    th: ({ children, ...props }: ComponentProps<"th">) => (
      <th {...props}>{processChildren(children, registry)}</th>
    ),
  };
}
