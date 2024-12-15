import type { ComponentType, ReactNode } from "react";
import { Element } from "hast";
import { PreComponent, CodeComponent, CodeHeaderProps } from "./types";

export const DefaultPre: PreComponent = ({ node, ...rest }) => (
  <pre {...rest} />
);

export const DefaultCode: CodeComponent = ({ node, ...rest }) => (
  <code {...rest} />
);

export const DefaultCodeBlockContent: ComponentType<{
  components: { Pre: PreComponent; Code: CodeComponent };
  code: string | ReactNode | undefined;
  node: Element;
}> = ({ components: { Pre, Code }, code, node }) => (
  <Pre node={node}>
    <Code node={node}>{code}</Code>
  </Pre>
);

export const DefaultCodeHeader: ComponentType<CodeHeaderProps> = () => null;
