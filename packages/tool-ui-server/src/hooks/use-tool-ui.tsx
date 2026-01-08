"use client";

import { useAssistantToolUI } from "@assistant-ui/react";
import type { z } from "zod";

export interface ToolUIRegistration<
  TSchema extends z.ZodType,
  TResult = unknown,
> {
  toolName: string;
  schema: TSchema;
  component: React.ComponentType<{
    data: z.infer<TSchema>;
    result?: TResult | undefined;
    status: { type: string };
    onAction?: ((actionId: string) => void) | undefined;
  }>;
  /**
   * Transform raw tool args/result into component props.
   * Defaults to passing args directly.
   */
  transform?:
    | ((args: unknown, result?: TResult) => z.infer<TSchema>)
    | undefined;
  /**
   * Handler for component actions (e.g., button clicks).
   * If provided, this will be passed to the component as the onAction prop.
   */
  onAction?: ((actionId: string) => void) | undefined;
}

/**
 * Register a tool-ui component for rendering tool calls.
 *
 * @example
 * ```tsx
 * useToolUI({
 *   toolName: "show_code",
 *   schema: CodeBlockPropsSchema,
 *   component: CodeBlock,
 *   transform: (args) => ({
 *     id: `code-${args.filename}`,
 *     code: args.content,
 *     language: args.language,
 *     filename: args.filename,
 *   }),
 * });
 * ```
 */
export function useToolUI<TSchema extends z.ZodType, TResult = unknown>(
  registration: ToolUIRegistration<TSchema, TResult>,
) {
  const {
    toolName,
    schema,
    component: Component,
    transform,
    onAction,
  } = registration;

  useAssistantToolUI({
    toolName,
    render: ({ args, result, status }) => {
      // Transform or pass through
      const rawData = transform ? transform(args, result as TResult) : args;

      // Validate with schema
      const parseResult = schema.safeParse(rawData);
      if (!parseResult.success) {
        return (
          <div className="tool-ui-error">
            <p>Invalid tool data for {toolName}</p>
            <pre>{parseResult.error.message}</pre>
          </div>
        );
      }

      return (
        <Component
          data={parseResult.data}
          result={result as TResult}
          status={status}
          onAction={onAction}
        />
      );
    },
  });
}
