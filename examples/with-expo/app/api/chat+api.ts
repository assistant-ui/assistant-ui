import { frontendTools } from "@assistant-ui/ai-sdk";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

// Refuses cross-origin browser requests so another origin cannot spend this app's model key or drive its tools. This is not authentication: add your own before you deploy the app publicly.
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

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { messages, tools } = body;

  const model = openai("gpt-6-luna");

  const aiSDKTools = frontendTools(tools);
  const prunedMessages = pruneMessages({
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    reasoning: "none",
  });

  const result = streamText({
    abortSignal: req.signal,
    model,
    messages: prunedMessages,
    maxOutputTokens: 15000,
    stopWhen: stepCountIs(10),
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse();
}
