import { openai } from "@ai-sdk/openai";
import {
  AISDKToolkit,
  type AISDKToolkitToolsOptions,
} from "@assistant-ui/ai-sdk";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import toolkit from "../../toolkit";

// Refuses chat requests that a browser sends from another site, so a page the
// visitor opens cannot spend this app's model key. This is not authentication:
// add your own before you deploy the route publicly.
function isAllowedRequestContext(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = req.headers.get("origin");
  if (origin === null) return true;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: NonNullable<AISDKToolkitToolsOptions["frontend"]>;
  } = await req.json();

  const aiSDKTools = await aiToolkit.tools({
    ...(tools && { frontend: tools }),
  });
  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse();
}
