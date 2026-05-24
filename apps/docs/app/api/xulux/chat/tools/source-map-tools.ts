import { readFileSync } from "node:fs";
import path from "node:path";
import { createBashTool } from "bash-tool";
import { tool, zodSchema } from "ai";
import z from "zod";

const SOURCE_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "generated",
  "source-snapshot.json",
);

function loadSourceSnapshot(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(SOURCE_SNAPSHOT_PATH, "utf-8")) as Record<
      string,
      string
    >;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.warn(
        `Missing source snapshot at ${SOURCE_SNAPSHOT_PATH}; repo tools will be unavailable until generate:docs runs.`,
      );
      return {};
    }

    throw error;
  }
}

const SOURCE_SNAPSHOT = loadSourceSnapshot();

export function createSourceMapTools() {
  let bashToolkitPromise: Promise<
    Awaited<ReturnType<typeof createBashTool>>
  > | null = null;

  const getBashToolkit = () => {
    if (!bashToolkitPromise) {
      bashToolkitPromise = createBashTool({
        files: SOURCE_SNAPSHOT,
        destination: "/repo",
        maxFiles: 5000,
        maxOutputLength: 15000,
      });
    }
    return bashToolkitPromise;
  };

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
