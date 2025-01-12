import { JSONSchema7 } from "json-schema";
import {
  LanguageModelConfigSchema,
  LanguageModelV1CallSettingsSchema,
} from "../../types/ModelConfigTypes";
import { z } from "zod";

const LanguageModelV1FunctionToolSchema = z.object({
  type: z.literal("function"),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.custom<JSONSchema7>(
    (val) => typeof val === "object" && val !== null,
  ),
});

const TextContentPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const ImageContentPartSchema = z.object({
  type: z.literal("image"),
  image: z.string(),
});

const FileContentPartSchema = z.object({
  type: z.literal("file"),
  data: z.string(),
  mimeType: z.string(),
});

const Unstable_AudioContentPart = z.object({
  type: z.literal("audio"),
  audio: z.object({
    data: z.string(),
    format: z.union([z.literal("mp3"), z.literal("wav")]),
  }),
});

const CoreToolCallContentPartSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  result: z.unknown().optional(),
  isError: z.boolean().optional(),
});
// args is required but unknown;

const CoreUserMessageSchema = z.object({
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

const CoreAssistantMessageSchema = z.object({
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

const CoreSystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.tuple([TextContentPartSchema]).readonly(),
});

const CoreMessageSchema = z.discriminatedUnion("role", [
  CoreSystemMessageSchema,
  CoreUserMessageSchema,
  CoreAssistantMessageSchema,
]);

export const EdgeRuntimeRequestOptionsSchema = z
  .object({
    system: z.string().optional(),
    messages: z.array(CoreMessageSchema).min(1).readonly(),
    runConfig: z
      .object({
        custom: z.record(z.unknown()).optional(),
      })
      .optional(),
    tools: z.array(LanguageModelV1FunctionToolSchema).readonly().optional(),
    unstable_assistantMessageId: z.string().optional(),
  })
  .merge(LanguageModelV1CallSettingsSchema)
  .merge(LanguageModelConfigSchema);

export type EdgeRuntimeRequestOptions = z.infer<
  typeof EdgeRuntimeRequestOptionsSchema
>;
