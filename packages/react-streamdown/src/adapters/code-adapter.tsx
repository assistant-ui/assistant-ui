"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  isValidElement,
  memo,
  type ReactNode,
} from "react";
import { parseLanguageClass } from "@assistant-ui/react-markdown/code-fence";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import type {
  CodeHeaderProps,
  ComponentsByLanguage,
  SyntaxHighlighterProps,
} from "../types";
import { DefaultPre, useStreamdownPreProps } from "./PreOverride";

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  node?: Element | undefined;
};

type PreProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

interface CodeAdapterOptions {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  Pre?: ComponentType<PreProps> | undefined;
  Code?: ComponentType<CodeProps> | undefined;
}

function joinClassNames(...names: (string | undefined)[]): string | undefined {
  const joined = names.filter(Boolean).join(" ");
  return joined || undefined;
}

function extractCode(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    let code = "";
    for (const child of children) code += extractCode(child);
    return code;
  }
  if (isValidElement<{ children?: unknown }>(children)) {
    return extractCode(children.props.children);
  }
  return "";
}

function DefaultCode({ node: _, ...props }: CodeProps): ReactNode {
  return <code {...props} />;
}

/**
 * Creates a code component adapter that bridges the assistant-ui
 * SyntaxHighlighter/CodeHeader API to streamdown's code component.
 */
export function createCodeAdapter(options: CodeAdapterOptions) {
  const {
    SyntaxHighlighter: UserSyntaxHighlighter,
    CodeHeader: UserCodeHeader,
    componentsByLanguage = {},
    Pre = DefaultPre,
    Code = DefaultCode,
  } = options;

  /**
   * Inner component that uses streamdown's data-block marker
   * for inline/block detection.
   */
  function AdaptedCodeInner({
    node,
    className,
    children,
    "data-block": dataBlock,
    ...props
  }: CodeProps & { "data-block"?: string }) {
    const preProps = useStreamdownPreProps();
    const WrappedPre = useCallbackRef(
      ({ className: ownClassName, ...p }: PreProps) => (
        <Pre
          {...preProps}
          {...p}
          className={joinClassNames(preProps?.className, ownClassName)}
        />
      ),
    );
    const WrappedCode = useCallbackRef(
      ({ className: ownClassName, ...p }: CodeProps) => (
        <Code
          node={node}
          {...props}
          {...p}
          className={joinClassNames(className, ownClassName)}
        />
      ),
    );

    if (!dataBlock) {
      return (
        <Code
          node={node}
          className={`aui-streamdown-inline-code ${className ?? ""}`.trim()}
          {...props}
        >
          {children}
        </Code>
      );
    }

    const language = parseLanguageClass(className);

    const SyntaxHighlighter =
      componentsByLanguage[language]?.SyntaxHighlighter ??
      UserSyntaxHighlighter;

    const CodeHeader =
      componentsByLanguage[language]?.CodeHeader ?? UserCodeHeader;

    const headerElement = CodeHeader ? (
      <CodeHeader
        node={node}
        language={language}
        code={extractCode(children)}
      />
    ) : null;

    if (
      SyntaxHighlighter &&
      (children == null || typeof children === "string")
    ) {
      return (
        <>
          {headerElement}
          <SyntaxHighlighter
            node={node}
            components={{ Pre: WrappedPre, Code: WrappedCode }}
            language={language}
            code={children ?? ""}
          />
        </>
      );
    }

    return (
      <>
        {headerElement}
        <Pre {...preProps}>
          <Code node={node} className={className} {...props}>
            {children}
          </Code>
        </Pre>
      </>
    );
  }

  const AdaptedCode = memo(AdaptedCodeInner, (prev, next) => {
    return (
      prev.className === next.className &&
      prev["data-block"] === next["data-block"] &&
      prev.children === next.children &&
      prev.node?.position?.start.line === next.node?.position?.start.line &&
      prev.node?.position?.end.line === next.node?.position?.end.line
    );
  });
  AdaptedCode.displayName = "AdaptedCode";

  return AdaptedCode;
}

/**
 * Checks if the code adapter should be used (i.e., user provided custom components).
 */
export function shouldUseCodeAdapter(options: CodeAdapterOptions): boolean {
  return !!(
    options.SyntaxHighlighter ||
    options.CodeHeader ||
    (options.componentsByLanguage &&
      Object.keys(options.componentsByLanguage).length > 0)
  );
}
