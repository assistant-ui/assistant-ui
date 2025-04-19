import { z } from "zod";
import { JSONSchema7 } from "json-schema";

export const LanguageModelV1FunctionToolSchema = z.object({
  type: z.literal("function"),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.custom<JSONSchema7>(
    (val) => typeof val === "object" && val !== null,
  ),
});

export const TextContentPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ImageContentPartSchema = z.object({
  type: z.literal("image"),
  image: z.string(),
});

export const FileContentPartSchema = z.object({
  type: z.literal("file"),
  data: z.string(),
  mimeType: z.string(),
});

export const Unstable_AudioContentPart = z.object({
  type: z.literal("audio"),
  audio: z.object({
    data: z.string(),
    format: z.union([z.literal("mp3"), z.literal("wav")]),
  }),
});

export const CoreToolCallContentPartSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  result: z.unknown().optional(),
  isError: z.boolean().optional(),
});

export const CoreUserMessageSchema = z.object({
  role: z.literal("user"),
  content: z
    .array(
      z.discriminatedUnion("type", [
        TextContentPartSchema,
        ImageContentPartSchema,
        FileContentPartSchema,
        Unstable_AudioContentPart,
      ]),
    )
    .min(1)
    .readonly(),
});

export const CoreAssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z
    .array(
      z.discriminatedUnion("type", [
        TextContentPartSchema,
        CoreToolCallContentPartSchema,
      ]),
    )
    .min(1)
    .readonly(),
});

export const CoreSystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.tuple([TextContentPartSchema]).readonly(),
});

export const CoreMessageSchema = z.discriminatedUnion("role", [
  CoreSystemMessageSchema,
  CoreUserMessageSchema,
  CoreAssistantMessageSchema,
]);

export const LanguageModelV1CallSettingsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  seed: z.number().int().optional(),
  headers: z.record(z.string().optional()).optional(),
});

export const LanguageModelConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  modelName: z.string().optional(),
});
