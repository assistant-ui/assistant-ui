import type { ReadonlyJSONValue } from "../../utils/json/json-value";
import type { ToolModelContentPart } from "./tool-types";

const TOOL_RESPONSE_SYMBOL = Symbol.for("aui.tool-response");

export type ToolResponseLike<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
  modelContent?: readonly ToolModelContentPart[] | undefined;
  messages?: ReadonlyJSONValue | undefined;
};

export class ToolResponse<TResult> {
  get [TOOL_RESPONSE_SYMBOL]() {
    return true;
  }

  readonly artifact?: ReadonlyJSONValue;
  readonly result: TResult;
  readonly isError: boolean;
  readonly modelContent?: readonly ToolModelContentPart[];
  readonly messages?: ReadonlyJSONValue;

  constructor(options: ToolResponseLike<TResult>) {
    if (options.artifact !== undefined) {
      this.artifact = options.artifact;
    }
    this.result = options.result;
    this.isError = options.isError ?? false;
    if (options.modelContent !== undefined) {
      this.modelContent = options.modelContent;
    }
    if (options.messages !== undefined) {
      this.messages = options.messages;
    }
  }

  static [Symbol.hasInstance](
    obj: unknown,
  ): obj is ToolResponse<ReadonlyJSONValue> {
    return (
      typeof obj === "object" && obj !== null && TOOL_RESPONSE_SYMBOL in obj
    );
  }

  static toResponse(result: any | ToolResponse<any>): ToolResponse<any> {
    if (result instanceof ToolResponse) {
      return result;
    }
    return new ToolResponse({
      result: result === undefined ? "<no result>" : result,
    });
  }
}
