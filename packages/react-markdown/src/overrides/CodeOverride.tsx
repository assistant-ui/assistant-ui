import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type FC,
  isValidElement,
  memo,
  createContext,
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
import { type ComponentsByLanguage, parseLanguageClass } from "../code-fence";
import { withDefaultProps } from "./withDefaults";
import { DefaultCodeBlockContent } from "./defaultComponents";
import { memoCompareNodes } from "../memoization";

type CodeRenderContextValue = {
  Pre: PreComponent;
  Code: CodeComponent;
  preProps: Omit<ComponentPropsWithoutRef<PreComponent>, "children">;
  codeProps: ComponentPropsWithoutRef<CodeComponent>;
};

const CodeRenderContext = createContext<CodeRenderContextValue | null>(null);

function WrappedPre(props: ComponentPropsWithoutRef<PreComponent>) {
  const { Pre, preProps } = useContext(CodeRenderContext)!;
  return <Pre {...withDefaultProps<any>(preProps)(props)} />;
}

function WrappedCode(props: ComponentPropsWithoutRef<CodeComponent>) {
  const { Code, codeProps } = useContext(CodeRenderContext)!;
  return <Code {...withDefaultProps<any>(codeProps)(props)} />;
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
  const renderContext = { Pre, Code, preProps, codeProps };

  const language = parseLanguageClass(codeProps.className);

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> =
    componentsByLanguage[language]?.SyntaxHighlighter ??
    FallbackSyntaxHighlighter;

  const CodeHeader: ComponentType<CodeHeaderProps> =
    componentsByLanguage[language]?.CodeHeader ?? FallbackCodeHeader;

  if (children != null && typeof children !== "string") {
    return (
      <CodeRenderContext.Provider value={renderContext}>
        <>
          <CodeHeader
            node={node}
            language={language}
            code={extractCode(children)}
          />
          <DefaultCodeBlockContent
            node={node}
            components={{ Pre: WrappedPre, Code: WrappedCode }}
            code={children}
          />
        </>
      </CodeRenderContext.Provider>
    );
  }

  return (
    <CodeRenderContext.Provider value={renderContext}>
      <DefaultCodeBlock
        node={node}
        components={{
          Pre: WrappedPre,
          Code: WrappedCode,
          SyntaxHighlighter,
          CodeHeader,
        }}
        language={language}
        code={children ?? ""}
      />
    </CodeRenderContext.Provider>
  );
};

export type CodeOverrideProps = ComponentPropsWithoutRef<CodeComponent> & {
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
    CodeHeader: ComponentType<CodeHeaderProps>;
    SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  };
  componentsByLanguage?: ComponentsByLanguage | undefined;
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
// Entries may be undefined at runtime (conditional map building, plain JS
// consumers), so the comparator accepts and distinguishes them.
export const compareComponentsByLanguage = (
  prev: Record<string, ComponentsByLanguage[string] | undefined> | undefined,
  next: Record<string, ComponentsByLanguage[string] | undefined> | undefined,
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
