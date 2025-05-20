import { z } from "zod";
import {
  LanguageModelConfigSchema,
  LanguageModelV1CallSettingsSchema,
  LanguageModelV1FunctionToolSchema,
  CoreMessageSchema,
} from "./schemas";

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
    state: z.unknown().optional(),
  })
  .merge(LanguageModelV1CallSettingsSchema)
  .merge(LanguageModelConfigSchema);

export type EdgeRuntimeRequestOptions = z.infer<
  typeof EdgeRuntimeRequestOptionsSchema
>;
