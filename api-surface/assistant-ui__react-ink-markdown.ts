import { RenderOptions, Theme, Theme as Theme$1, ThemeName, ThemeName as ThemeName$1 } from "markdansi";

declare const MarkdownText: {
  (_param0: MarkdownTextProps): import("react").JSX.Element;
  displayName: string;
};

declare const MarkdownTextPrimitive: {
  (_param1: MarkdownTextPrimitiveProps): import("react").JSX.Element;
  displayName: string;
};

type MarkdownTextPrimitiveProps = Omit<MarkdownTextProps, "text"> & {
  preprocess?: ((text: string) => string) | undefined;
};

type MarkdownTextProps = {
  text: string;
  highlighter?: (code: string, lang?: string) => string;
  theme?: ThemeName | Theme;
  width?: number;
  wrap?: boolean;
  codeBox?: boolean;
  codeGutter?: boolean;
  codeWrap?: boolean;
  hyperlinks?: boolean;
  tableBorder?: "ascii" | "none" | "unicode";
  tablePadding?: number;
  tableDense?: boolean;
  quotePrefix?: string;
  listIndent?: number;
};

type UseShikiHighlighterOptions = {
  theme?: string;
  langs?: string[];
};

declare namespace entry_root_exports {
  export { MarkdownText, MarkdownTextPrimitive, MarkdownTextPrimitiveProps, MarkdownTextProps, RenderOptions, Theme$1 as Theme, ThemeName$1 as ThemeName, UseShikiHighlighterOptions, useShikiHighlighter };
}

declare function useShikiHighlighter(options?: UseShikiHighlighterOptions): ((code: string, lang?: string) => string) | undefined;

export { entry_root_exports as entry_root };
