"use client";

import { INTERNAL, useMessagePartText } from "@assistant-ui/react";
import { Streamdown } from "streamdown";
import { type ComponentRef, forwardRef, useMemo } from "react";
import { useAdaptedComponents } from "../adapters/components-adapter";
import { DEFAULT_SHIKI_THEME, mergePlugins } from "../defaults";
import type { StreamdownTextPrimitiveProps } from "../types";

const { useSmoothStatus } = INTERNAL;

type StreamdownTextPrimitiveElement = ComponentRef<"div">;

/**
 * A primitive component for rendering markdown text using Streamdown.
 *
 * Streamdown is optimized for AI-powered streaming with features like:
 * - Block-based rendering for better streaming performance
 * - Incomplete markdown handling via remend
 * - Built-in syntax highlighting via Shiki
 * - Math, Mermaid, and CJK support via plugins
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StreamdownTextPrimitive />
 *
 * // With plugins
 * import { code } from "@streamdown/code";
 * import { math } from "@streamdown/math";
 *
 * <StreamdownTextPrimitive
 *   plugins={{ code, math }}
 *   shikiTheme={["github-light", "github-dark"]}
 * />
 *
 * // Disable a specific plugin
 * <StreamdownTextPrimitive plugins={{ code: false }} />
 *
 * // Migration from react-markdown (compatibility mode)
 * <StreamdownTextPrimitive
 *   components={{
 *     SyntaxHighlighter: MySyntaxHighlighter,
 *     CodeHeader: MyCodeHeader,
 *   }}
 *   componentsByLanguage={{
 *     mermaid: { SyntaxHighlighter: MermaidRenderer }
 *   }}
 * />
 * ```
 */
export const StreamdownTextPrimitive = forwardRef<
  StreamdownTextPrimitiveElement,
  StreamdownTextPrimitiveProps
>(
  (
    {
      // assistant-ui compatibility props
      components,
      componentsByLanguage,
      preprocess,

      // plugin configuration
      plugins: userPlugins,

      // container props
      containerProps,
      containerClassName,

      // streamdown props
      mode = "streaming",
      className,
      shikiTheme,
      ...streamdownProps
    },
    ref,
  ) => {
    // Get message part text from context
    const { text } = useMessagePartText();

    // Get smooth status to determine if streaming
    const status = useSmoothStatus();

    // Preprocess text if function provided
    const processedText = useMemo(() => {
      if (!preprocess) return text;
      return preprocess(text);
    }, [text, preprocess]);

    // Merge user plugins (filter out false values)
    const resolvedPlugins = useMemo(() => {
      const merged = mergePlugins(userPlugins, {});
      return Object.keys(merged).length > 0 ? merged : undefined;
    }, [userPlugins]);

    // Use default shiki theme if code plugin is active and no theme provided
    const resolvedShikiTheme = useMemo(() => {
      if (shikiTheme) return shikiTheme;
      if (resolvedPlugins?.code) return DEFAULT_SHIKI_THEME;
      return undefined;
    }, [shikiTheme, resolvedPlugins?.code]);

    // Adapt components API (SyntaxHighlighter, CodeHeader, componentsByLanguage)
    const adaptedComponents = useAdaptedComponents({
      components,
      componentsByLanguage,
    });

    // Merge user components with adapted ones
    const mergedComponents = useMemo(() => {
      const {
        SyntaxHighlighter: _,
        CodeHeader: __,
        ...userHtmlComponents
      } = components ?? {};

      if (!adaptedComponents && Object.keys(userHtmlComponents).length === 0) {
        return undefined;
      }

      return {
        ...userHtmlComponents,
        ...adaptedComponents,
      };
    }, [components, adaptedComponents]);

    // Merge container class names
    const containerClass =
      [containerClassName, containerProps?.className]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div
        ref={ref}
        data-status={status.type}
        {...containerProps}
        className={containerClass}
      >
        <Streamdown
          mode={mode}
          isAnimating={status.type === "running"}
          components={mergedComponents}
          className={className}
          plugins={resolvedPlugins}
          shikiTheme={resolvedShikiTheme}
          {...streamdownProps}
        >
          {processedText}
        </Streamdown>
      </div>
    );
  },
);

StreamdownTextPrimitive.displayName = "StreamdownTextPrimitive";
