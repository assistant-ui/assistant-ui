import {
  ToolResponse,
  toJSONSchema,
  type Tool,
  type ToolModelContentPart,
} from "assistant-stream";
import { generateId } from "@assistant-ui/core/internal";
import type {
  WebMcpCallToolResult,
  WebMcpContent,
  WebMcpToolDescriptor,
} from "./webmcp-host";

/**
 * The predicate the WebMCP provider uses when no `filter` is passed: an enabled
 * frontend tool with a client-side `execute`. A tool authored without a `type`
 * is included, because `execute` is what distinguishes the deprecated
 * type-less form from a backend or human tool. A `filter` replaces this, so
 * pass it through to narrow the default set rather than widen it.
 */
export const defaultWebMcpFilter = (
  _name: string,
  tool: Tool<any, any>,
): boolean =>
  (tool.type === "frontend" || tool.type === undefined) &&
  !!tool.execute &&
  !tool.disabled;

export const toWebMcpInputSchema = (tool: Tool<any, any>): unknown =>
  tool.parameters
    ? toJSONSchema(tool.parameters)
    : { type: "object", properties: {} };

const textContent = (text: string): WebMcpContent => ({ type: "text", text });

const errorResult = (message: string): WebMcpCallToolResult => ({
  isError: true,
  content: [textContent(message)],
});

// bigint throws in JSON.stringify and symbol serializes to undefined, but both
// have a faithful string form. A value that cannot be serialized at all still
// throws through to the error result.
const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "symbol") {
    return value.toString();
  }
  return JSON.stringify(value) ?? String(value);
};

const primitiveContent = (value: unknown): WebMcpContent[] => [
  textContent(toText(value)),
];

const mapModelContentPart = (part: ToolModelContentPart): WebMcpContent => {
  if (part.type === "text") {
    return textContent(part.text ?? "");
  }
  if (part.type === "file") {
    if (
      typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/")
    ) {
      return { type: "image", data: part.data ?? "", mimeType: part.mediaType };
    }
    return textContent(part.data ?? "");
  }
  return textContent(toText(part));
};

export const toMcpContent = async (
  result: unknown,
  options: {
    tool: Tool<any, any>;
    toolCallId: string;
    args: Record<string, unknown>;
  },
): Promise<WebMcpCallToolResult> => {
  const response = ToolResponse.toResponse(result);
  if (response.modelContent) {
    const content = response.modelContent.map(mapModelContentPart);
    return response.isError ? { isError: true, content } : { content };
  }
  if (!response.isError && options.tool.toModelOutput) {
    try {
      const parts = await options.tool.toModelOutput({
        toolCallId: options.toolCallId,
        input: options.args,
        output: response.result,
      });
      return { content: parts.map(mapModelContentPart) };
    } catch (e) {
      console.warn(
        "[assistant-ui] toModelOutput threw; falling back to default projection.",
        e,
      );
    }
  }
  const content = primitiveContent(response.result);
  return response.isError ? { isError: true, content } : { content };
};

type StandardSchemaLike = {
  "~standard": {
    version: number;
    validate: (
      value: unknown,
    ) =>
      | { issues?: readonly unknown[] | undefined }
      | Promise<{ issues?: readonly unknown[] | undefined }>;
  };
};

const isStandardSchema = (schema: unknown): schema is StandardSchemaLike =>
  typeof schema === "object" &&
  schema !== null &&
  "~standard" in schema &&
  (schema as StandardSchemaLike)["~standard"].version === 1;

export const toWebMcpTool = (
  name: string,
  getTool: () => Tool<any, any>,
  lifecycleSignal?: AbortSignal,
): WebMcpToolDescriptor => ({
  name,
  description: getTool().description ?? "",
  inputSchema: toWebMcpInputSchema(getTool()),
  execute: async (rawArgs, context) => {
    if (lifecycleSignal?.aborted) {
      return errorResult(`Tool "${name}" is no longer registered`);
    }
    const tool = getTool();
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    const toolCallId = generateId();
    try {
      const callerSignal = context?.signal;
      const abortSignal = !callerSignal
        ? lifecycleSignal
        : !lifecycleSignal
          ? callerSignal
          : AbortSignal.any([callerSignal, lifecycleSignal]);
      let executeFn = tool.execute;
      if (isStandardSchema(tool.parameters)) {
        let validation = tool.parameters["~standard"].validate(args);
        validation = await validation;
        if (validation.issues) {
          const issues = validation.issues;
          executeFn =
            tool.experimental_onSchemaValidationError ??
            (() => {
              throw new Error(
                `Function parameter validation failed. ${JSON.stringify(issues)}`,
              );
            });
        }
      }

      if (abortSignal?.aborted) {
        return errorResult("Tool execution was cancelled.");
      }

      if (!executeFn) {
        return errorResult(`Tool "${name}" has no client-side implementation.`);
      }

      const result = await executeFn(args, {
        toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        human: () =>
          Promise.reject(
            new Error("human input not supported in WebMCP context"),
          ),
      });
      return await toMcpContent(result, { tool, toolCallId, args });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
