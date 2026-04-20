import { openai } from "@ai-sdk/openai";
import { createMockImageAdapter } from "@assistant-ui/react-ai-sdk";
import { generateImage } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt, size, seed } = (await req.json()) as {
    prompt?: string;
    size?: `${number}x${number}`;
    seed?: number;
  };
  if (!prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  if (!process.env["OPENAI_API_KEY"]) {
    const mock = createMockImageAdapter({
      delayMs: 400,
      revisedPrompt: (p) => `${p} (mock)`,
    });
    const result = await mock.generate(prompt, {
      ...(size && { size }),
      ...(seed !== undefined && { seed }),
    });
    return Response.json({
      image: result.image,
      mimeType: result.mimeType,
      metadata: result.metadata,
    });
  }

  const result = await generateImage({
    model: openai.image("gpt-image-1"),
    prompt,
    ...(size && { size }),
    ...(seed !== undefined && { seed }),
  });
  const openaiMeta = (
    result.providerMetadata as
      | Record<string, Record<string, unknown>>
      | undefined
  )?.["openai"];
  const revisedPrompt = openaiMeta?.["revisedPrompt"];
  return Response.json({
    image: `data:${result.image.mediaType};base64,${result.image.base64}`,
    mimeType: result.image.mediaType,
    metadata: {
      ...(typeof revisedPrompt === "string" && { revisedPrompt }),
    },
  });
}
