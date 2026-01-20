"use client";

import type { Element } from "hast";
import {
  type ComponentType,
  type DetailedHTMLProps,
  type HTMLAttributes,
  isValidElement,
  memo,
} from "react";
import type {
  CodeHeaderProps,
  ComponentsByLanguage,
  SyntaxHighlighterProps,
} from "../types";

const LANGUAGE_REGEX = /language-([^\s]+)/;

type CodeProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  node?: Element | undefined;
};

interface CodeAdapterOptions {
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
  componentsByLanguage?: ComponentsByLanguage | undefined;
}

/**
 * Extracts code string from children.
 */
function extractCode(children: unknown): string {
  if (typeof children === "string") {
    return children;
  }
  if (
    isValidElement(children) &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props &&
    typeof children.props.children === "string"
  ) {
    return children.props.children;
  }
  return "";
}

/**
 * Default Pre component.
 */
const DefaultPre = ({
  node: _,
  ...props
}: { node?: Element | undefined } & DetailedHTMLProps<
  HTMLAttributes<HTMLPreElement>,
  HTMLPreElement
>) => <pre {...props} />;

/**
 * Default Code component.
 */
const DefaultCode = ({
  node: _,
  ...props
}: { node?: Element | undefined } & DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
>) => <code {...props} />;

/**
 * Creates a code component adapter that bridges the assistant-ui
 * SyntaxHighlighter/CodeHeader API to streamdown's code component.
 */
export function createCodeAdapter(options: CodeAdapterOptions) {
  const {
    SyntaxHighlighter: UserSyntaxHighlighter,
    CodeHeader: UserCodeHeader,
    componentsByLanguage = {},
  } = options;

  const AdaptedCode = memo(
    function AdaptedCode({ node, className, children, ...props }: CodeProps) {
      // Detect inline vs block code
      const isInline = node?.position?.start.line === node?.position?.end.line;

      if (isInline) {
        // Inline code - render as simple code element
        return (
          <code
            className={`aui-streamdown-inline-code ${className ?? ""}`.trim()}
            {...props}
          >
            {children}
          </code>
        );
      }

      // Block code - extract language and code content
      const match = className?.match(LANGUAGE_REGEX);
      const language = match?.[1] ?? "";
      const code = extractCode(children);

      // Get language-specific or fallback components
      const SyntaxHighlighter =
        componentsByLanguage[language]?.SyntaxHighlighter ??
        UserSyntaxHighlighter;

      const CodeHeader =
        componentsByLanguage[language]?.CodeHeader ?? UserCodeHeader;

      // If user provided custom SyntaxHighlighter, use it
      if (SyntaxHighlighter) {
        return (
          <>
            {CodeHeader && (
              <CodeHeader node={node} language={language} code={code} />
            )}
            <SyntaxHighlighter
              node={node}
              components={{ Pre: DefaultPre, Code: DefaultCode }}
              language={language}
              code={code}
            />
          </>
        );
      }

      // No custom SyntaxHighlighter - return null to let streamdown handle it
      // This signals to the adapter that we should use streamdown's default
      return null;
    },
    (prev, next) => {
      return (
        prev.className === next.className &&
        prev.node?.position?.start.line === next.node?.position?.start.line &&
        prev.node?.position?.end.line === next.node?.position?.end.line
      );
    },
  );

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
