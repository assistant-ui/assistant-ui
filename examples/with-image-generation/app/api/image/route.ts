import { openai } from "@ai-sdk/openai";
import { generateImage } from "ai";

export const maxDuration = 60;

// 1x1 transparent PNG, returned as a stand-in when no OPENAI_API_KEY is set so
// the example runs without credentials.
const MOCK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export async function POST(req: Request) {
  const { prompt, size, seed } = (await req.json()) as {
    prompt?: string;
    size?: `${number}x${number}`;
    seed?: number;
  };
  if (!prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({
      image: MOCK_IMAGE,
      mimeType: "image/png",
      metadata: { revisedPrompt: `${prompt} (mock)` },
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
  )?.openai;
  const revisedPrompt = openaiMeta?.revisedPrompt;
  return Response.json({
    image: `data:${result.image.mediaType};base64,${result.image.base64}`,
    mimeType: result.image.mediaType,
    metadata: {
      ...(typeof revisedPrompt === "string" && { revisedPrompt }),
    },
  });
}
