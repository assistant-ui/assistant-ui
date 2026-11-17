import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  frontendTools,
  injectQuoteContext,
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
import { connection } from "next/server";
import {
  findModel,
  findProvider,
  MODELS,
  PROVIDERS,
  type Provider,
  type ProviderId,
} from "@/lib/models";

export const maxDuration = 60;

const SYSTEM = `You are the writing assistant inside a document editor.

The user's document is the "document" interactable: a title and an ordered list of blocks, each with an id, a type and text. Its current state is added to the conversation whenever it changes, so always work from the latest one.

- To change the document, call update_document. Change only what the user asked for and leave every other block exactly as it is.
- When a message quotes a passage, the request is about that passage. Edit only the block that holds it, and keep the rest of that block's text.
- Block text takes inline formatting only: **bold**, *italic*, ~~strikethrough~~, \`code\`, [label](url), <u>underline</u> and <mark>highlight</mark>.
- To give feedback without changing the text, add comments with update_comments.
- After a tool call, reply in one or two short sentences that say what you changed. Never paste the document or the new text into the chat.`;

const keyFor = (provider: Provider, headers: Headers) =>
  headers.get(provider.header)?.trim() || process.env[provider.envVar];

const languageModel = (provider: ProviderId, apiKey: string, model: string) => {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
  }
};

// A passage highlighted in the document travels as the message's quote, with
// the id of the block it sits in where a chat quote carries a message id.
const notePassageBlock = (messages: UIMessage[]): UIMessage[] =>
  messages.map((message) => {
    if (message.role !== "user") return message;
    const quote = (
      message.metadata as
        | { custom?: { quote?: { messageId?: unknown } } }
        | undefined
    )?.custom?.quote;
    if (typeof quote?.messageId !== "string") return message;
    return {
      ...message,
      parts: [
        {
          type: "text" as const,
          text: `The quoted passage is highlighted in block "${quote.messageId}" of the document.\n\n`,
        },
        ...message.parts,
      ],
    };
  });

export async function GET() {
  await connection();
  return Response.json({
    providers: PROVIDERS.filter(({ envVar }) => process.env[envVar]).map(
      ({ id }) => id,
    ),
  });
}

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    config,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: FrontendTools;
    config?: { modelName?: string };
  } = await req.json();

  const model =
    findModel(config?.modelName) ??
    MODELS.find(({ provider }) =>
      keyFor(findProvider(provider), req.headers),
    ) ??
    MODELS[0]!;
  const provider = findProvider(model.provider);
  const apiKey = keyFor(provider, req.headers);
  if (!apiKey) {
    return new Response(
      `No ${provider.name} key is set. Add one with the key button at the top of the page.`,
      { status: 401 },
    );
  }

  const aiSDKTools = frontendTools(tools ?? {});
  const result = streamText({
    abortSignal: req.signal,
    model: languageModel(provider.id, apiKey, model.id),
    system: system ? `${SYSTEM}\n\n${system}` : SYSTEM,
    messages: await convertToModelMessages(
      unstable_injectInteractableContext(
        injectQuoteContext(notePassageBlock(messages)),
      ),
      { tools: aiSDKTools },
    ),
    tools: aiSDKTools,
    stopWhen: stepCountIs(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : "The model request failed.",
    }),
  });
}
