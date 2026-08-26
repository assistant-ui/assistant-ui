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

export const errorResult = (message: string): WebMcpCallToolResult => ({
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
  if (result instanceof ToolResponse) {
    const content = result.modelContent
      ? result.modelContent.map(mapModelContentPart)
      : primitiveContent(result.result);
    return result.isError ? { isError: true, content } : { content };
  }
  if (options.tool.toModelOutput) {
    const parts = await options.tool.toModelOutput({
      toolCallId: options.toolCallId,
      input: options.args,
      output: result,
    });
    return { content: parts.map(mapModelContentPart) };
  }
  return { content: primitiveContent(result) };
};

export const toWebMcpTool = (
  name: string,
  tool: Tool<any, any>,
  approvalGate: WebMcpApprovalGate,
): WebMcpToolDescriptor => ({
  name,
  description: tool.description ?? "",
  inputSchema: toWebMcpInputSchema(tool),
  execute: async (rawArgs, context) => {
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    const abortSignal = context?.signal;
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

    const toolCallId = crypto.randomUUID();
    try {
      const result = await tool.execute?.(args, {
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
