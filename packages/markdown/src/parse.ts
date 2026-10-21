import type { RootNode } from "./ast";
import { createMarkdownItTokenizer } from "./tokenizer/markdown-it";

export const markdownTokenizer = createMarkdownItTokenizer({
  extensions: true,
});

export const parseMarkdown = (source: string): RootNode => ({
  type: "root",
  children: markdownTokenizer.parse(source).blocks,
});
