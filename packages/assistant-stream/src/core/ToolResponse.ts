import { ReadonlyJSONValue } from "./utils/json/json-value";

// Brand symbol to ensure type safety
declare const ToolResponseBrand: unique symbol;

export type ToolResponseInit<TResult> = {
  result: TResult;
  artifact?: ReadonlyJSONValue | undefined;
  isError?: boolean | undefined;
};

export class ToolResponse<TResult> {
  readonly artifact?: ReadonlyJSONValue | undefined;
  readonly result: TResult;
  readonly isError: boolean;
  readonly [ToolResponseBrand]!: true;

  constructor(options: ToolResponseInit<TResult>) {
    this.artifact = options.artifact;
    this.result = options.result;
    this.isError = options.isError ?? false;
  }
}
