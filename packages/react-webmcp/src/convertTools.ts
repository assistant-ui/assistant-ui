import {
  ToolResponse,
  toJSONSchema,
  type Tool,
  type ToolModelContentPart,
} from "assistant-stream";
import type { WebMcpApprovalGate } from "./approval-gate";
import type {
  WebMcpCallToolResult,
  WebMcpContent,
  WebMcpToolDescriptor,
} from "./webmcp-adapter";

export const defaultWebMcpFilter = (
  _name: string,
  tool: Tool<any, any>,
): boolean => tool.type === "frontend" && !!tool.execute && !tool.disabled;

export const toWebMcpInputSchema = (tool: Tool<any, any>): unknown =>
  tool.parameters
    ? toJSONSchema(tool.parameters)
    : { type: "object", properties: {} };

const textContent = (text: string): WebMcpContent => ({ type: "text", text });

const errorResult = (message: string): WebMcpCallToolResult => ({
  isError: true,
  content: [textContent(message)],
});

const primitiveContent = (value: unknown): WebMcpContent[] => [
  textContent(
    typeof value === "string"
      ? value
      : (JSON.stringify(value) ?? String(value)),
  ),
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
      return { type: "image", data: part.data, mimeType: part.mediaType };
    }
    return textContent(part.data ?? "");
  }
  return textContent(JSON.stringify(part) ?? "");
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

const mergeSignals = (
  callerSignal: AbortSignal | undefined,
  lifecycleSignal: AbortSignal | undefined,
): AbortSignal | undefined => {
  if (!callerSignal) return lifecycleSignal;
  if (!lifecycleSignal) return callerSignal;
  return AbortSignal.any([callerSignal, lifecycleSignal]);
};

export const toWebMcpTool = (
  name: string,
  getTool: () => Tool<any, any>,
  approvalGate: WebMcpApprovalGate,
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
    const abortSignal = mergeSignals(context?.signal, lifecycleSignal);
    const toolCallId = crypto.randomUUID();
    try {
      let executeFn = tool.execute;
      if (isStandardSchema(tool.parameters)) {
        let validation = tool.parameters["~standard"].validate(args);
        if (validation instanceof Promise) validation = await validation;
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

      const decision = await approvalGate({
        toolName: name,
        tool,
        args,
        abortSignal,
      });
      if (!decision.approved) {
        if (decision.resolution === "expired") {
          return errorResult(`Tool call approval for "${name}" expired`);
        }
        if (decision.resolution === "cancelled") {
          return errorResult(`Tool call approval for "${name}" cancelled`);
        }
        return errorResult(
          `User declined tool call "${name}"${
            decision.reason ? `: ${decision.reason}` : ""
          }`,
        );
      }

      if (abortSignal?.aborted) {
        return errorResult("Tool execution was cancelled.");
      }

      const result = await executeFn?.(args, {
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
