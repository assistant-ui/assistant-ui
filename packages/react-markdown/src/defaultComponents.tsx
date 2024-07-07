import type { ComponentType } from "react";
import {
  PreComponent,
  CodeComponent,
  SyntaxHighlighterProps,
  CodeHeaderProps,
} from "./types";

export const DefaultPre: PreComponent = ({ node, ...rest }) => (
  <pre {...rest} />
);
export const DefaultCode: CodeComponent = ({ node, ...rest }) => (
  <code {...rest} />
);
export const DefaultSyntaxHighlighter: ComponentType<
  SyntaxHighlighterProps
> = ({ components: { Pre, Code }, code }) => (
  <Pre>
    <Code>{code}</Code>
  </Pre>
);
export const DefaultCodeHeader: ComponentType<CodeHeaderProps> = () => null;
