import type { BlockNode, RootNode } from "./ast";
import { closeOpenBlock } from "./complete";
import { markdownTokenizer } from "./parse";
import type { Tokenizer } from "./tokenizer/types";

export type MarkdownSessionUpdateOptions = {
  /** The message is complete, so nothing left open at its end is closed provisionally. */
  final?: boolean;
};

export type MarkdownSession = {
  /** Parses the full text of a message; when the text extends the previous update, only the blocks that can still change are parsed again, and every earlier block is returned as the same object. Until `final`, emphasis, code spans, and links left open at the end of the text render as closed. */
  update(text: string, options?: MarkdownSessionUpdateOptions): RootNode;
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

  const parse = (text: string): RootNode => {
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

    const lineStarts = lineStartsOf(text, state.lineStarts, state.text.length);
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
  };

  let projected: { raw: RootNode; root: RootNode } | undefined;

  // The provisional closing is a projection of the raw parse, which the session
  // keeps, so a later update reparses and compares against what was written.
  const closeOpenEnd = (raw: RootNode, text: string): RootNode => {
    if (projected?.raw === raw) return projected.root;
    const last = raw.children.at(-1);
    const closed =
      last && !/\n[ \t]*\n[ \t]*$/.test(text) ? closeOpenBlock(last) : last;
    const root: RootNode =
      closed === last
        ? raw
        : { type: "root", children: [...raw.children.slice(0, -1), closed!] };
    projected = { raw, root };
    return root;
  };

  return {
    update(input, options) {
      const text = input.includes("\r") ? input.replace(/\r\n?/g, "\n") : input;
      const raw = parse(text);
      return options?.final ? raw : closeOpenEnd(raw, text);
    },
  };
};

export const createMarkdownSession = (): MarkdownSession =>
  createSession(markdownTokenizer);
