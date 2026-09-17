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
import { useCallbackRef } from "../useCallbackRef";
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

export interface CodeAdapterOptions {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
  Pre?: ComponentType<PreProps> | undefined;
  Code?: ComponentType<CodeProps> | undefined;
}

export type CodeAdapterProps = CodeProps & {
  "data-block"?: string;
  adapter: CodeAdapterOptions;
};

type CodeAdapterInnerProps = CodeAdapterProps & {
  preProps: PreProps | null;
};

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
 * Bridges the assistant-ui SyntaxHighlighter/CodeHeader API to streamdown's
 * code component, using streamdown's data-block marker for inline/block
 * detection. The options travel as a prop rather than a closure so the
 * component type stays the same across renders and a fresh `components` object
 * updates the code block instead of remounting it.
 */
function CodeAdapterInner({
  adapter,
  preProps,
  node,
  className,
  children,
  "data-block": dataBlock,
  ...props
}: CodeAdapterInnerProps) {
  const {
    SyntaxHighlighter: UserSyntaxHighlighter,
    CodeHeader: UserCodeHeader,
    componentsByLanguage = {},
    Pre = DefaultPre,
    Code = DefaultCode,
  } = adapter;

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
    componentsByLanguage[language]?.SyntaxHighlighter ?? UserSyntaxHighlighter;

  const CodeHeader =
    componentsByLanguage[language]?.CodeHeader ?? UserCodeHeader;

  const headerElement = CodeHeader ? (
    <CodeHeader node={node} language={language} code={extractCode(children)} />
  ) : null;

  if (SyntaxHighlighter && (children == null || typeof children === "string")) {
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

function isSamePosition(prev: Element | undefined, next: Element | undefined) {
  return (
    prev?.position?.start.line === next?.position?.start.line &&
    prev?.position?.end.line === next?.position?.end.line
  );
}

function isSamePreProps(prev: PreProps | null, next: PreProps | null) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const keys = Object.keys(prev) as (keyof PreProps)[];
  return (
    keys.length === Object.keys(next).length &&
    keys.every(
      (key) =>
        Object.hasOwn(next, key) &&
        (key === "node"
          ? isSamePosition(prev.node, next.node)
          : prev[key] === next[key]),
    )
  );
}

const MemoizedCodeAdapter = memo(CodeAdapterInner, (prev, next) => {
  return (
    prev.adapter === next.adapter &&
    prev.className === next.className &&
    prev["data-block"] === next["data-block"] &&
    prev.children === next.children &&
    isSamePosition(prev.node, next.node) &&
    isSamePreProps(prev.preProps, next.preProps)
  );
});

/**
 * Reads the pre props above the memo boundary: PreOverride provides a new
 * context value whenever streamdown re-renders the block, and a read inside the
 * memoized body would re-run the highlighter for unchanged code.
 */
export function CodeAdapter(props: CodeAdapterProps) {
  const preProps = useStreamdownPreProps();
  return <MemoizedCodeAdapter {...props} preProps={preProps} />;
}

/**
 * Checks if the code adapter should be used (i.e., user provided custom components).
 */
export function shouldUseCodeAdapter(options: CodeAdapterOptions): boolean {
  return !!(
    options.SyntaxHighlighter ||
    options.CodeHeader ||
    (options.componentsByLanguage &&
      Object.keys(options.componentsByLanguage).length > 0) ||
    (options.Pre && options.Code)
  );
}
