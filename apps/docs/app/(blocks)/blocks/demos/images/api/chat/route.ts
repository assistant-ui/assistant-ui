import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateImage,
} from "ai";
import data from "../../data.json";

export const maxDuration = 300;

const MODEL = data.model;

/* A picture's sides are multiples of 16; "auto" leaves the choice to the model. */
const SIZES = {
  "1:1": "1024x1024",
  "2:3": "1024x1536",
  "3:2": "1536x1024",
  "16:9": "1536x864",
  "9:16": "864x1536",
} as const;

const QUALITIES = ["low", "medium", "high"] as const;

const partSchema = z.looseObject({
  type: z.string(),
  text: z.string().optional(),
  url: z.string().optional(),
  mediaType: z.string().optional(),
});

const bodySchema = z.object({
  messages: z
    .array(z.looseObject({ role: z.string(), parts: z.array(partSchema) }))
    .min(1),
  metadata: z
    .looseObject({
      custom: z
        .looseObject({
          ratio: z.string().optional(),
          quality: z.string().optional(),
        })
        .optional(),
    })
    .nullish(),
});

type Message = z.infer<typeof bodySchema>["messages"][number];

const textOf = (message: Message | undefined) =>
  (message?.parts ?? [])
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n")
    .trim();

const picturesOf = (message: Message | undefined) =>
  (message?.parts ?? []).flatMap((part) =>
    part.type === "file" &&
    part.mediaType?.startsWith("image/") &&
    part.url?.startsWith("data:")
      ? [part.url]
      : [],
  );

export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response(
      'Making pictures is switched off here. Set BLOCKS_LIVE_API to "true" to turn it on.',
      { status: 404 },
    );
  }
  if (!process.env["OPENAI_API_KEY"]) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a picture request.", {
      status: 400,
    });
  }

  const { messages, metadata } = body.data;
  const request = messages.findLast((message) => message.role === "user");
  const asked = textOf(request);
  if (!asked) {
    return new Response("Describe the picture first.", { status: 400 });
  }
  const options = metadata?.custom ?? {};
  const text = asked.slice(0, 8000);
  const size = SIZES[options.ratio as keyof typeof SIZES];
  const quality =
    QUALITIES.find((entry) => entry === options.quality) ?? "medium";
  // What the next picture starts from: the newest one in the chat, which a follow-up changes, and any attached with the request.
  const pictures = [
    ...picturesOf(
      messages.findLast((message) => message.role === "assistant"),
    ).slice(-1),
    ...picturesOf(request),
  ].slice(0, 4);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      const { image, usage } = await generateImage({
        abortSignal: req.signal,
        model: openai.image(MODEL),
        prompt: pictures.length > 0 ? { images: pictures, text } : text,
        ...(size && { size }),
        providerOptions: {
          openai: { quality, output_format: "webp", output_compression: 85 },
        },
      });
      writer.write({
        type: "file",
        url: `data:${image.mediaType};base64,${image.base64}`,
        mediaType: image.mediaType,
      });
      writer.write({ type: "message-metadata", messageMetadata: { usage } });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
    onError: (error) =>
      error instanceof Error ? error.message : "The picture could not be made.",
  });

  return createUIMessageStreamResponse({ stream });
}
