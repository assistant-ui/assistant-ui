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
  let parser = parserByToolCall.get(previous);
  if (!parser) {
    parser = IncrementalJsonObjectParser.from(previousText, previous.args);
  }

  const nextParser = parser.append(delta);
  parserByToolCall.set(next, nextParser);
  return nextParser.currentArgs;
};

export const transferIncrementalToolCallArgs = (
  previous: LangChainToolCall,
  next: LangChainToolCall,
) => {
  const parser = parserByToolCall.get(previous);
  if (parser && previous.partial_json === next.partial_json) {
    parserByToolCall.set(next, parser);
  }
};

export const getIncrementalToolCallArgs = (
  toolCall: LangChainToolCall,
  argsText: string,
): ReadonlyJSONObject | undefined => {
  const parser = parserByToolCall.get(toolCall);
  return toolCall.partial_json === argsText ? parser?.currentArgs : undefined;
};
