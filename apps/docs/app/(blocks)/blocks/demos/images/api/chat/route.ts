import { z } from "zod";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import data from "../../data.json";

export const maxDuration = 300;

const API = "https://api.openai.com/v1/images";
const PROVIDER = "openai/";

/*
 * A picture's sides are multiples of 16. The larger sizes stay within the
 * 2560 by 1440 pixels the model makes without its experimental mode.
 */
const SIZES = {
  standard: {
    "1:1": "1024x1024",
    "2:3": "1024x1536",
    "3:2": "1536x1024",
    "16:9": "1536x864",
    "9:16": "864x1536",
  },
  large: {
    "1:1": "1920x1920",
    "2:3": "1536x2304",
    "3:2": "2304x1536",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
  },
} as const;

/* The plus menu's settings as they arrive; one that is missing or unknown falls back to where the menu starts. */
const settingsSchema = z.object({
  model: z.string().catch(`${PROVIDER}${data.model}`),
  orientation: z
    .enum(["auto", "1:1", "2:3", "3:2", "16:9", "9:16"])
    .catch("auto"),
  size: z.enum(["standard", "large"]).catch("standard"),
  quality: z.enum(["low", "medium", "high"]).catch("medium"),
  complexity: z.enum(["auto", "low", "medium", "high"]).catch("auto"),
  count: z.coerce.number().int().min(1).max(4).catch(1),
  format: z.enum(["webp", "png", "jpeg"]).catch("webp"),
  background: z.enum(["auto", "opaque", "transparent"]).catch("auto"),
  moderation: z.enum(["auto", "low"]).catch("auto"),
  partials: z.coerce.number().int().min(0).max(3).catch(0),
  /** A change sent from the editor: to the picture alone, with a drawing over it, or within a brushed area. */
  edit: z.enum(["plain", "markup", "mask"]).optional().catch(undefined),
});

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
  metadata: z.looseObject({ custom: z.unknown().optional() }).nullish(),
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

const usageSchema = z
  .object({
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
  })
  .nullish();

/* What the Images API sends: one answer holding every picture, or, when streamed, an event for each partial and each finished one. */
const answerSchema = z.object({
  data: z.array(z.object({ b64_json: z.string() })),
  usage: usageSchema,
});

const eventSchema = z.object({
  type: z.string(),
  b64_json: z.string().optional(),
  usage: usageSchema,
  error: z.object({ message: z.string().optional() }).optional(),
});

const errorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    code: z.string().nullish(),
  }),
});

class Blocked extends Error {}

/* The events of a streamed answer, one for each `data:` line. */
async function* eventsOf(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffered += done ? "\n" : decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: {")) continue;
      const event = eventSchema.safeParse(JSON.parse(line.slice(5)));
      if (event.success) yield event.data;
    }
    if (done) return;
  }
}

export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response(
      'Making pictures is switched off here. Set BLOCKS_LIVE_API to "true" to turn it on.',
      { status: 404 },
    );
  }
  const key = process.env["OPENAI_API_KEY"];
  if (!key) {
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
  const settings = settingsSchema.parse(metadata?.custom ?? {});
  if (!settings.model.startsWith(PROVIDER)) {
    return new Response(
      `This route holds an OpenAI key, and ${settings.model} runs somewhere else. Add a call for its provider to use it.`,
      { status: 400 },
    );
  }
  const attached = picturesOf(request);
  // The editor names its own picture: the first one attached, with the drawing or the brushed area second.
  const [source, overlay] = settings.edit ? attached : [];
  // Otherwise the next picture starts from the newest one in the chat, which a follow-up changes, and any attached with the request.
  const pictures = settings.edit
    ? attached.slice(0, 1)
    : [
        ...picturesOf(
          messages.findLast((message) => message.role === "assistant"),
        ).slice(-1),
        ...attached,
      ].slice(0, 4);
  if (settings.edit && !source) {
    return new Response("The change has no picture to start from.", {
      status: 400,
    });
  }
  const count = settings.edit ? 1 : settings.count;
  const mediaType = `image/${settings.format}`;
  // The API streams one picture at a time, so several arrive together with no partial ones.
  const partials = count === 1 ? settings.partials : 0;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });

      const response = await fetch(
        `${API}/${pictures.length > 0 ? "edits" : "generations"}`,
        {
          method: "POST",
          signal: req.signal,
          headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: settings.model.slice(PROVIDER.length),
            prompt: asked.slice(0, 8000),
            n: count,
            // With no orientation, the model picks the shape and the size.
            size:
              settings.orientation === "auto"
                ? "auto"
                : SIZES[settings.size][settings.orientation],
            quality: settings.quality,
            moderation: settings.moderation,
            // A JPEG has no transparency.
            background:
              settings.format === "jpeg" &&
              settings.background === "transparent"
                ? "auto"
                : settings.background,
            output_format: settings.format,
            ...(settings.format !== "png" && { output_compression: 85 }),
            ...(settings.complexity !== "auto" && {
              complexity: settings.complexity,
            }),
            ...(partials > 0 && { stream: true, partial_images: partials }),
            ...(pictures.length > 0 && {
              images: pictures.map((image_url) => ({ image_url })),
            }),
            ...(overlay &&
              settings.edit !== "plain" &&
              settings.edit && {
                [settings.edit]: { image_url: overlay },
              }),
          }),
        },
      );

      try {
        if (!response.ok || !response.body) {
          const failure = errorSchema.safeParse(
            await response.json().catch(() => undefined),
          );
          const { message, code } = failure.data?.error ?? {};
          if (code === "moderation_blocked") throw new Blocked();
          throw new Error(message ?? `The model answered ${response.status}.`);
        }

        const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        const count = (used: z.infer<typeof usageSchema>) => {
          usage.inputTokens += used?.input_tokens ?? 0;
          usage.outputTokens += used?.output_tokens ?? 0;
          usage.totalTokens += used?.total_tokens ?? 0;
        };
        const finished = (base64: string) =>
          writer.write({
            type: "file",
            url: `data:${mediaType};base64,${base64}`,
            mediaType,
          });

        if (partials > 0) {
          for await (const event of eventsOf(response.body)) {
            if (event.type === "error")
              throw new Error(
                event.error?.message ?? "The picture could not be made.",
              );
            if (!event.b64_json) continue;
            if (event.type.endsWith(".partial_image")) {
              // One part under one id, so each partial picture takes the place of the last.
              writer.write({
                type: "data-partial",
                id: "partial",
                data: { url: `data:${mediaType};base64,${event.b64_json}` },
              });
            } else if (event.type.endsWith(".completed")) {
              finished(event.b64_json);
              count(event.usage);
            }
          }
        } else {
          const answer = answerSchema.parse(await response.json());
          for (const picture of answer.data) finished(picture.b64_json);
          count(answer.usage);
        }

        writer.write({ type: "message-metadata", messageMetadata: { usage } });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      } catch (error) {
        if (!(error instanceof Blocked)) throw error;
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish", finishReason: "content-filter" });
      }
    },
    onError: (error) =>
      error instanceof Error ? error.message : "The picture could not be made.",
  });

  return createUIMessageStreamResponse({ stream });
}
