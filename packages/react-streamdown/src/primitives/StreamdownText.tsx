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
  useMemo,
} from "react";
import { CodeAdapterContext } from "../adapters/code-adapter";
import { useAdaptedComponents } from "../adapters/components-adapter";
import { DEFAULT_SHIKI_THEME, mergePlugins } from "../defaults";
import { tailBoundedRemend } from "../remend";
import { useStableProps } from "../useStableProps";
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

// Streamdown clears the clobber prefix, so an `id` or `name` from model output
// would land on the element as written and could shadow properties of
// `document`. Every id and name gets this prefix, and so does every in-page
// `#fragment` link, so links to them keep working.
const CLOBBER_PREFIX = "user-content-";

const streamdownSanitizeSchema: SanitizeSchema = {
  ...((Array.isArray(sanitizeEntry)
    ? sanitizeEntry[1]
    : defaultSchema) as SanitizeSchema),
  clobberPrefix: CLOBBER_PREFIX,
};

const CLOBBERED_PROPERTIES = [
  "id",
  "name",
  "ariaDescribedBy",
  "ariaLabelledBy",
] as const;

type HastNode = {
  type: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HastElement = HastNode & {
  tagName?: string;
  properties: Record<string, unknown>;
};

const isElement = (node: HastNode): node is HastElement =>
  node.type === "element" && node.properties !== undefined;

const withoutPrefix = (value: unknown) =>
  typeof value === "string" && value.startsWith(CLOBBER_PREFIX)
    ? value.slice(CLOBBER_PREFIX.length)
    : value;

const withPrefix = (value: unknown) =>
  typeof value === "string" && value !== "" && !value.startsWith(CLOBBER_PREFIX)
    ? CLOBBER_PREFIX + value
    : value;

const mapClobbered = (
  properties: Record<string, unknown>,
  map: (value: unknown) => unknown,
) => {
  for (const key of CLOBBERED_PROPERTIES) {
    const value = properties[key];
    if (value === undefined) continue;
    properties[key] = Array.isArray(value) ? value.map(map) : map(value);
  }
};

// remark-rehype prefixes the footnote ids it generates, and the links to them,
// before the sanitize step prefixes every id again. This runs before
// rehype-raw, so it sees only remark's footnote elements, never raw HTML from
// the model, and leaves them for the sanitize step to prefix once.
const unprefixFootnotes = () => (tree: HastNode) => {
  const walk = (node: HastNode, inFootnotes: boolean) => {
    let inside = inFootnotes;
    if (isElement(node)) {
      const { properties } = node;
      const isReference =
        properties["dataFootnoteRef"] !== undefined ||
        properties["dataFootnoteBackref"] !== undefined;
      if (isReference || (inFootnotes && node.tagName === "li")) {
        mapClobbered(properties, withoutPrefix);
      }
      const href = properties["href"];
      if (isReference && typeof href === "string" && href.startsWith("#")) {
        properties["href"] = `#${withoutPrefix(href.slice(1))}`;
      }
      if (properties["dataFootnotes"] !== undefined) inside = true;
    }
    node.children?.forEach((child) => walk(child, inside));
  };
  walk(tree, false);
};

// Runs after every other plugin, including the caller's. Ids a later plugin
// adds (rehype-slug, say) get the prefix too, and every in-page link gets it
// exactly once, so links still reach their targets and no id or name from
// any source lands unprefixed.
const normalizeClobberPrefix = () => (tree: HastNode) => {
  const walk = (node: HastNode) => {
    if (isElement(node)) {
      mapClobbered(node.properties, withPrefix);
      const href = node.properties["href"];
      if (typeof href === "string" && href.length > 1 && href.startsWith("#")) {
        node.properties["href"] = `#${CLOBBER_PREFIX}${href.slice(1)}`;
      }
    }
    node.children?.forEach(walk);
  };
  walk(tree);
};

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
    unprefixFootnotes,
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

    const { text: revealedText, status } = useSmooth(messagePart, smooth);

    // Smoothing tracks what it has already revealed and restarts from empty when
    // the text it receives stops extending that prefix. A preprocess rewrite
    // fires on a closing token and so rewrites already-revealed characters, so it
    // runs on the revealed text rather than ahead of the reveal.
    const text = useMemo(
      () => (preprocess ? preprocess(revealedText) : revealedText),
      [preprocess, revealedText],
    );

    const repairDisabled =
      parseIncompleteMarkdown === false || status.type === "complete";
    const shouldTailRemend =
      mode === "streaming" && !repairDisabled && !parseMarkdownIntoBlocksFn;
    const resolvedParseIncomplete =
      repairDisabled || shouldTailRemend ? false : parseIncompleteMarkdown;

    const resolvedPlugins = useMemo(() => {
      const merged = mergePlugins(userPlugins);
      return Object.keys(merged).length > 0 ? merged : undefined;
    }, [userPlugins]);

    const resolvedShikiTheme = useMemo(
      () =>
        shikiTheme ?? (resolvedPlugins?.code ? DEFAULT_SHIKI_THEME : undefined),
      [shikiTheme, resolvedPlugins?.code],
    );

    // The documented usage of `components` is an inline object literal, so the
    // adapted map is stabilized here; a fresh identity would defeat the
    // memoized body.
    const adapted = useAdaptedComponents({ components, componentsByLanguage });
    const mergedComponents = useStableProps(adapted.components);

    const containerClass = useMemo(() => {
      const classes = [containerClassName, containerProps?.className]
        .filter(Boolean)
        .join(" ");
      return classes || undefined;
    }, [containerClassName, containerProps?.className]);

    // The sanitize pipeline always runs first: custom plugins extend it rather
    // than replace it, and without `security` it uses Streamdown's allow-all
    // URL policy.
    // Inline `security`, `allowedTags` and `rehypePlugins` values are fresh
    // every render, so the pipeline is keyed on their content and the merged
    // list keeps its entries' identities; otherwise the memoized body would
    // re-parse on every render.
    const securityKey = JSON.stringify([security ?? {}, allowedTags ?? null]);
    const securityPlugins = useMemo(
      () => buildSecurityRehypePlugins(security ?? {}, allowedTags),
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- securityKey is the content of security and allowedTags
      [securityKey],
    );
    const rehypePlugins = useMemo(
      () => [
        ...securityPlugins,
        ...(userRehypePlugins ?? []),
        normalizeClobberPrefix,
      ],
      [securityPlugins, userRehypePlugins],
    );

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
      rehypePlugins,
      ...(BlockComponent && { BlockComponent }),
      ...(parseMarkdownIntoBlocksFn && { parseMarkdownIntoBlocksFn }),
    };

    const Body = defer ? DeferredStreamdownBody : MemoizedStreamdownBody;
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
        <CodeAdapterContext.Provider value={adapted.codeAdapter}>
          <Body
            text={text}
            shouldTailRemend={shouldTailRemend}
            remendConfig={bodyProps.remend}
            mode={mode}
            isAnimating={status.type === "running"}
            components={mergedComponents}
            {...bodyProps}
          />
        </CodeAdapterContext.Provider>
      </div>
    );
  },
);

StreamdownTextPrimitive.displayName = "StreamdownTextPrimitive";
