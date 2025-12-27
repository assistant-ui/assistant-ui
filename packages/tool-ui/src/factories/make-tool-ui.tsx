"use client";

import * as React from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import type { z } from "zod";

export interface MakeToolUIOptions<TSchema extends z.ZodType, TResult = unknown> {
  toolName: string;
  schema: TSchema;
  render: React.ComponentType<{
    data: z.infer<TSchema>;
    result?: TResult | undefined;
    status: { type: string };
    addResult: (result: TResult) => void;
    onAction?: ((actionId: string) => void) | undefined;
  }>;
  /**
   * Transform raw tool args into component props.
   * The returned value will be validated against the schema.
   */
  transform?: ((args: unknown, result?: TResult) => unknown) | undefined;
  fallback?: React.ReactNode | undefined;
}

/**
 * Create a self-registering tool UI component.
 *
 * @example
 * ```tsx
 * const CodeBlockToolUI = makeToolUI({
 *   toolName: "show_code",
 *   schema: CodeBlockPropsSchema,
 *   render: ({ data, status }) => (
 *     <CodeBlock {...data} isLoading={status.type === "running"} />
 *   ),
 * });
 *
 * // Use in app:
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <CodeBlockToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export function makeToolUI<TSchema extends z.ZodType, TResult = unknown>(
  options: MakeToolUIOptions<TSchema, TResult>,
) {
  const {
    toolName,
    schema,
    render: RenderComponent,
    transform,
    fallback,
  } = options;

  return makeAssistantToolUI({
    toolName,
    render: ({ args, result, status, addResult }) => {
      const rawData = transform ? transform(args, result as TResult) : args;

      const parseResult = schema.safeParse(rawData);
      if (!parseResult.success) {
        if (fallback) return <>{fallback}</>;
        return (
          <div className="tool-ui-validation-error">
            <p>Schema validation failed for {toolName}</p>
            <details>
              <summary>Error details</summary>
              <pre>{JSON.stringify(parseResult.error.format(), null, 2)}</pre>
            </details>
          </div>
        );
      }

      return (
        <RenderComponent
          data={parseResult.data}
          result={result as TResult}
          status={status}
          addResult={addResult as (result: TResult) => void}
        />
      );
    },
  });
}
