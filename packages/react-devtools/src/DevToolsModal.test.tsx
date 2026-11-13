/// <reference types="node" />
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevToolsModal } from "./DevToolsModal";

describe("DevToolsModal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(renderToString(<DevToolsModal />)).toBe("");
  });

  it("reads NODE_ENV as a literal process.env member, the only form Vite and other bundlers without a browser process global replace", () => {
    const source = readFileSync(
      new URL("./DevToolsModal.tsx", import.meta.url),
      "utf-8",
    );
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).not.toMatch(/typeof process|process\??\.env\?\./);
  });
});
