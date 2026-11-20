import { openai } from "@ai-sdk/openai";
import {
  frontendTools,
  unstable_injectInteractableContext,
  type FrontendTools,
} from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

export const maxDuration = 60;

const SYSTEM = `You are the writing assistant inside a document editor.

The open page is the "document" interactable: a title and an ordered list of blocks, each with an id, a type and text. Its current state is added to the conversation whenever it changes, so always work from the latest one.

- To change the page, call update_document. Change only what the user asked for and leave every other block exactly as it is.
- Block text takes inline formatting only: **bold**, *italic*, ~~strikethrough~~, \`code\` and <u>underline</u>.
- To give feedback without changing the text, add comments with update_comments.
- After a tool call, reply in one or two short sentences that say what you changed. Never paste the page or the new text into the chat.`;

type ChatRequest = {
  messages: UIMessage[];
  system?: string;
  tools?: FrontendTools;
};

export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response("Not found", { status: 404 });
  }

  const { messages, system, tools }: ChatRequest = await req.json();
  const aiSDKTools = frontendTools(tools ?? {});

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    system: system ? `${SYSTEM}\n\n${system}` : SYSTEM,
    messages: await convertToModelMessages(
      unstable_injectInteractableContext(messages),
      { tools: aiSDKTools },
    ),
    tools: aiSDKTools,
    stopWhen: stepCountIs(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
