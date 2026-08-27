import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type FC,
  memo,
  useContext,
} from "react";
import { PreContext, useIsMarkdownCodeBlock } from "./PreOverride";
import type {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";
import { DefaultCodeBlock } from "./CodeBlock";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { withDefaultProps } from "./withDefaults";
import { DefaultCodeBlockContent } from "./defaultComponents";
import { memoCompareNodes } from "../memoization";

const CodeBlockOverride: FC<CodeOverrideProps> = ({
  node,
  components: {
    Pre,
    Code,
    SyntaxHighlighter: FallbackSyntaxHighlighter,
    CodeHeader: FallbackCodeHeader,
  },
  componentsByLanguage = {},
  children,
  ...codeProps
}) => {
  const preProps = useContext(PreContext)!;
  const getPreProps = withDefaultProps<any>(preProps);
  const WrappedPre: PreComponent = useCallbackRef((props) => (
    <Pre {...getPreProps(props)} />
  ));

  const getCodeProps = withDefaultProps<any>(codeProps);
  const WrappedCode: CodeComponent = useCallbackRef((props) => (
    <Code {...getCodeProps(props)} />
  ));

  const language =
    /language-([^\s]+)/.exec(codeProps.className || "")?.[1] ?? "";

  // if the code content is not string (due to rehype plugins), return a default code block
  if (typeof children !== "string") {
    return (
      <DefaultCodeBlockContent
        node={node}
        components={{ Pre: WrappedPre, Code: WrappedCode }}
        code={children}
      />
    );
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> =
    componentsByLanguage[language]?.SyntaxHighlighter ??
    FallbackSyntaxHighlighter;

  const CodeHeader: ComponentType<CodeHeaderProps> =
    componentsByLanguage[language]?.CodeHeader ?? FallbackCodeHeader;

  return (
    <DefaultCodeBlock
      node={node}
      components={{
        Pre: WrappedPre,
        Code: WrappedCode,
        SyntaxHighlighter,
        CodeHeader,
      }}
      language={language}
      code={children}
    />
  );
};

export type CodeOverrideProps = ComponentPropsWithoutRef<CodeComponent> & {
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
    CodeHeader: ComponentType<CodeHeaderProps>;
    SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  };
  componentsByLanguage?:
    | Record<
        string,
        {
          CodeHeader?: ComponentType<CodeHeaderProps>;
          SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps>;
        }
      >
    | undefined;
};

const CodeOverrideImpl: FC<CodeOverrideProps> = ({
  node,
  components,
  componentsByLanguage,
  ...props
}) => {
  const isCodeBlock = useIsMarkdownCodeBlock();
  if (!isCodeBlock) return <components.Code {...props} />;
  return (
    <CodeBlockOverride
      node={node}
      components={components}
      componentsByLanguage={componentsByLanguage}
      {...props}
    />
  );
};

// Compared structurally: the prop's documented usage is an inline object
// literal, so a fresh-but-equal identity per render must not re-render (and
// re-tokenize) every code block during streaming.
type LanguageComponentEntry = {
  CodeHeader?: ComponentType<CodeHeaderProps>;
  SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps>;
};

// Entries may be undefined at runtime (conditional map building, plain JS
// consumers), so the comparator accepts and distinguishes them.
export const compareComponentsByLanguage = (
  prev: Record<string, LanguageComponentEntry | undefined> | undefined,
  next: Record<string, LanguageComponentEntry | undefined> | undefined,
): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const prevKeys = Object.keys(prev);
  if (prevKeys.length !== Object.keys(next).length) return false;
  for (const key of prevKeys) {
    if (!Object.hasOwn(next, key)) return false;
    const prevEntry = prev[key];
    const nextEntry = next[key];
    if (prevEntry === nextEntry) continue;
    if (!prevEntry || !nextEntry) return false;
    if (
      prevEntry.SyntaxHighlighter !== nextEntry.SyntaxHighlighter ||
      prevEntry.CodeHeader !== nextEntry.CodeHeader
    )
      return false;
  }
  return true;
};

export const CodeOverride = memo(CodeOverrideImpl, (prev, next) => {
  const isEqual =
    prev.components === next.components &&
    compareComponentsByLanguage(
      prev.componentsByLanguage,
      next.componentsByLanguage,
    ) &&
    memoCompareNodes(prev, next);
  return isEqual;
});
