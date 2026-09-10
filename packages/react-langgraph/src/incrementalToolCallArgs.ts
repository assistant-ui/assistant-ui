import {
  IncrementalJsonObjectParser,
  parsePartialJsonObject,
  type ReadonlyJSONObject,
} from "assistant-stream/utils";
import type { LangChainToolCall } from "./types";

const parserByToolCall = new WeakMap<
  LangChainToolCall,
  IncrementalJsonObjectParser
>();

export const initializeIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject => {
  const parser = IncrementalJsonObjectParser.from(
    argsText,
    argsText.length === 0 ? parsePartialJsonObject("")! : {},
  );
  parserByToolCall.set(toolCall, parser);
  return parser.currentArgs;
};

export const appendIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
  delta: string,
): ReadonlyJSONObject => {
  const previousText = previous.partial_json ?? "";
  const parser = parserByToolCall.get(previous);
  const baseParser =
    parser?.currentText === previousText
      ? parser
      : IncrementalJsonObjectParser.from(previousText, previous.args);

  const expectedText = previousText + delta;
  const nextText = next.partial_json ?? expectedText;
  const nextParser =
    nextText === expectedText
      ? baseParser.append(delta)
      : IncrementalJsonObjectParser.from(nextText, next.args);
  parserByToolCall.set(next, nextParser);
  return nextParser.currentArgs;
};

export const transferIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
) => {
  const parser = parserByToolCall.get(previous);
  if (parser && parser.currentText === next.partial_json) {
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
