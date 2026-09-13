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
  ])("does not treat %s as a package indirection", async (filename) => {
    const result = await runLoader(
      `/app/${filename}`,
      '"use generative"; export default {};',
      { path: "/app/tool.ts" },
    );

    expect(result).toContain("@assistant-ui/next/bundler-redirect/");
  });

  it.each(["bundler-redirect.server.js", "bundler-redirect.client.js"])(
    "treats user module %s as ordinary without the generated path option",
    async (filename) => {
      const result = await runLoader(
        `/app/${filename}`,
        '"use generative"; export default {};',
      );

      expect(result).toContain("@assistant-ui/next/bundler-redirect/");
    },
  );

  it.each([
    ["server", "server"],
    ["client", "client"],
  ] as const)(
    "recognizes the package %s indirection module",
    async (name, target) => {
      const result = await runLoader(
        `/node_modules/@assistant-ui/next/dist/bundler-redirect.${name}.js`,
        "",
        { path: "/app/tool.ts" },
      );

      expect(result).toContain(`/app/tool.ts?generative-env=${target}`);
    },
  );
});
