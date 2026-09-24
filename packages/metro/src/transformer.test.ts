import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BACKENDLESS_ENV, withAui, UPSTREAM_TRANSFORMER_ENV } from "./index";

const here = dirname(fileURLToPath(import.meta.url));
const mockUpstream = join(here, "__fixtures__/mock-upstream.cjs");

const GENERATIVE = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { db } from "@/db";
export default defineToolkit({
  weather: {
    description: "Show the weather.",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.get(city),
    render: () => null,
  },
});
`;

describe("withAui", () => {
  beforeEach(() => {
    delete process.env[BACKENDLESS_ENV];
    delete process.env[UPSTREAM_TRANSFORMER_ENV];
  });

  afterEach(() => {
    delete process.env[BACKENDLESS_ENV];
    delete process.env[UPSTREAM_TRANSFORMER_ENV];
  });

  it("points babelTransformerPath at our transformer, preserving the rest", () => {
    const config = withAui({
      projectRoot: "/app",
      transformer: {
        babelTransformerPath: "/up/stream.js",
        assetPlugins: ["x"],
      },
      resolver: { sourceExts: ["ts"] },
    });

    expect(config.transformer?.babelTransformerPath).toContain("transformer");
    expect(config.transformer?.babelTransformerPath).not.toBe("/up/stream.js");
    expect(config.transformer?.assetPlugins).toEqual(["x"]);
    expect(config.resolver).toEqual({ sourceExts: ["ts"] });
    expect(config.projectRoot).toBe("/app");
    // stashes the upstream so the worker can delegate to it
    expect(process.env[UPSTREAM_TRANSFORMER_ENV]).toBe("/up/stream.js");
  });

  it("is idempotent: a double-wrap keeps the real upstream, not the wrapper", () => {
    const once = withAui({
      aui: { backendless: true },
      transformer: { babelTransformerPath: "/up/stream.js" },
    });
    const self = once.transformer?.babelTransformerPath;

    const twice = withAui(once);
    // still points at our transformer, and the env still names the real upstream
    expect(twice.transformer?.babelTransformerPath).toBe(self);
    expect(process.env[UPSTREAM_TRANSFORMER_ENV]).toBe("/up/stream.js");
    expect(process.env[BACKENDLESS_ENV]).toBe("1");
  });

  it("clears settings left by an independently loaded config", () => {
    withAui({
      aui: { backendless: true },
      transformer: { babelTransformerPath: "/workspace-a/transformer.js" },
    });

    withAui({});

    expect(process.env[BACKENDLESS_ENV]).toBeUndefined();
    expect(process.env[UPSTREAM_TRANSFORMER_ENV]).toBeUndefined();
  });
});

describe("transformer", () => {
  beforeAll(() => {
    process.env[UPSTREAM_TRANSFORMER_ENV] = mockUpstream;
  });

  it("compiles a use-generative module to the client build by default", async () => {
    const { transform } = await import("./transformer");
    const out = transform({
      filename: "/app/toolkit.tsx",
      src: GENERATIVE,
      options: {},
    }) as { src: string };

    // client build keeps render + schema, drops the backend execute + its import
    expect(out.src).toContain("render");
    expect(out.src).toContain("z.object");
    expect(out.src).toContain('type: "backend"');
    expect(out.src).not.toContain("db.get");
    expect(out.src).not.toContain("@/db");
  });

  it("compiles to the server build for a node environment", async () => {
    const { transform } = await import("./transformer");
    const out = transform({
      filename: "/app/toolkit.tsx",
      src: GENERATIVE,
      options: { customTransformOptions: { environment: "node" } },
    }) as { src: string };

    // server build keeps the backend execute, drops render
    expect(out.src).toContain("db.get");
    expect(out.src).not.toMatch(/render\s*:/);
  });

  it("passes non-generative modules through untouched", async () => {
    const { transform } = await import("./transformer");
    const src = `export const x = 1;\n`;
    const out = transform({
      filename: "/app/x.ts",
      src,
      options: {},
    }) as { src: string };

    expect(out.src).toBe(src);
  });
});
