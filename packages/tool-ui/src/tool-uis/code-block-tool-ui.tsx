"use client";

import { makeToolUI } from "../factories/make-tool-ui";
import { CodeBlock } from "../components/code-block";
import { SerializableCodeBlockSchema } from "../schemas/code-block";

/**
 * Pre-built tool UI for code display tools.
 *
 * Expected tool args shape:
 * - code: string
 * - language?: string
 * - filename?: string
 *
 * @example
 * ```tsx
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <CodeBlockToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export const CodeBlockToolUI = makeToolUI({
  toolName: "show_code",
  schema: SerializableCodeBlockSchema,
  render: ({ data, status }) => (
    <CodeBlock {...data} isLoading={status.type === "running"} />
  ),
  transform: (args: unknown) => {
    const a = args as Record<string, unknown>;
    return {
      id: `code-${a["filename"] ?? Date.now()}`,
      code: (a["code"] ?? a["content"] ?? "") as string,
      language: (a["language"] ?? "text") as string,
      filename: a["filename"] as string | undefined,
      showLineNumbers: (a["showLineNumbers"] ?? true) as boolean,
      highlightLines: a["highlightLines"] as number[] | undefined,
      maxCollapsedLines: a["maxCollapsedLines"] as number | undefined,
      footerActions: a["footerActions"] as unknown,
    };
  },
});
