import {
  IncrementalJsonObjectParser,
  parsePartialJsonObject,
  type ReadonlyJSONObject,
} from "assistant-stream/utils";
import type { LangChainToolCall } from "./types";

type CachedParser = {
  parser: IncrementalJsonObjectParser;
  text: string;
};

const parserByToolCall = new WeakMap<LangChainToolCall, CachedParser>();

const getCachedParser = (toolCall: LangChainToolCall) => {
  const cached = parserByToolCall.get(toolCall);
  return cached?.text === (toolCall.partial_json ?? "")
    ? cached.parser
    : undefined;
};

export const initializeIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject => {
  const parser = IncrementalJsonObjectParser.from(
    argsText,
    argsText.length === 0 ? parsePartialJsonObject("")! : {},
  );
  parserByToolCall.set(toolCall, { parser, text: argsText });
  return parser.currentArgs;
};

export const appendIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
  delta: string,
): ReadonlyJSONObject => {
  const previousText = previous.partial_json ?? "";
  let parser = getCachedParser(previous);
  if (!parser) {
    parser = IncrementalJsonObjectParser.from(previousText, previous.args);
  }

  const nextParser = parser.append(delta);
  parserByToolCall.set(next, {
    parser: nextParser,
    text: next.partial_json ?? "",
  });
  return nextParser.currentArgs;
};

export const transferIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
) => {
  const parser = getCachedParser(previous);
  if (parser && previous.partial_json === next.partial_json) {
    parserByToolCall.set(next, {
      parser,
      text: next.partial_json ?? "",
    });
  }
};

export const getIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject | undefined => {
  const parser = getCachedParser(toolCall);
  return toolCall.partial_json === argsText ? parser?.currentArgs : undefined;
};
