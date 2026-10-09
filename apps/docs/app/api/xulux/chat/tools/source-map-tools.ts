import { createRepoSandbox } from "@/lib/repo-sandbox";
import { tool, zodSchema } from "ai";
import z from "zod";

export function createSourceMapTools() {
  const getBashToolkit = createRepoSandbox({ toolPrompt: "" });

  return {
    inspectSourceMap: tool({
      description:
        "Execute bash commands in the /repo inside the sourcemap containing the assistant-ui monorepo.\n",
      inputSchema: zodSchema(
        z.object({
          command: z
            .string()
            .describe("The bash command to execute from the /repo directory."),
        }),
      ),
      execute: async ({ command }, options) => {
        const { tools } = await getBashToolkit();
        return tools.bash.execute!({ command }, options);
      },
    }),
    readSourceMapFile: tool({
      description:
        "Read the contents of a source file from the /repo inside the sourcemap.",
      inputSchema: zodSchema(
        z.object({
          path: z
            .string()
            .describe("The repo-relative file path to read from /repo."),
        }),
      ),
      execute: async ({ path }, options) => {
        const { tools } = await getBashToolkit();
        return tools.readFile.execute!({ path }, options);
      },
    }),
  };
}
