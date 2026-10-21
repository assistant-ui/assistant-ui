import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const routeFiles = [
  "templates/nuxt/server/api/chat.post.ts",
  "examples/with-nuxt/server/api/chat.post.ts",
  "apps/docs/content/docs/vue/quickstart.mdx",
  "apps/docs/content/docs/vue/ssr.mdx",
  "apps/docs/content/docs/vue/(runtimes)/ai-sdk.mdx",
  "apps/docs/content/docs/vue/(guides)/model-context.mdx",
  "apps/docs/content/docs/vue/(guides)/reasoning.mdx",
  "apps/docs/content/docs/vue/(guides)/tools.mdx",
];

describe("Nuxt chat route cancellation examples", () => {
  it("passes a response-close signal to every streamText call", () => {
    for (const relativePath of routeFiles) {
      const source = readFileSync(path.join(ROOT, relativePath), "utf8");
      const handlerStart = source.indexOf(
        "export default defineEventHandler(async (event) => {",
      );
      const controllerStart = source.indexOf(
        "const abortController = new AbortController();",
        handlerStart,
      );
      const bodyRead = source.indexOf("await readBody", handlerStart);
      const streamTextCall = source.match(
        /const result = streamText\(\{([\s\S]*?)\n\s*\}\);/,
      );

      expect(handlerStart, relativePath).toBeGreaterThanOrEqual(0);
      expect(controllerStart, relativePath).toBeGreaterThan(handlerStart);
      expect(controllerStart, relativePath).toBeLessThan(bodyRead);
      expect(source, relativePath).toContain(
        'event.node.res.on("close", () => {',
      );
      expect(source, relativePath).toContain(
        "if (!event.node.res.writableFinished) {",
      );
      expect(source, relativePath).toContain("abortController.abort();");
      expect(streamTextCall?.[1], relativePath).toContain(
        "abortSignal: abortController.signal,",
      );
    }
  });
});
