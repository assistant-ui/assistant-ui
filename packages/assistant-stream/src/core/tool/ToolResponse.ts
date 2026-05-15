import type { ReadonlyJSONValue } from "../../utils/json/json-value";
import type {
  ToolModelContentPart,
  ToolModelOutputFunction,
} from "./tool-types";

const TOOL_RESPONSE_SYMBOL = Symbol.for("aui.tool-response");

/**
 * Shape accepted anywhere a {@link ToolResponse} can be returned.
 */
export type ToolResponseLike<TResult> = {
  /** UI-visible tool result value. */
  result: TResult;
  /**
   * Optional UI-only artifact associated with the result.
   *
   * Artifacts are useful for large or structured data that should be available
   * to renderers without necessarily being sent back to the model.
   */
  artifact?: ReadonlyJSONValue | undefined;
  /** Marks the tool result as an error result. */
  isError?: boolean | undefined;
  /**
   * Explicit model-visible content to send back after the tool call.
   *
   * When omitted, assistant-ui derives model output from `result` or a tool's
   * {@link ToolModelOutputFunction}.
   */
  modelContent?: readonly ToolModelContentPart[] | undefined;
  /** Optional provider-specific message payload associated with the tool result. */
  messages?: ReadonlyJSONValue | undefined;
};

/**
 * Tool result wrapper for separating UI-visible output from model-visible
 * output.
 *
 * Return `ToolResponse` from a tool when you need to attach an artifact, mark
 * the result as an error, or control the content sent back to the model.
 *
 * @example
 * ```ts
 * return new ToolResponse({
 *   result: { title: "Report ready" },
 *   artifact: { reportId },
 *   modelContent: [{ type: "text", text: "The report is ready." }],
 * });
 * ```
 */
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

  /**
   * Converts a plain tool return value into a {@link ToolResponse}.
   *
   * Existing `ToolResponse` instances are returned unchanged. `undefined`
   * becomes the string `"<no result>"` so downstream protocol chunks always
   * carry a concrete result.
   */
  static toResponse(result: any | ToolResponse<any>): ToolResponse<any> {
    if (result instanceof ToolResponse) {
      return result;
    }
    return new ToolResponse({
      result: result === undefined ? "<no result>" : result,
    });
  }
}
