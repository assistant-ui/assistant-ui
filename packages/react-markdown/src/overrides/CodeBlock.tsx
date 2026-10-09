import { type ComponentType, type FC, useMemo } from "react";

import type {
  CodeComponent,
  CodeHeaderProps,
  PreComponent,
  SyntaxHighlighterProps,
} from "./types";
import type { Element } from "hast";

export type CodeBlockProps = {
  node: Element | undefined;
  language: string;
  code: string;
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
    CodeHeader: ComponentType<CodeHeaderProps>;
    SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  };
};

export const DefaultCodeBlock: FC<CodeBlockProps> = ({
  node,
  components: { Pre, Code, SyntaxHighlighter, CodeHeader },
  language,
  code,
}) => {
  const components = useMemo(() => ({ Pre, Code }), [Pre, Code]);

  return (
    <>
      <CodeHeader node={node} language={language} code={code} />
      <SyntaxHighlighter
        node={node}
        components={components}
        language={language}
        code={code}
      />
    </>
  );
};
