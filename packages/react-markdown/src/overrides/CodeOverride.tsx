import { ComponentPropsWithoutRef, ComponentType, FC, useContext } from "react";
import { PreContext } from "./PreOverride";
import {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";
import { DefaultCodeBlock } from "./CodeBlock";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { withDefaultProps } from "./withDefaults";
import { DefaultCodeBlockContent } from "./defaultComponents";

const CodeBlockOverride: FC<CodeOverrideProps> = ({
  components: {
    Pre,
    Code,
    SyntaxHighlighter: FallbackSyntaxHighlighter,
    CodeHeader: FallbackCodeHeader,
    by_language = {},
  },
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

  const language = /language-(\w+)/.exec(codeProps.className || "")?.[1] ?? "";

  // if the code content is not string (due to rehype plugins), return a default code block
  if (typeof children !== "string") {
    return (
      <DefaultCodeBlockContent
        components={{ Pre: WrappedPre, Code: WrappedCode }}
        code={children}
      />
    );
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> =
    by_language[language]?.SyntaxHighlighter ?? FallbackSyntaxHighlighter;

  const CodeHeader: ComponentType<CodeHeaderProps> =
    by_language[language]?.CodeHeader ?? FallbackCodeHeader;

  return (
    <DefaultCodeBlock
      components={{
        Pre: WrappedPre,
        Code: WrappedCode,
        SyntaxHighlighter,
        CodeHeader,
      }}
      language={language || "unknown"}
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
    by_language?: Record<
      string,
      {
        CodeHeader?: ComponentType<CodeHeaderProps>;
        SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps>;
      }
    >;
  };
};

export const CodeOverride: FC<CodeOverrideProps> = ({
  components,
  ...props
}) => {
  const preProps = useContext(PreContext);
  if (!preProps) return <components.Code {...(props as any)} />;
  return <CodeBlockOverride components={components} {...props} />;
};
