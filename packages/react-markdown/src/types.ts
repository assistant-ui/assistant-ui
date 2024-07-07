import { Options } from "react-markdown";

export type PreComponent = NonNullable<
  NonNullable<Options["components"]>["pre"]
>;
export type CodeComponent = NonNullable<
  NonNullable<Options["components"]>["code"]
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
