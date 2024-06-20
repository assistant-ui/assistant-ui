// @ts-nocheck TOOD

"use client";

import type {
  AssistantContentPart,
  TextContentPart,
} from "@assistant-ui/react";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
} from "@assistant-ui/react";
import type { ToolCallContentPart } from "@assistant-ui/react/experimental";
import { type CoreTool, type LanguageModel, streamText } from "ai";
import { convertToCoreMessage } from "./convertToCoreMessage";

// TODO multiple roundtrip support
export class VercelModelAdapter implements ChatModelAdapter {
  constructor(private readonly model: LanguageModel) {}

  async run({ messages, abortSignal, config, onUpdate }: ChatModelRunOptions) {
    const { fullStream } = await streamText({
      model: this.model,
      abortSignal,
      ...(config.system ? { system: config.system } : {}),
      messages: messages.flatMap(convertToCoreMessage),
      ...(config.tools
        ? {
            tools: config.tools as Record<string, CoreTool<any>>,
          }
        : {}),
    });

    const content: AssistantContentPart[] = [];
    for await (const aiPart of fullStream) {
      switch (aiPart.type) {
        case "text-delta": {
          let part = content.at(-1);
          if (!part || part.type !== "text") {
            part = { type: "text", text: aiPart.textDelta };
            content.push(part);
          } else {
            content[content.length - 1] = {
              ...part,
              text: part.text + aiPart.textDelta,
            };
          }
          break;
        }

        case "tool-call": {
          content.push({
            type: "tool-call",
            toolName: aiPart.toolName,
            toolCallId: aiPart.toolCallId,
            args: aiPart.args,
          });
          break;
        }

        case "tool-result": {
          const toolCall = content.findIndex(
            (c) => c.type === "tool-call" && c.toolCallId === aiPart.toolCallId,
          );
          if (toolCall === -1) {
            throw new Error(
              `Tool call ${aiPart.toolCallId} not found in the content stream. This is likely an internal bug in assistant-ui.`,
            );
          }

          content[toolCall] = {
            ...(content[toolCall] as ToolCallContentPart),
            result: aiPart.result,
          };

          break;
        }
      }

      onUpdate({ content });
    }

    return { content };
  }
}
