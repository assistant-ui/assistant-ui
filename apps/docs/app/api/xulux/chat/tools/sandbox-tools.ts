import { tool, zodSchema } from "ai";
import z from "zod";
import {
  fetchPreviewUrl,
  provisionSandbox,
  type SandboxExec,
} from "../../blaxel-sandbox";

export function createSandboxTools({
  sessionId,
}: {
  sessionId: string | undefined;
}) {
  let sandboxExec: SandboxExec | null = null;

  return {
    provisionSandbox: tool({
      description:
        "Provision (or resume) the cloud sandbox for this session. Call this once before using exec.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!sessionId) {
          return { error: "No sessionId provided in the request body." };
        }
        try {
          const sandbox = await provisionSandbox(sessionId);
          sandboxExec = sandbox.exec;
          return {
            status: "ready",
            workingDir: "/workspace",
            previewUrl: sandbox.previewUrl,
          };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),
    refreshCanvas: tool({
      description:
        "Fetch the live preview URL from the sandbox and return it to the client to refresh the canvas. Call after starting the dev server or making changes.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!sessionId) return { error: "No sessionId in request." };
        try {
          const url = await fetchPreviewUrl(sessionId);
          return { url };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),
    exec: tool({
      description:
        "Run a shell command in the live sandbox. Use this to read/write files, install deps, start servers, etc. " +
        "The sandbox does not have Python, lsof, or pkill pre-installed. Prefer Node-based file edits in Node apps. " +
        "Before cat/heredoc file writes, create all parent folders so missing directories do not cause partial writes.",
      inputSchema: zodSchema(
        z.object({
          command: z.string().describe("Shell command to run."),
          cwd: z
            .string()
            .optional()
            .describe("Working directory (default: /workspace)."),
        }),
      ),
      execute: async ({ command, cwd }) => {
        if (!sandboxExec) {
          return { error: "Call provisionSandbox first." };
        }
        return sandboxExec(command, cwd);
      },
    }),
  };
}
