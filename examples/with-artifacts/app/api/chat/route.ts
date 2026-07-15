import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import {
  AISDKToolkit,
  unstable_injectInteractableContext,
  type AISDKToolkitToolsOptions,
} from "@assistant-ui/react-ai-sdk";
import toolkit from "../../toolkit";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

type FrontendToolDefs = NonNullable<AISDKToolkitToolsOptions["frontend"]>;

export async function POST(req: Request) {
  const {
    messages,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    tools?: FrontendToolDefs;
  } = await req.json();

  const tools = await aiToolkit.tools({
    ...(clientTools && { frontend: clientTools }),
  });

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    system:
      "You create functional HTML artifacts. When the user requests a webpage, interface, visualization, or other visual content, call the artifact tool with a short title and a complete HTML document. When an artifact already exists and the user requests a change, call update_artifact with its id and only the fields that changed. Do not put artifact HTML in a code block.",
    messages: await convertToModelMessages(
      unstable_injectInteractableContext(messages),
    ),
    stopWhen: stepCountIs(10),
    tools,
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
