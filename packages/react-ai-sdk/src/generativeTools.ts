import { jsonSchema, type ToolSet } from "ai";
import { toJSONSchema, type ToolJSONSchema } from "assistant-stream";
import type { Toolkit, ToolkitDeclaration } from "@assistant-ui/core/react";
import { defaultToModelOutput, frontendTools } from "./frontendTools";

const EMPTY_SCHEMA = { type: "object" as const, properties: {} };

const humanNotSupported = (): never => {
  throw new Error(
    "`human()` is not available during server-side tool execution.",
  );
};

// AI SDK leaves `abortSignal` optional; assistant-ui's execute requires one.
const neverAbort = new AbortController().signal;

export interface GenerativeToolsOptions {
  /**
   * The server build of a generative toolkit (schema + server `execute`). Typed
   * as the canonical {@link Toolkit} so callers don't need to cast; the server
   * build carries `execute`, recovered internally as {@link ToolkitDeclaration}.
   */
  toolkit: Toolkit;
  /**
   * Tools uploaded by the frontend (the request body's `tools`). Merged in
   * alongside the `toolkit`; a server `execute` from `toolkit` takes precedence
   * over an uploaded entry of the same name.
   */
  frontendTools?: Record<string, ToolJSONSchema>;
}

/**
 * Builds an AI SDK `ToolSet` for server-side use with `streamText` /
 * `generateText` from a generative `toolkit` and the frontend-uploaded tools.
 *
 * Each toolkit tool's `execute` runs on the server. Pair this with the
 * `"use generative"` compiler: import the toolkit in a server route (where it
 * resolves to the server build — schema + `execute`, with `render` stripped) and
 * pass it here. Tools without an `execute` are still exposed to the model but
 * left for the client to fulfill. `frontendTools` lets the client contribute
 * tools that aren't in the static toolkit.
 *
 * @example
 * ```ts
 * const { tools } = await req.json();
 * streamText({
 *   model,
 *   messages,
 *   tools: generativeTools({ toolkit: docsToolkit, frontendTools: tools }),
 * });
 * ```
 */
export const generativeTools = (options: GenerativeToolsOptions): ToolSet => ({
  ...(options.frontendTools ? frontendTools(options.frontendTools) : {}),
  // `toolkit` last so its server-side `execute` wins over an uploaded entry of
  // the same name. The cast recovers the declaration shape — the server build
  // carries `execute`, which the canonical `Toolkit` type erases.
  ...toServerToolSet(options.toolkit as ToolkitDeclaration),
});

const toServerToolSet = (toolkit: ToolkitDeclaration): ToolSet =>
  Object.fromEntries(
    Object.entries(toolkit)
      .filter(([, t]) => !t.disabled)
      .map(([name, t]) => {
        const execute = t.execute;
        return [
          name,
          {
            ...(t.description !== undefined && { description: t.description }),
            inputSchema: jsonSchema(
              t.parameters ? toJSONSchema(t.parameters) : EMPTY_SCHEMA,
            ),
            toModelOutput: defaultToModelOutput,
            ...(t.providerOptions && { providerOptions: t.providerOptions }),
            ...(execute && {
              execute: (
                args: unknown,
                callOptions: { toolCallId: string; abortSignal?: AbortSignal },
              ) =>
                execute(args as never, {
                  toolCallId: callOptions.toolCallId,
                  abortSignal: callOptions.abortSignal ?? neverAbort,
                  human: humanNotSupported,
                }),
            }),
          },
        ];
      }),
  ) as ToolSet;
