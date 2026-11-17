import { openai } from "@ai-sdk/openai";
import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { AUTO_REFUND_LIMIT, formatMoney } from "../../../lib/orders";
import { refundApproval } from "../../../lib/refund-policy";
import toolkit from "../../toolkit";
import { isAllowedRequestContext } from "../request-context";
import { createScriptedModel } from "./scripted-model";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

const SYSTEM = `You help a support rep handle orders for an online store.
Call find_order before saying anything about an order.
When a refund request does not name the items, ask which ones with select_items.
Refund with issue_refund and the item ids find_order returned. The server prices the refund and holds anything over ${formatMoney(AUTO_REFUND_LIMIT)} for the rep's approval, so never ask for approval in text.
If a refund is denied, say that nothing was refunded and ask what to do instead.
Keep replies to one or two sentences. The cards already show the order and the refund.`;

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const aiSDKTools = await aiToolkit.tools();

  const result = streamText({
    abortSignal: req.signal,
    model: process.env.OPENAI_API_KEY
      ? openai("gpt-6-luna")
      : createScriptedModel(),
    system: SYSTEM,
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
    stopWhen: stepCountIs(8),
    toolApproval: { issue_refund: refundApproval },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
