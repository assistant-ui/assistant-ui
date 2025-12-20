import { beforeAll } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_DIR } from "../../constants.js";
import { docsTools } from "../docs.js";
import { examplesTools } from "../examples.js";

const tools = {
  assistantUIDocs: docsTools,
  assistantUIExamples: examplesTools,
};

export const testContext = {
  callTool: async (name: string, args: any) => {
    const tool = tools[name as keyof typeof tools];
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    const result = await tool.execute(args);

    const text = result.content?.[0]?.text;
    if (text === undefined) {
      throw new Error(`Tool ${name} returned no content`);
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(
        `Tool ${name} returned invalid JSON. Output: ${text}\nParse error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};

beforeAll(() => {
  const docsPath = join(PACKAGE_DIR, ".docs");
  if (!existsSync(docsPath)) {
    throw new Error("Documentation not prepared. Run: pnpm build");
  }
});
