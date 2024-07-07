import {
  ComponentPropsWithoutRef,
  ComponentType,
  FC,
  useContext,
  useMemo,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { PreContext } from "./PreOverride";
import {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";
import { DefaultSyntaxHighlighter } from "./defaultComponents";

type CodeOverrideProps = ComponentPropsWithoutRef<CodeComponent> & {
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
    CodeHeader: ComponentType<CodeHeaderProps>;
    SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  };
};

const CodeBlockOverride: FC<CodeOverrideProps> = ({
  components: { Pre, Code, SyntaxHighlighter, CodeHeader },
  children,
  ...codeProps
}) => {
  const preProps = useContext(PreContext);
  const WrappedPre: PreComponent = useCallbackRef((props) => (
    <Slot {...(preProps as any)}>
      <Pre {...props} />
    </Slot>
  ));
  const WrappedCode: CodeComponent = useCallbackRef((props) => (
    <Slot {...(codeProps as any)}>
      <Code {...props} />
    </Slot>
  ));

  const components = useMemo(
    () => ({ Pre: WrappedPre, Code: WrappedCode }),
    [WrappedPre, WrappedCode],
  );

  const language = /language-(\w+)/.exec(codeProps.className || "")?.[1];
  const code = children as string;
  const SH = language ? SyntaxHighlighter : DefaultSyntaxHighlighter;

  return (
    <>
      <CodeHeader language={language} code={code} />
      <SH
        components={components}
        language={language ?? "unknown"}
        code={code}
      />
    </>
  );
};

export const CodeOverride: FC<CodeOverrideProps> = ({
  components,
  ...props
}) => {
  const preProps = useContext(PreContext);
  if (!preProps) return <components.Code {...(props as any)} />;
  return <CodeBlockOverride components={components} {...props} />;
};
