"use client";

import { useContentPartText } from "@assistant-ui/react";
import {
  ElementRef,
  ElementType,
  forwardRef,
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
import { useSmooth } from "@assistant-ui/react/internal";
import { Primitive } from "@radix-ui/react-primitive";
import classNames from "classnames";

type MarkdownTextPrimitiveElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export type MarkdownTextPrimitiveProps = Omit<
  Options,
  "components" | "children" | "asChild"
> & {
  containerProps?: Omit<PrimitiveDivProps, "children">;
  containerComponent?: ElementType;
  components?: NonNullable<Options["components"]> & {
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps>;
    CodeHeader?: ComponentType<CodeHeaderProps>;
    by_language?: Record<
      string,
      {
        CodeHeader?: ComponentType<CodeHeaderProps>;
        SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps>;
      }
    >;
  };
  smooth?: boolean;
};
export const MarkdownTextPrimitive = forwardRef<
  MarkdownTextPrimitiveElement,
  MarkdownTextPrimitiveProps
>(
  (
    {
      components: userComponents,
      className,
      containerProps,
      containerComponent: Container = "div",
      ...rest
    },
    forwardedRef,
    smooth = true,
  ) => {
    const {
      part: { text },
      status,
    } = useSmooth(useContentPartText(), smooth);

    const {
      pre = DefaultPre,
      code = DefaultCode,
      SyntaxHighlighter = DefaultCodeBlockContent,
      CodeHeader = DefaultCodeHeader,
      by_language,
      ...componentsRest
    } = userComponents ?? {};
    const components: typeof userComponents = {
      ...componentsRest,
      pre: PreOverride,
      code: useCallbackRef((props) => (
        <CodeOverride
          components={{
            Pre: pre,
            Code: code,
            SyntaxHighlighter,
            CodeHeader,
            by_language,
          }}
          {...props}
        />
      )),
    };

    return (
      <Container
        data-status={status.type}
        {...containerProps}
        className={classNames(className, containerProps?.className)}
        ref={forwardedRef}
      >
        <ReactMarkdown components={components} {...rest}>
          {text}
        </ReactMarkdown>
      </Container>
    );
  },
);

MarkdownTextPrimitive.displayName = "MarkdownTextPrimitive";
