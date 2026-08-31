import type { Element } from "hast";
import type { ComponentPropsWithoutRef, ComponentType } from "react";

export type PreComponent = ComponentType<
  ComponentPropsWithoutRef<"pre"> & { node?: Element | undefined }
>;
export type CodeComponent = ComponentType<
  ComponentPropsWithoutRef<"code"> & { node?: Element | undefined }
>;

export type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

export type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
  };
  language: string;
  code: string;
};

export type ComponentsByLanguage = Record<
  string,
  {
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  }
>;

export const parseLanguageClass = (className: string | undefined): string =>
  /language-([^\s]+)/.exec(className ?? "")?.[1] ?? "";
