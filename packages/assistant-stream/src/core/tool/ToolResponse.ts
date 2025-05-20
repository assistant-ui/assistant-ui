import { ReadonlyJSONValue } from "../../utils/json/json-value";

const TOOL_RESPONSE_SYMBOL = Symbol.for("aui.tool-response");

export type ToolResponseInit<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
};

export class ToolResponse<TResult> {
  get [TOOL_RESPONSE_SYMBOL]() {
    return true;
  }

  readonly artifact?: ReadonlyJSONValue;
  readonly result: TResult;
  readonly isError: boolean;

  constructor(options: ToolResponseInit<TResult>) {
    if (options.artifact !== undefined) {
      this.artifact = options.artifact;
    }
    this.result = options.result;
    this.isError = options.isError ?? false;
  }

  static [Symbol.hasInstance](
    obj: unknown,
  ): obj is ToolResponse<ReadonlyJSONValue> {
    return (
      typeof obj === "object" && obj !== null && TOOL_RESPONSE_SYMBOL in obj
    );
  }
}
