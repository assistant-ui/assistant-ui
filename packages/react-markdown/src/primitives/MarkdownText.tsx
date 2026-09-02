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
  useDeferredValue,
  useMemo,
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

type MarkdownRendererProps = Omit<Options, "children"> & { text: string };

const MarkdownRenderer: FC<MarkdownRendererProps> = ({ text, ...options }) => (
  <ReactMarkdown {...options}>{text}</ReactMarkdown>
);

// `useDeferredValue` schedules a second render pass whenever its input changes,
// so the deferred path lives in its own component and `defer={false}` never
// mounts it.
const DeferredMarkdownRenderer: FC<MarkdownRendererProps> = ({
  text,
  ...options
}) => {
  const deferredText = useDeferredValue(text);
  return <ReactMarkdown {...options}>{deferredText}</ReactMarkdown>;
};

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

  const components: Options["components"] = useMemo(() => {
    const { pre, code, SyntaxHighlighter, CodeHeader, ...componentsRest } =
      userComponents ?? {};
    return {
      ...componentsRest,
      pre: PreComponentWithFallback,
      code: CodeComponent,
    };
  }, [CodeComponent, PreComponentWithFallback, userComponents]);

  const Renderer = defer ? DeferredMarkdownRenderer : MarkdownRenderer;

  return <Renderer text={text} components={components} {...rest} />;
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
