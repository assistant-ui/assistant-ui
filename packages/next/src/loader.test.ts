import { describe, expect, it } from "vitest";
import generativeLoader from "./loader";

const runLoader = (
  resourcePath: string,
  source: string,
  options?: { path?: string },
) =>
  new Promise<string>((resolve, reject) => {
    generativeLoader.call(
      {
        resourcePath,
        getOptions: () => options,
        async: () => (error, code) => {
          if (error) reject(error);
          else resolve(code ?? "");
        },
      },
      source,
    );
  });

describe("generativeLoader", () => {
  it.each([
    "bundler-redirect.server-tools.ts",
    "bundler-redirect.client-view.tsx",
    "bundler-redirect.server.ts",
    "bundler-redirect.client.tsx",
    "bundler-redirect.server.js",
    "bundler-redirect.client.js",
  ])("treats %s as an ordinary user module", async (filename) => {
    const result = await runLoader(
      `/app/${filename}`,
      '"use generative"; export default {};',
    );

    expect(result).toContain("@assistant-ui/next/bundler-redirect/");
  });

  it("recognizes the package indirection module", async () => {
    const result = await runLoader(
      "/node_modules/@assistant-ui/next/dist/bundler-redirect.server.js",
      "",
      { path: "/app/tool.ts" },
    );

    expect(result).toContain("/app/tool.ts?generative-env=server");
  });

  it("recognizes an indirection resource when a host keeps its query", async () => {
    const result = await runLoader(
      "/node_modules/@assistant-ui/next/dist/bundler-redirect.client.js?aui=token",
      "",
      { path: "/app/tool.ts" },
    );

    expect(result).toContain("/app/tool.ts?generative-env=client");
  });
});
