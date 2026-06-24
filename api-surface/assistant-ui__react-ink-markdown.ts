import { RenderOptions, Theme, Theme as Theme$1, ThemeName, ThemeName as ThemeName$1 } from "markdansi";

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
  tableBorder?: "unicode" | "ascii" | "none";
  tablePadding?: number;
  tableDense?: boolean;
  quotePrefix?: string;
  listIndent?: number;
};

declare const MarkdownText: {
  (_param: MarkdownTextProps): import("react").JSX.Element;
  displayName: string;
};

type MarkdownTextPrimitiveProps = Omit<MarkdownTextProps, "text"> & {
  preprocess?: ((text: string) => string) | undefined;
};

declare const MarkdownTextPrimitive: {
  (_param: MarkdownTextPrimitiveProps): import("react").JSX.Element;
  displayName: string;
};

type UseShikiHighlighterOptions = {
  theme?: string;
  langs?: string[];
};

declare function useShikiHighlighter(options?: UseShikiHighlighterOptions): ((code: string, lang?: string) => string) | undefined;

declare namespace entry_root_exports {
  export { MarkdownText, MarkdownTextPrimitive, MarkdownTextPrimitiveProps, MarkdownTextProps, RenderOptions, Theme$1 as Theme, ThemeName$1 as ThemeName, UseShikiHighlighterOptions, useShikiHighlighter };
}

export { entry_root_exports as entry_root };
