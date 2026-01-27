"use client";

import { INTERNAL, useMessagePartText } from "@assistant-ui/react";
import { harden } from "rehype-harden";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Streamdown, type StreamdownProps } from "streamdown";
import { type ComponentRef, forwardRef, useMemo } from "react";
import { useAdaptedComponents } from "../adapters/components-adapter";
import { DEFAULT_SHIKI_THEME, mergePlugins } from "../defaults";
import type { SecurityConfig, StreamdownTextPrimitiveProps } from "../types";

const { useSmoothStatus } = INTERNAL;

type StreamdownTextPrimitiveElement = ComponentRef<"div">;

/**
 * Builds rehypePlugins array with security configuration.
 */
function buildSecurityRehypePlugins(
  security: SecurityConfig,
): NonNullable<StreamdownProps["rehypePlugins"]> {
  return [
    rehypeRaw,
    [rehypeSanitize, {}],
    [
      harden,
      {
        allowedImagePrefixes: security.allowedImagePrefixes ?? ["*"],
        allowedLinkPrefixes: security.allowedLinkPrefixes ?? ["*"],
        allowedProtocols: security.allowedProtocols ?? ["*"],
        allowDataImages: security.allowDataImages ?? true,
        defaultOrigin: security.defaultOrigin,
        blockedLinkClass: security.blockedLinkClass,
        blockedImageClass: security.blockedImageClass,
      },
    ],
  ];
}

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

      // streamdown native props (explicitly listed for documentation)
      caret,
      controls,
      linkSafety,
      remend,
      mermaid,
      parseIncompleteMarkdown,
      allowedTags,
      remarkRehypeOptions,
      security,
      BlockComponent,
      parseMarkdownIntoBlocksFn,

      // streamdown props
      mode = "streaming",
      className,
      shikiTheme,
      ...streamdownProps
    },
    ref,
  ) => {
    const { text } = useMessagePartText();
    const status = useSmoothStatus();

    const processedText = useMemo(
      () => (preprocess ? preprocess(text) : text),
      [text, preprocess],
    );

    const resolvedPlugins = useMemo(() => {
      const merged = mergePlugins(userPlugins, {});
      return Object.keys(merged).length > 0 ? merged : undefined;
    }, [userPlugins]);

    const resolvedShikiTheme = useMemo(
      () =>
        shikiTheme ?? (resolvedPlugins?.code ? DEFAULT_SHIKI_THEME : undefined),
      [shikiTheme, resolvedPlugins?.code],
    );

    const adaptedComponents = useAdaptedComponents({
      components,
      componentsByLanguage,
    });

    const mergedComponents = useMemo(() => {
      const {
        SyntaxHighlighter: _,
        CodeHeader: __,
        ...userHtmlComponents
      } = components ?? {};
      return { ...userHtmlComponents, ...adaptedComponents };
    }, [components, adaptedComponents]);

    const containerClass = useMemo(() => {
      const classes = [containerClassName, containerProps?.className]
        .filter(Boolean)
        .join(" ");
      return classes || undefined;
    }, [containerClassName, containerProps?.className]);

    const rehypePlugins = useMemo(
      () => (security ? buildSecurityRehypePlugins(security) : undefined),
      [security],
    );

    const optionalProps = {
      ...(className && { className }),
      ...(caret && { caret }),
      ...(controls !== undefined && { controls }),
      ...(linkSafety && { linkSafety }),
      ...(remend && { remend }),
      ...(mermaid && { mermaid }),
      ...(parseIncompleteMarkdown !== undefined && { parseIncompleteMarkdown }),
      ...(allowedTags && { allowedTags }),
      ...(resolvedPlugins && { plugins: resolvedPlugins }),
      ...(resolvedShikiTheme && { shikiTheme: resolvedShikiTheme }),
      ...(remarkRehypeOptions && { remarkRehypeOptions }),
      ...(rehypePlugins && { rehypePlugins }),
      ...(BlockComponent && { BlockComponent }),
      ...(parseMarkdownIntoBlocksFn && { parseMarkdownIntoBlocksFn }),
    };

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
          {...optionalProps}
          {...streamdownProps}
        >
          {processedText}
        </Streamdown>
      </div>
    );
  },
);

StreamdownTextPrimitive.displayName = "StreamdownTextPrimitive";
