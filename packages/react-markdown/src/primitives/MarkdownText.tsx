"use client";

import {
  INTERNAL,
  type SmoothOptions,
  useMessagePartText,
} from "@assistant-ui/react";
import {
  type ComponentRef,
  type ElementType,
  type FC,
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  memo,
  useDeferredValue,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import type {
  SyntaxHighlighterProps,
  CodeHeaderProps,
} from "../overrides/types";
import type { ComponentsByLanguage } from "../code-fence";
import { PreOverride } from "../overrides/PreOverride";
import {
  DefaultPre,
  DefaultCode,
  DefaultCodeBlockContent,
  DefaultCodeHeader,
} from "../overrides/defaultComponents";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { CodeOverride } from "../overrides/CodeOverride";
import type { Primitive } from "@radix-ui/react-primitive";
import classNames from "classnames";

const { useSmooth, useSmoothStatus, withSmoothContextProvider } = INTERNAL;

type MarkdownRendererProps = Omit<Options, "children"> & {
  text: string;
  /**
   * Carried only so the memo below can see it. The code override reaches the
   * tree through an identity-stable callback, so a change to any value it
   * closes over moves no other prop.
   */
  overrideVersion?: unknown;
};

// react-markdown builds a fresh processor and parses the whole accumulated text
// on every render, so a render that carries text it has already parsed is pure
// waste. The renderer is memoized to make that bail out, which only holds while
// its props keep their identity; useStableProps is what keeps a caller's inline
// plugin array from breaking it.
const MarkdownRenderer: FC<MarkdownRendererProps> = memo(
  ({ text, overrideVersion: _overrideVersion, ...options }) => (
    <ReactMarkdown {...options}>{text}</ReactMarkdown>
  ),
);
MarkdownRenderer.displayName = "MarkdownRenderer";

// `useDeferredValue` schedules a second render pass whenever its input changes,
// so the deferred path lives in its own component and `defer={false}` never
// mounts it. The urgent pass of that pair carries the previous text, which the
// memoized renderer above turns into a bail-out rather than a second parse.
const DeferredMarkdownRenderer: FC<MarkdownRendererProps> = ({
  text,
  ...options
}) => {
  const deferredText = useDeferredValue(text);
  return <MarkdownRenderer text={deferredText} {...options} />;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Compares two values structurally to `depth` levels, then by identity. One
 * level covers an inline `remarkPlugins={[remarkGfm]}`; two covers an inline
 * `componentsByLanguage={{ mermaid: { SyntaxHighlighter } }}`, which is the
 * shape the guides teach.
 */
const isShallowEqual = (a: unknown, b: unknown, depth = 1): boolean => {
  if (Object.is(a, b)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, i) => isShallowEqual(item, b[i], depth - 1))
    );
  }

  if (isPlainObject(a) && isPlainObject(b)) {
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

/** Keeps the identity of a value whose contents are unchanged to `depth`. */
function useStableValue<T>(value: T, depth: number): T {
  const previous = useRef(value);
  if (!isShallowEqual(value, previous.current, depth)) previous.current = value;
  return previous.current;
}

/**
 * Keeps the object identity of props whose values did not change, comparing one
 * array level so that an inline `remarkPlugins={[remarkGfm]}` still hits the
 * renderer's memo. A plugin array mutated in place keeps the old identity and is
 * not observed.
 */
function useStableProps<T extends object>(props: T): T {
  const previous = useRef(props);
  const read = (source: T, key: string) =>
    (source as Record<string, unknown>)[key];
  const keys = Object.keys(props);
  const previousKeys = Object.keys(previous.current);

  const unchanged =
    keys.length === previousKeys.length &&
    keys.every(
      (key) =>
        Object.hasOwn(previous.current, key) &&
        isShallowEqual(read(props, key), read(previous.current, key)),
    );

  if (!unchanged) previous.current = props;
  return previous.current;
}

type MarkdownTextPrimitiveElement = ComponentRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export type MarkdownTextPrimitiveProps = Omit<
  Options,
  "components" | "children"
> & {
  className?: string | undefined;
  containerProps?: Omit<PrimitiveDivProps, "children" | "asChild"> | undefined;
  containerComponent?: ElementType | undefined;
  components?:
    | (NonNullable<Options["components"]> & {
        SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
        CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
      })
    | undefined;
  /**
   * Language-specific component overrides.
   * @example { mermaid: { SyntaxHighlighter: MermaidDiagram } }
   */
  componentsByLanguage?: ComponentsByLanguage | undefined;
  /**
   * Whether to enable smooth text streaming animation.
   * When enabled, text appears with a typing effect as it streams in.
   * Pass a `SmoothOptions` object to tune the reveal rate.
   * Auto-disables under `prefers-reduced-motion: reduce`.
   * @default true
   */
  smooth?: boolean | SmoothOptions | undefined;
  /**
   * Defers markdown parsing and rendering to a lower priority via React's
   * `useDeferredValue`, so urgent work (typing, scrolling) is not blocked by
   * re-parsing the growing message on every streamed token. Intermediate
   * streaming states may be skipped under load; the final text always renders.
   *
   * Must stay constant for the lifetime of the component: the deferred path is
   * a separate component, so toggling this remounts the rendered markdown.
   *
   * @default false
   */
  defer?: boolean | undefined;
  /**
   * Function to transform text before markdown processing.
   */
  preprocess?: (text: string) => string;
};

const MarkdownTextInner: FC<MarkdownTextPrimitiveProps> = ({
  components: userComponents,
  componentsByLanguage,
  smooth = true,
  defer = false,
  preprocess,
  ...rest
}) => {
  const messagePartText = useMessagePartText();

  const processedMessagePart = useMemo(() => {
    if (!preprocess) return messagePartText;

    return {
      ...messagePartText,
      text: preprocess(messagePartText.text),
    };
  }, [messagePartText, preprocess]);

  const { text } = useSmooth(processedMessagePart, smooth);

  const {
    pre = DefaultPre,
    code = DefaultCode,
    SyntaxHighlighter = DefaultCodeBlockContent,
    CodeHeader = DefaultCodeHeader,
  } = userComponents ?? {};
  const useCodeOverrideComponents = useMemo(() => {
    return {
      Pre: pre,
      Code: code,
      SyntaxHighlighter,
      CodeHeader,
    };
  }, [pre, code, SyntaxHighlighter, CodeHeader]);
  const CodeComponent = useCallbackRef((props) => (
    <CodeOverride
      components={useCodeOverrideComponents}
      componentsByLanguage={componentsByLanguage}
      {...props}
    />
  ));

  const PreComponentWithFallback = useCallbackRef((props) => (
    <PreOverride fallbackPre={pre} {...props} />
  ));

  // An inline `components={{ h1: MyH1 }}` is a fresh object on every render, so
  // the merged map is stabilized here; without it the renderer sees a new prop
  // identity every render and its memo never bails out.
  const components: Options["components"] = useStableProps(
    useMemo(() => {
      const { pre, code, SyntaxHighlighter, CodeHeader, ...componentsRest } =
        userComponents ?? {};
      return {
        ...componentsRest,
        pre: PreComponentWithFallback,
        code: CodeComponent,
      };
    }, [CodeComponent, PreComponentWithFallback, userComponents]),
  );

  const overrideVersion = useStableValue(
    useMemo(
      () => ({ components: useCodeOverrideComponents, componentsByLanguage }),
      [useCodeOverrideComponents, componentsByLanguage],
    ),
    3,
  );

  const Renderer = defer ? DeferredMarkdownRenderer : MarkdownRenderer;
  const stableRest = useStableProps(rest);

  return (
    <Renderer
      text={text}
      components={components}
      overrideVersion={overrideVersion}
      {...stableRest}
    />
  );
};

const MarkdownTextPrimitiveImpl: ForwardRefExoticComponent<MarkdownTextPrimitiveProps> &
  RefAttributes<MarkdownTextPrimitiveElement> = forwardRef<
  MarkdownTextPrimitiveElement,
  MarkdownTextPrimitiveProps
>(
  (
    {
      className,
      containerProps,
      containerComponent: Container = "div",
      ...rest
    },
    forwardedRef,
  ) => {
    const status = useSmoothStatus();
    return (
      <Container
        data-status={status.type}
        {...containerProps}
        className={classNames(className, containerProps?.className)}
        ref={forwardedRef}
      >
        <MarkdownTextInner {...rest}></MarkdownTextInner>
      </Container>
    );
  },
);

MarkdownTextPrimitiveImpl.displayName = "MarkdownTextPrimitive";

export const MarkdownTextPrimitive = withSmoothContextProvider(
  MarkdownTextPrimitiveImpl,
);
