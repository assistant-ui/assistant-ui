import type { BlockNode, RootNode } from "./ast";
import { markdownTokenizer } from "./parse";
import type { Tokenizer } from "./tokenizer/types";

export type MarkdownSession = {
  /** Parses the full text of a message; when the text extends the previous update, only the blocks that can still change are parsed again, and every earlier block is returned as the same object. */
  update(text: string): RootNode;
};

type SessionState = {
  text: string;
  lineStarts: number[];
  settled: BlockNode[];
  open: BlockNode[];
  /** Reference definitions resolve across blocks, so every update reparses the whole text. */
  wholeText: boolean;
  root: RootNode;
};

const lineStartsOf = (text: string, starts: number[] = [0], from = 0) => {
  for (let index = from; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
};

const shiftLines = (block: BlockNode, offset: number): BlockNode => {
  block.lines.start += offset;
  block.lines.end += offset;
  switch (block.type) {
    case "blockquote":
      block.children.forEach((child) => shiftLines(child, offset));
      break;
    case "list":
      for (const item of block.children) {
        item.lines.start += offset;
        item.lines.end += offset;
        item.children.forEach((child) => shiftLines(child, offset));
      }
      break;
    case "table":
      for (const row of block.children) {
        row.lines.start += offset;
        row.lines.end += offset;
      }
      break;
  }
  return block;
};

export const createSession = (tokenizer: Tokenizer): MarkdownSession => {
  let state: SessionState | undefined;

  const commit = (
    text: string,
    lineStarts: number[],
    settled: BlockNode[],
    blocks: BlockNode[],
    wholeText: boolean,
  ): RootNode => {
    const children = [...settled, ...blocks];
    // A block starting on the unfinished final line can still become a continuation of the block before it (`*` into `**`), so that block stays open too.
    const last = children.at(-1);
    const openCount =
      last && children.length > 1 && last.lines.start >= lineStarts.length - 1
        ? 2
        : 1;
    const split = Math.max(children.length - openCount, 0);
    state = {
      text,
      lineStarts,
      settled: children.slice(0, split),
      open: children.slice(split),
      wholeText,
      root: { type: "root", children },
    };
    return state.root;
  };

  const parseWhole = (text: string): RootNode => {
    const result = tokenizer.parse(text);
    return commit(
      text,
      lineStartsOf(text),
      [],
      result.blocks,
      result.hasReferenceDefinitions,
    );
  };

  return {
    update(input) {
      const text = input.includes("\r") ? input.replace(/\r\n?/g, "\n") : input;
      if (state?.text === text) return state.root;

      const openBlock = state?.open[0];
      if (
        !state ||
        !openBlock ||
        state.wholeText ||
        !text.startsWith(state.text)
      ) {
        return parseWhole(text);
      }

      const lineStarts = lineStartsOf(
        text,
        state.lineStarts,
        state.text.length,
      );
      const startLine = openBlock.lines.start;
      const tail = tokenizer.parse(text.slice(lineStarts[startLine]));
      if (tail.hasReferenceDefinitions) return parseWhole(text);

      return commit(
        text,
        lineStarts,
        state.settled,
        tail.blocks.map((block) => shiftLines(block, startLine)),
        false,
      );
    },
  };
};

export const createMarkdownSession = (): MarkdownSession =>
  createSession(markdownTokenizer);
