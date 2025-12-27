import { z } from "zod";
import {
  ToolUIIdSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
} from "./shared";

export const TerminalPropsSchema = z.object({
  id: ToolUIIdSchema,
  command: z.string(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  exitCode: z.number(),
  durationMs: z.number().optional(),
  cwd: z.string().optional(),
  truncated: z.boolean().optional(),
  maxCollapsedLines: z.number().min(1).optional(),
  footerActions: z
    .union([z.array(SerializableActionSchema), SerializableActionsConfigSchema])
    .optional(),
  className: z.string().optional(),
});

export type TerminalProps = z.infer<typeof TerminalPropsSchema> & {
  isLoading?: boolean;
  onFooterAction?: (actionId: string) => void | Promise<void>;
  onBeforeFooterAction?: (actionId: string) => boolean | Promise<boolean>;
};

export const SerializableTerminalSchema = TerminalPropsSchema.omit({
  className: true,
});

export type SerializableTerminal = z.infer<typeof SerializableTerminalSchema>;

export function parseSerializableTerminal(
  input: unknown,
): SerializableTerminal {
  const res = SerializableTerminalSchema.safeParse(input);
  if (!res.success) {
    throw new Error(`Invalid Terminal payload: ${res.error.message}`);
  }
  return res.data;
}
