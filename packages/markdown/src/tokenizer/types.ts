import type { BlockNode } from "../ast";

export type TokenizeResult = {
  blocks: BlockNode[];
  /** A link reference definition can turn text in any other block into a link. */
  hasReferenceDefinitions: boolean;
};

export type Tokenizer = {
  parse(source: string): TokenizeResult;
};
