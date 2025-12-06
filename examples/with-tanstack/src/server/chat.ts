import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatInput = {
  messages: ChatMessage[];
};

export const chatStream = createServerFn({ method: "POST" })
  .inputValidator((data: ChatInput) => data)
  .handler(async function* ({ data }) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: data.messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  });
