import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools, type FrontendTools } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { EFFORTS, ROUTE_MODEL } from "@/lib/models";

export const maxDuration = 60;

const SYSTEM = `You are a coding agent in a chat. Answer briefly and concretely. Show code in fenced blocks with the language named. You cannot read or change files or run commands here, so say what you would do and what to run.`;

const OPENAI_MODEL = /^openai\/([a-z0-9][a-z0-9._:-]{0,63})$/;

const bodySchema = z.object({
  messages: z.array(
    z.looseObject({ role: z.string(), parts: z.array(z.unknown()) }),
  ),
  system: z.string().optional(),
  tools: z.record(z.string(), z.unknown()).optional(),
  config: z
    .looseObject({
      modelName: z.string().optional(),
      reasoningEffort: z.string().optional(),
    })
    .optional(),
  metadata: z
    .looseObject({
      custom: z
        .looseObject({
          modelName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a chat request.", {
      status: 400,
    });
  }
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }

  const messages = body.data.messages as unknown as UIMessage[];
  const tools = body.data.tools as FrontendTools | undefined;
  const { system, config } = body.data;

  // The composer's model is `config.modelName`. A regenerate names its own
  // model for this run; an empty name asks for the route's model.
  const override = body.data.metadata?.custom?.modelName;
  const requested =
    override === undefined
      ? config?.modelName
      : override === ""
        ? undefined
        : override;
  const named = requested === undefined ? null : OPENAI_MODEL.exec(requested);
  if (requested !== undefined && !named) {
    return new Response(
      "This route runs OpenAI models only. Choose one in the settings, under Models.",
      { status: 400 },
    );
  }
  const model = named?.[1] ?? ROUTE_MODEL;
  const reasoningEffort = EFFORTS.find(
    (entry) => entry.value === config?.reasoningEffort,
  )?.value;

  const aiSDKTools = frontendTools(tools ?? {});
  const result = streamText({
    abortSignal: req.signal,
    model: createOpenAI({ apiKey })(model),
    system: system ? `${SYSTEM}\n\n${system}` : SYSTEM,
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
    stopWhen: stepCountIs(8),
    ...(reasoningEffort && {
      providerOptions: { openai: { reasoningEffort } },
    }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // The last step's usage is what the context holds now.
      messageMetadata: ({ part }) =>
        part.type === "finish-step" ? { usage: part.usage } : undefined,
      onError: (error) =>
        error instanceof Error ? error.message : "The model request failed.",
    }),
  });
}
