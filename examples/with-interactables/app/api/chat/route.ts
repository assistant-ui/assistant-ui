import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  frontendTools,
  type FrontendTools,
  unstable_injectInteractableContext,
} from "@assistant-ui/ai-sdk";

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

export const maxDuration = 30;

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
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: FrontendTools;
  } = await req.json();

  const aiSDKTools = clientTools ? frontendTools(clientTools) : undefined;
  const modelMessages = await convertToModelMessages(
    unstable_injectInteractableContext(messages),
    aiSDKTools ? { tools: aiSDKTools } : {},
  );

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    ...(aiSDKTools ? { tools: aiSDKTools } : {}),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
