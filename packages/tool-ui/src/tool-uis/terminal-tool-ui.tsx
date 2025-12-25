"use client";

import { makeToolUI } from "../factories/make-tool-ui";
import { Terminal } from "../components/terminal";
import { SerializableTerminalSchema } from "../schemas/terminal";

/**
 * Pre-built tool UI for terminal/command output tools.
 *
 * Expected tool args shape:
 * - command: string
 * - output?: string
 * - exitCode?: number
 *
 * @example
 * ```tsx
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <TerminalToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export const TerminalToolUI = makeToolUI({
  toolName: "run_command",
  schema: SerializableTerminalSchema,
  render: ({ data, status }) => (
    <Terminal {...data} isLoading={status.type === "running"} />
  ),
  transform: (args: unknown) => {
    const a = args as Record<string, unknown>;
    return {
      id: `terminal-${Date.now()}`,
      command: (a["command"] ?? "") as string,
      output: a["output"] as string | undefined,
      exitCode: a["exitCode"] as number | undefined,
      cwd: a["cwd"] as string | undefined,
      footerActions: a["footerActions"] as unknown,
    };
  },
});
