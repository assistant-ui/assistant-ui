import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../utils/json/json-value";
import type { ToolCallReader } from "./tool-types";
import type { ToolResponse } from "./ToolResponse";

export type InternalToolExecutionOptions = {
  execute: (toolCall: {
    toolCallId: string;
    toolName: string;
    args: ReadonlyJSONObject;
    executionId: symbol;
  }) =>
    | Promise<ToolResponse<ReadonlyJSONValue>>
    | ToolResponse<ReadonlyJSONValue>
    | undefined;
  streamCall: <
    TArgs extends ReadonlyJSONObject = ReadonlyJSONObject,
    TResult extends ReadonlyJSONValue = ReadonlyJSONValue,
  >(toolCall: {
    reader: ToolCallReader<TArgs, TResult>;
    toolCallId: string;
    toolName: string;
    executionId: symbol;
  }) => unknown;
  onExecutionStart?:
    | ((toolCallId: string, toolName: string, executionId: symbol) => void)
    | undefined;
  onExecutionEnd?:
    | ((toolCallId: string, toolName: string, executionId: symbol) => void)
    | undefined;
};
