import { z } from "zod";
import {
  ToolUIIdSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
} from "./shared";

export const CodeBlockPropsSchema = z.object({
  id: ToolUIIdSchema,
  code: z.string(),
  language: z.string().default("text"),
  filename: z.string().optional(),
  showLineNumbers: z.boolean().default(true),
  highlightLines: z.array(z.number()).optional(),
  maxCollapsedLines: z.number().min(1).optional(),
  footerActions: z
    .union([z.array(SerializableActionSchema), SerializableActionsConfigSchema])
    .optional(),
  className: z.string().optional(),
});

export type CodeBlockProps = z.infer<typeof CodeBlockPropsSchema> & {
  isLoading?: boolean;
  onFooterAction?: (actionId: string) => void | Promise<void>;
  onBeforeFooterAction?: (actionId: string) => boolean | Promise<boolean>;
};

export const SerializableCodeBlockSchema = CodeBlockPropsSchema.omit({
  className: true,
});

export type SerializableCodeBlock = z.infer<typeof SerializableCodeBlockSchema>;

export function parseSerializableCodeBlock(
  input: unknown,
): SerializableCodeBlock {
  const res = SerializableCodeBlockSchema.safeParse(input);
  if (!res.success) {
    throw new Error(`Invalid CodeBlock payload: ${res.error.message}`);
  }
  return res.data;
}
