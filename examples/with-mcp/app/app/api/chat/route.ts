import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import { convertToModelMessages, streamText } from "ai";

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

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages, system, tools } = await req.json();
  const aiSDKTools = { ...frontendTools(tools) };
  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    system,
    tools: aiSDKTools,
  });
  return result.toUIMessageStreamResponse();
}
