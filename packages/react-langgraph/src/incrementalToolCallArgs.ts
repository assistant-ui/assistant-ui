import {
  IncrementalPartialJsonObjectParser,
  type ReadonlyJSONObject,
} from "assistant-stream/utils";
import type { LangChainToolCall } from "./types";

const parserByToolCall = new WeakMap<
  LangChainToolCall,
  IncrementalPartialJsonObjectParser
>();

export const initializeIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject => {
  const parser = IncrementalPartialJsonObjectParser.from(argsText);
  parserByToolCall.set(toolCall, parser);
  return parser.currentArgs;
};

export const appendIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
  delta: string,
): ReadonlyJSONObject => {
  const previousText = previous.partial_json ?? "";
  let parser = parserByToolCall.get(previous);
  if (!parser || parser.currentText !== previousText) {
    parser = IncrementalPartialJsonObjectParser.from(
      previousText,
      previous.args,
    );
  }

  const nextText = next.partial_json ?? previousText + delta;
  const nextParser = parser.append(delta, nextText);
  parserByToolCall.set(next, nextParser);
  return nextParser.currentArgs;
};

export const transferIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
) => {
  const parser = parserByToolCall.get(previous);
  if (parser?.currentText === next.partial_json) {
    parserByToolCall.set(next, parser);
  }
};

export const getIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject | undefined => {
  const parser = parserByToolCall.get(toolCall);
  return parser?.currentText === argsText ? parser.currentArgs : undefined;
};
