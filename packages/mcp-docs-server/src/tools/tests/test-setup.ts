import { beforeAll, afterAll } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { PACKAGE_DIR } from "../../constants.js";
import { docsTools } from "../docs.js";
import { examplesTools } from "../examples.js";

export interface TestContext {
  callTool: (name: string, args: any) => Promise<any>;
}

const tools = {
  assistantUIDocs: docsTools,
  assistantUIExamples: examplesTools,
};

export const testContext: TestContext = {
  callTool: async (name: string, args: any) => {
    const tool = tools[name as keyof typeof tools];
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    const result = await tool.execute(args);

    try {
      return JSON.parse(result.content[0].text);
    } catch (error) {
      throw new Error(
        `Tool ${name} returned invalid JSON. Output: ${result.content[0].text}\nParse error: ${error instanceof Error ? error.message : String(error)}`,
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

afterAll(() => {
  // Cleanup if needed
});
