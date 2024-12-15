import { Element } from "hast";
import { ComponentPropsWithoutRef, ComponentType } from "react";

export type PreComponent = ComponentType<
  ComponentPropsWithoutRef<"pre"> & { node: Element }
>;
export type CodeComponent = ComponentType<
  ComponentPropsWithoutRef<"code"> & { node: Element }
>;

export type CodeHeaderProps = {
  language: string | undefined;
  code: string;
};

export type SyntaxHighlighterProps = {
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
  };
  language: string;
  code: string;
};
