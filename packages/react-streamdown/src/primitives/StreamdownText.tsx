"use client";

import { useMessagePartText, useSmooth } from "@assistant-ui/react";
import { harden } from "rehype-harden";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from "rehype-sanitize";
import {
  Streamdown,
  defaultRehypePlugins,
  type StreamdownProps,
} from "streamdown";
import {
  type ComponentRef,
  type FC,
  forwardRef,
  memo,
  useDeferredValue,
  useRef,
  useMemo,
} from "react";
import { useAdaptedComponents } from "../adapters/components-adapter";
import { DEFAULT_SHIKI_THEME, mergePlugins } from "../defaults";
import { tailBoundedRemend } from "../remend";
import type {
  AllowedTags,
  RemendConfig,
  SecurityConfig,
  StreamdownTextPrimitiveProps,
} from "../types";

type StreamdownTextPrimitiveElement = ComponentRef<"div">;

type StreamdownBodyProps = Omit<StreamdownProps, "children"> & {
  text: string;
  shouldTailRemend: boolean;
  remendConfig: RemendConfig | undefined;
};

const useRepairedText = (
  text: string,
  shouldTailRemend: boolean,
  remendConfig: RemendConfig | undefined,
) =>
  useMemo(
    () => (shouldTailRemend ? tailBoundedRemend(text, remendConfig) : text),
    [shouldTailRemend, text, remendConfig],
  );

const StreamdownBody: FC<StreamdownBodyProps> = ({
  text,
  shouldTailRemend,
  remendConfig,
  ...props
}) => {
  const repairedText = useRepairedText(text, shouldTailRemend, remendConfig);
  return <Streamdown {...props}>{repairedText}</Streamdown>;
};

const isShallowEqual = (a: unknown, b: unknown, depth = 1): boolean => {
  if (Object.is(a, b)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, i) => isShallowEqual(item, b[i], depth - 1))
    );
  }

  const plain = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  if (plain(a) && plain(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every(
        (key) =>
          Object.hasOwn(b, key) && isShallowEqual(a[key], b[key], depth - 1),
      )
    );
  }

  return false;
};

/**
 * Keeps the identity of props whose contents are unchanged, comparing one array
 * or object level so that an inline `remarkPlugins={[plugin]}` still reaches the
 * memoized body. A value mutated in place keeps the old identity and is not
 * observed.
 */
function useStableProps<T extends object>(props: T): T {
  const previous = useRef(props);
  if (!isShallowEqual(props, previous.current, 2)) previous.current = props;
  return previous.current;
}

// Streamdown reparses the whole accumulated text on every render, so the urgent
// pass of a deferred pair would parse text the previous commit already parsed.
// Memoizing the body turns that pass into a bail-out.
const MemoizedStreamdownBody: FC<StreamdownBodyProps> = memo(
  ({ text, shouldTailRemend, remendConfig, ...props }) => {
    const repairedText = useRepairedText(text, shouldTailRemend, remendConfig);
    return <Streamdown {...props}>{repairedText}</Streamdown>;
  },
);
MemoizedStreamdownBody.displayName = "MemoizedStreamdownBody";

// `useDeferredValue` schedules a second render pass whenever its input changes,
// so the deferred path lives in its own component and `defer={false}` never
// mounts it. The repair stays below the deferral so it runs in the deferred
// pass rather than on the urgent one.
const DeferredStreamdownBody: FC<StreamdownBodyProps> = ({
  text,
  shouldTailRemend,
  remendConfig,
  ...props
}) => {
  const deferredText = useDeferredValue(text);
  return (
    <MemoizedStreamdownBody
      text={deferredText}
      shouldTailRemend={shouldTailRemend}
      remendConfig={remendConfig}
      {...props}
    />
  );
};

// Streamdown extends the default sanitize schema without exporting it, so it is
// read back off its own plugin set; a copy would fall behind on a bump. An
// unrecognized shape falls back to that default, which hast-util-sanitize
// shallow-merges, so a partial schema here would strip every unlisted tag.
const sanitizeEntry: unknown = defaultRehypePlugins["sanitize"];
const streamdownSanitizeSchema = (
  Array.isArray(sanitizeEntry) ? sanitizeEntry[1] : defaultSchema
) as SanitizeSchema;

function buildSecuritySanitizeSchema(
  allowedTags: AllowedTags | undefined,
): SanitizeSchema {
  if (!allowedTags || Object.keys(allowedTags).length === 0) {
    return streamdownSanitizeSchema;
  }

  return {
    ...streamdownSanitizeSchema,
    tagNames: [
      ...(streamdownSanitizeSchema.tagNames ?? []),
      ...Object.keys(allowedTags),
    ],
    attributes: {
      ...streamdownSanitizeSchema.attributes,
      ...allowedTags,
    },
  };
}

function buildSecurityRehypePlugins(
  security: SecurityConfig,
  allowedTags: AllowedTags | undefined,
): NonNullable<StreamdownProps["rehypePlugins"]> {
  return [
    rehypeRaw,
    [rehypeSanitize, buildSecuritySanitizeSchema(allowedTags)],
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
      defer = false,
      smooth = false,

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
      rehypePlugins: userRehypePlugins,
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
    const messagePart = useMessagePartText();

    const processedPart = useMemo(
      () =>
        preprocess
          ? { ...messagePart, text: preprocess(messagePart.text) }
          : messagePart,
      [messagePart, preprocess],
    );

    const { text, status } = useSmooth(processedPart, smooth);

    const shouldTailRemend =
      mode === "streaming" &&
      parseIncompleteMarkdown !== false &&
      !parseMarkdownIntoBlocksFn;
    const resolvedParseIncomplete = shouldTailRemend
      ? false
      : parseIncompleteMarkdown;

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

    const rehypePlugins = useMemo(() => {
      if (!security) return userRehypePlugins;
      return [
        ...buildSecurityRehypePlugins(security, allowedTags),
        ...(userRehypePlugins ?? []),
      ];
    }, [allowedTags, security, userRehypePlugins]);

    const optionalProps = {
      ...(className && { className }),
      ...(caret && { caret }),
      ...(controls !== undefined && { controls }),
      ...(linkSafety && { linkSafety }),
      ...(remend && { remend }),
      ...(mermaid && { mermaid }),
      ...(resolvedParseIncomplete !== undefined && {
        parseIncompleteMarkdown: resolvedParseIncomplete,
      }),
      ...(allowedTags && { allowedTags }),
      ...(resolvedPlugins && { plugins: resolvedPlugins }),
      ...(resolvedShikiTheme && { shikiTheme: resolvedShikiTheme }),
      ...(remarkRehypeOptions && { remarkRehypeOptions }),
      ...(rehypePlugins && { rehypePlugins }),
      ...(BlockComponent && { BlockComponent }),
      ...(parseMarkdownIntoBlocksFn && { parseMarkdownIntoBlocksFn }),
    };

    const Body = defer ? DeferredStreamdownBody : StreamdownBody;
    // An inline option object is a fresh value every render, which would give
    // the memoized body a new prop identity and defeat its bail-out.
    const bodyProps = useStableProps({
      ...optionalProps,
      ...streamdownProps,
    });

    return (
      <div
        ref={ref}
        data-status={status.type}
        {...containerProps}
        className={containerClass}
      >
        <Body
          text={text}
          shouldTailRemend={shouldTailRemend}
          remendConfig={remend}
          mode={mode}
          isAnimating={status.type === "running"}
          components={mergedComponents}
          {...bodyProps}
        />
      </div>
    );
  },
);

StreamdownTextPrimitive.displayName = "StreamdownTextPrimitive";
