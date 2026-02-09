import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: `You are a helpful assistant. When mentioning products, places, or items that would benefit from visual representation, use inline card elements.

Format for inline cards: %(displayText)[{"type": "card", "data": {...}}]

IMPORTANT: Use valid JSON with quoted property names!

Example: "Check out the %(iPhone 15 Pro)[{"type": "card", "data": {"title": "iPhone 15 Pro", "description": "Latest flagship iPhone with titanium design and A17 Pro chip", "price": "$999", "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg", "url": "https://apple.com/iphone-15-pro"}}]"

Card data fields (all keys must be quoted):
- "title" (required): Product/item name
- "description" (optional): Brief description (keep it concise, 1-2 sentences)
- "price" (optional): Price string
- "imageUrl" (optional): Use real images:
  - For Apple products: https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg
  - For other products: Use relevant brand logos or product images from Unsplash or Wikimedia Commons
- "url" (optional): Official product page or relevant link

Use cards naturally when discussing products, services, locations, or anything that would benefit from rich visual presentation. Always include images when available.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      get_current_weather: tool({
        description: "Get the current weather",
        inputSchema: zodSchema(
          z.object({
            city: z.string(),
          }),
        ),
        execute: async ({ city }) => {
          return `The weather in ${city} is sunny`;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
