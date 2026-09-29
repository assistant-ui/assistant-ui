"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  createContext,
  isValidElement,
  memo,
  type ReactNode,
  useContext,
} from "react";
import { parseLanguageClass } from "@assistant-ui/react-markdown/code-fence";
import { isSameHastNode } from "../memoization";
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
};

/**
 * Carries the adapter components past streamdown's memo boundaries: its root
 * memo ignores `components`, so a settled block never re-renders for a new
 * highlighter, while a context change reaches every mounted code adapter.
 */
export const CodeAdapterContext = createContext<CodeAdapterOptions>({});

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
 * detection.
 */
function CodeAdapterInner({
  node,
  className,
  children,
  "data-block": dataBlock,
  ...props
}: CodeAdapterProps) {
  const {
    SyntaxHighlighter: UserSyntaxHighlighter,
    CodeHeader: UserCodeHeader,
    componentsByLanguage = {},
    Pre = DefaultPre,
    Code = DefaultCode,
  } = useContext(CodeAdapterContext);

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

// Streamdown re-creates the hast `node` on every parse, so it compares by value,
// and only once every other prop matches by identity: a code element with
// element children never matches, so nested code skips the subtree walk.
export const CodeAdapter = memo(CodeAdapterInner, (prev, next) => {
  const prevProps: Record<string, unknown> = prev;
  const nextProps: Record<string, unknown> = next;
  const keys = Object.keys(prevProps);
  return (
    keys.length === Object.keys(nextProps).length &&
    keys.every(
      (key) =>
        Object.hasOwn(nextProps, key) &&
        (key === "node" || prevProps[key] === nextProps[key]),
    ) &&
    isSameHastNode(prev.node, next.node)
  );
});
CodeAdapter.displayName = "CodeAdapter";

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
