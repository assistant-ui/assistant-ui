import type { BlockNode } from "../ast";

export type Tokenizer = {
  parse(source: string): BlockNode[];
};
