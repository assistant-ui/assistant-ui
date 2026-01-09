import { z } from "zod";
import {
  ToolUIIdSchema,
  ToolUIReceiptSchema,
  ToolUIRoleSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
  parseWithSchema,
} from "../shared";

export const CodeBlockPropsSchema = z.object({
  id: ToolUIIdSchema,
  role: ToolUIRoleSchema.optional(),
  receipt: ToolUIReceiptSchema.optional(),
  code: z.string(),
  language: z.string().default("text"),
  filename: z.string().optional(),
  showLineNumbers: z.boolean().default(true),
  highlightLines: z.array(z.number()).optional(),
  maxCollapsedLines: z.number().min(1).optional(),
  responseActions: z
    .union([z.array(SerializableActionSchema), SerializableActionsConfigSchema])
    .optional(),
  className: z.string().optional(),
});

export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema> & {
  isLoading?: boolean;
  onResponseAction?: (actionId: string) => void | Promise<void>;
  onBeforeResponseAction?: (actionId: string) => boolean | Promise<boolean>;
};

export const SerializableCodeBlockSchema = CodeBlockPropsSchema.omit({
  className: true,
});

export type SerializableCodeBlock = z.infer<typeof SerializableCodeBlockSchema>;

export function parseSerializableCodeBlock(
  input: unknown,
): SerializableCodeBlock {
  return parseWithSchema(SerializableCodeBlockSchema, input, "CodeBlock");
}
