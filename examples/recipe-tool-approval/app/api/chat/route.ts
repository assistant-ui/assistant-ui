import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

const orders = new Map([
  ["A-1001", { item: "Noise-cancelling headphones", total: 199 }],
  ["A-1002", { item: "USB-C dock", total: 89 }],
]);

const tools = {
  lookupOrder: tool({
    description: "Look up an order by its id.",
    inputSchema: z.object({ orderId: z.string() }),
    execute: async ({ orderId }) =>
      orders.get(orderId) ?? { error: `No order ${orderId}` },
  }),
  refundOrder: tool({
    description: "Refund an order in full.",
    inputSchema: z.object({ orderId: z.string(), reason: z.string() }),
    needsApproval: true,
    execute: async ({ orderId }) => {
      const order = orders.get(orderId);
      if (!order) return { error: `No order ${orderId}` };
      return { refunded: order.total, orderId };
    },
  }),
};

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  // Signs each approval request, so a client cannot forge an approved call.
  const approvalSecret = process.env.TOOL_APPROVAL_SECRET;
  if (!approvalSecret || approvalSecret.length < 32) {
    throw new Error("Set TOOL_APPROVAL_SECRET to at least 32 characters.");
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    system:
      "You are a support agent for an online store. Look up an order before you refund it.",
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(5),
    experimental_toolApprovalSecret: approvalSecret,
  });

  return result.toUIMessageStreamResponse();
}
