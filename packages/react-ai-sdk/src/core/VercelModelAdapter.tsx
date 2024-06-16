"use client";

import type {
  AssistantContentPart,
  ChatModelAdapter,
  ChatModelRunOptions,
  TextContentPart,
} from "@assistant-ui/react/experimental";
import { type LanguageModel, streamText } from "ai";

export class VercelModelAdapter implements ChatModelAdapter {
  constructor(private readonly model: LanguageModel) {}

  async run({ messages, abortSignal, onUpdate }: ChatModelRunOptions) {
    const { fullStream } = await streamText({
      model: this.model,
      abortSignal,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content.filter((c): c is TextContentPart => c.type !== "ui"),
      })),
    });

    const content: AssistantContentPart[] = [];
    for await (const aiPart of fullStream) {
      switch (aiPart.type) {
        case "text-delta": {
          let part = content.at(-1);
          if (!part || part.type !== "text") {
            part = { type: "text", text: "" };
            content.push(part);
          }
          part.text += aiPart.textDelta;
          break;
        }
        // TODO tool results
        case "tool-call": {
          content.push({
            type: "tool-call",
            name: aiPart.toolName,
            args: aiPart.args,
          });
          break;
        }
      }

      onUpdate({ content });
    }

    return { content };
  }
}
