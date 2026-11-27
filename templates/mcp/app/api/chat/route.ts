import { openai } from "@ai-sdk/openai";
import { type ToolSet, streamText, convertToModelMessages } from "ai";
import {
  answersToolApproval,
  readChatRequest,
  toolApprovalSecret,
} from "../chat-request";
import { getMcpTools } from "../mcp-client";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

async function getMCPTools(): Promise<ToolSet> {
  try {
    return await getMcpTools();
  } catch (e) {
    console.warn("Failed to connect to MCP server:", e);
    return {};
  }
}

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const request = await readChatRequest(req);
  if ("error" in request) {
    return Response.json({ error: request.error }, { status: 400 });
  }
  const { messages, system } = request;

  // MCP tools run on this server, so an approval answer must be signed.
  const approvalSecret = toolApprovalSecret();
  if (approvalSecret === undefined && answersToolApproval(messages)) {
    return Response.json(
      { error: "Set TOOL_APPROVAL_SECRET to use tool approvals." },
      { status: 500 },
    );
  }

  const mcpTools = await getMCPTools();
  const aiSDKTools = {
    ...mcpTools,
    ...request.frontendTools,
  };

  const result = streamText({
    abortSignal: req.signal,
    model: openai.responses("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    system,
    tools: aiSDKTools,
    experimental_toolApprovalSecret: approvalSecret,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: "auto",
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
