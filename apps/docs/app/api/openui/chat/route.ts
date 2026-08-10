import { getModel } from "@/lib/ai/provider";
import { OPENUI_DEMO_INSTRUCTIONS } from "@/lib/openui-demo";
import {
  openuiToolDescriptions,
  openuiToolParameters,
} from "@/lib/openui-tools";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateGeneralChatInput } from "@/lib/validate-input";
import { frontendTools, type FrontendTools } from "@assistant-ui/react-ai-sdk";
import { toJSONSchema } from "assistant-stream";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export const maxDuration = 30;

const parameters = toJSONSchema(openuiToolParameters);

const openuiTools = {
  present_openui: {
    description: openuiToolDescriptions.present,
    parameters,
  },
  prompt_openui: {
    description: openuiToolDescriptions.prompt,
    parameters,
  },
} satisfies FrontendTools;

export async function POST(req: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const { messages } = await req.json();
    const inputError = validateGeneralChatInput(messages);
    if (inputError) return inputError;

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(messages),
      reasoning: "none",
    });

    const result = streamText({
      model: getModel(),
      system: OPENUI_DEMO_INSTRUCTIONS,
      messages: prunedMessages,
      maxOutputTokens: 8192,
      stopWhen: stepCountIs(10),
      tools: frontendTools(openuiTools),
      onError: ({ error }) => {
        console.error("[api/openui/chat]", error);
      },
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          return { modelId: part.response.modelId };
        }
        if (part.type === "finish") {
          return { usage: part.totalUsage };
        }
        return undefined;
      },
    });
  } catch (error) {
    console.error("[api/openui/chat]", error);
    return new Response("Request failed", { status: 500 });
  }
}
