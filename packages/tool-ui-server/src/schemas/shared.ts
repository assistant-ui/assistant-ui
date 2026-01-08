import { z } from "zod";
import type { ReactNode } from "react";
import { SecuritySchemeSchema } from "./oauth";

/**
 * Schema for tool UI identity.
 *
 * Every tool UI should have a unique identifier that:
 * - Is stable across re-renders
 * - Is meaningful (not auto-generated)
 * - Is unique within the conversation
 *
 * Format recommendation: `{component-type}-{semantic-identifier}`
 * Examples: "data-table-expenses-q3", "option-list-deploy-target"
 */
export const ToolUIIdSchema = z.string().min(1);

export type ToolUIId = z.infer<typeof ToolUIIdSchema>;

export const ActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  confirmLabel: z.string().optional(),
  variant: z
    .enum(["default", "destructive", "secondary", "ghost", "outline"])
    .optional(),
  icon: z.custom<ReactNode>().optional(),
  loading: z.boolean().optional(),
  disabled: z.boolean().optional(),
  shortcut: z.string().optional(),
});

export type Action = z.infer<typeof ActionSchema>;

export const ActionButtonsPropsSchema = z.object({
  actions: z.array(ActionSchema).min(1),
  align: z.enum(["left", "center", "right"]).optional(),
  confirmTimeout: z.number().positive().optional(),
  className: z.string().optional(),
});

export const SerializableActionSchema = ActionSchema.omit({ icon: true });
export const SerializableActionsSchema = ActionButtonsPropsSchema.extend({
  actions: z.array(SerializableActionSchema),
}).omit({ className: true });

export type ActionsConfig = {
  items: Action[];
  align?: "left" | "center" | "right" | undefined;
  confirmTimeout?: number | undefined;
};

export const SerializableActionsConfigSchema = z.object({
  items: z.array(SerializableActionSchema).min(1),
  align: z.enum(["left", "center", "right"]).optional(),
  confirmTimeout: z.number().positive().optional(),
});

export type SerializableActionsConfig = z.infer<
  typeof SerializableActionsConfigSchema
>;

export type SerializableAction = z.infer<typeof SerializableActionSchema>;

// Tool invocation messages schemas for ChatGPT Apps SDK compatibility
export const ToolInvocationMessagesSchema = z.object({
  invoking: z.string().max(64).optional(),
  invoked: z.string().max(64).optional(),
});

// Tool metadata schemas for ChatGPT Apps SDK compatibility
export const ToolMetadataSchema = z.object({
  visibility: z.enum(["private", "public"]).optional(),
  widgetAccessible: z.boolean().optional(),
  fileParams: z.array(z.string()).optional(),
  securitySchemes: z.array(SecuritySchemeSchema).optional(),
});

// Tool annotations schemas aligned with ChatGPT Apps SDK API
export const ToolAnnotationsSchema = z.object({
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  completionMessage: z.string().optional(),
});

export type ToolInvocationMessages = z.infer<
  typeof ToolInvocationMessagesSchema
>;
export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;
export type ToolAnnotations = z.infer<typeof ToolAnnotationsSchema>;
