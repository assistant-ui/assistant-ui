import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type FC,
  isValidElement,
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
import {
  compareComponentsByLanguage,
  type ComponentsByLanguage,
  parseLanguageClass,
} from "../code-fence";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { withDefaultProps } from "./withDefaults";
import { DefaultCodeBlockContent } from "./defaultComponents";
import { memoCompareNodes } from "../memoization";

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
  const getPreProps = withDefaultProps<any>(preProps);
  const WrappedPre: PreComponent = useCallbackRef((props) => (
    <Pre {...getPreProps(props)} />
  ));

  const getCodeProps = withDefaultProps<any>(codeProps);
  const WrappedCode: CodeComponent = useCallbackRef((props) => (
    <Code {...getCodeProps(props)} />
  ));

  const language = parseLanguageClass(codeProps.className);

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> =
    componentsByLanguage[language]?.SyntaxHighlighter ??
    FallbackSyntaxHighlighter;

  const CodeHeader: ComponentType<CodeHeaderProps> =
    componentsByLanguage[language]?.CodeHeader ?? FallbackCodeHeader;

  if (children != null && typeof children !== "string") {
    return (
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
    );
  }

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
      code={children ?? ""}
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
