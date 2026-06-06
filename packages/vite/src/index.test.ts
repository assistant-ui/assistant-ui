import { describe, it, expect } from "vitest";
import { aui } from "./index";

const SRC = `"use generative";
import { defineToolkit } from "@assistant-ui/react";
export default defineToolkit({
  a: { execute: async () => 1, render: () => null },
});
`;

function run(consumer: "client" | "server", code: string, id = "/x/t.tsx") {
  const plugin = aui().find((p) => p.name === "assistant-ui:use-generative")!;
  const transform = plugin.transform as any;
  const handler =
    typeof transform === "function" ? transform : transform.handler;
  const ctx = { environment: { config: { consumer } } };
  return handler.call(ctx, code, id) as { code: string } | undefined | null;
}

describe("aui vite plugin", () => {
  it("ignores non-generative modules", () => {
    expect(run("client", "export const x = 1;\n")).toBeUndefined();
  });

  it("client environment → render kept, execute dropped, no server-only", () => {
    const out = run("client", SRC)!.code;
    expect(out).toContain("render");
    expect(out).not.toContain("execute");
    expect(out).not.toContain("server-only");
  });

  it("server environment → execute kept, render dropped, and server-only NOT injected", () => {
    const out = run("server", SRC)!.code;
    expect(out).toContain("execute");
    expect(out).not.toContain("render");
    expect(out).not.toContain("server-only");
  });

  // Vite <6 has no `this.environment`; the plugin falls back to `options.ssr`.
  it("legacy options.ssr fallback: ssr false → client build", () => {
    const plugin = aui().find((p) => p.name === "assistant-ui:use-generative")!;
    const transform = plugin.transform as any;
    const handler =
      typeof transform === "function" ? transform : transform.handler;
    const out = handler.call({}, SRC, "/x/t.tsx", { ssr: false }) as {
      code: string;
    };
    expect(out.code).toContain("render");
    expect(out.code).not.toContain("execute");
  });

  it("legacy options.ssr fallback: ssr true → server build", () => {
    const plugin = aui().find((p) => p.name === "assistant-ui:use-generative")!;
    const transform = plugin.transform as any;
    const handler =
      typeof transform === "function" ? transform : transform.handler;
    const out = handler.call({}, SRC, "/x/t.tsx", { ssr: true }) as {
      code: string;
    };
    expect(out.code).toContain("execute");
    expect(out.code).not.toContain("render");
  });
});
