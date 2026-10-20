import type { RootNode } from "./ast";
import { createMarkdownItTokenizer } from "./tokenizer/markdown-it";

const tokenizer = createMarkdownItTokenizer({ gfm: true });

export const parseMarkdown = (source: string): RootNode => ({
  type: "root",
  children: tokenizer.parse(source),
});
