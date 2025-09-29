"use client";

import { INTERNAL, useMessagePartText } from "@assistant-ui/react";
import {
  ComponentRef,
  ElementType,
  FC,
  forwardRef,
  ForwardRefExoticComponent,
  RefAttributes,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import { SyntaxHighlighterProps, CodeHeaderProps } from "../overrides/types";
import { PreOverride } from "../overrides/PreOverride";
import {
  DefaultPre,
  DefaultCode,
  DefaultCodeBlockContent,
  DefaultCodeHeader,
} from "../overrides/defaultComponents";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { CodeOverride } from "../overrides/CodeOverride";
import { Primitive } from "@radix-ui/react-primitive";
import classNames from "classnames";

const { useSmooth, useSmoothStatus, withSmoothContextProvider } = INTERNAL;

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
  componentsByLanguage?:
    | Record<
        string,
        {
          CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
          SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
        }
      >
    | undefined;
  smooth?: boolean | undefined;
  /**
   * Function to transform text before markdown processing.
   */
  preprocess?: (text: string) => string;
  /**
   * Fallback content to display when used outside MessagePrimitive.Parts context.
   * If not provided, will display a helpful error message.
   */
  fallbackContent?: React.ReactNode;
  /**
   * Whether to show development warnings for incorrect usage.
   * @default true
   */
  showDevWarnings?: boolean;
};

const MarkdownTextInner: FC<MarkdownTextPrimitiveProps> = ({
  components: userComponents,
  componentsByLanguage,
  smooth = true,
  preprocess,
  fallbackContent,
  showDevWarnings = true,
  ...rest
}) => {
  const [isOutsideContext, setIsOutsideContext] = useState(false);

  // Try to use the hook, catch errors gracefully
  let messagePartText;
  try {
    messagePartText = useMessagePartText();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Part is only available inside")) {
      setIsOutsideContext(true);
      // Provide fallback text content
      messagePartText = { text: "", type: "text" as const, status: { type: "complete" as const } };
    } else {
      // Re-throw unexpected errors
      throw err;
    }
  }

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

  const components: Options["components"] = useMemo(() => {
    const { pre, code, SyntaxHighlighter, CodeHeader, ...componentsRest } =
      userComponents ?? {};
    return {
      ...componentsRest,
      pre: PreOverride,
      code: CodeComponent,
    };
  }, [CodeComponent, userComponents]);

  // Show error message when used outside context
  if (isOutsideContext) {
    if (fallbackContent) {
      return <>{fallbackContent}</>;
    }

    return (
      <div className="aui-markdown-error-boundary">
        <div className="text-amber-600 border border-amber-200 rounded p-3 bg-amber-50">
          <p className="font-medium text-sm mb-2">
            ⚠️ MarkdownText used outside message context
          </p>
          <p className="text-xs mb-2">
            MarkdownText must be used within <code className="bg-amber-100 px-1 rounded">MessagePrimitive.Parts</code>.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">How to fix</summary>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium">Correct usage:</p>
                <pre className="bg-amber-100 p-2 rounded text-xs overflow-x-auto mt-1">
                  {`<MessagePrimitive.Parts
  components={{
    Text: MarkdownText
  }}
/>`}
                </pre>
              </div>
              <div>
                <p className="font-medium">Common mistake:</p>
                <pre className="bg-amber-100 p-2 rounded text-xs overflow-x-auto mt-1">
                  {`<MessagePrimitive.Root>
  <MarkdownText /> {/* WRONG */}
</MessagePrimitive.Root>`}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <ReactMarkdown components={components} {...rest}>
      {text}
    </ReactMarkdown>
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
