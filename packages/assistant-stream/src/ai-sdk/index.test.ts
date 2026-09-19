import { beforeEach, describe, expect, it, vi } from "vitest";

const loaded = vi.hoisted(() => ({ ai: false }));

vi.mock("ai", async (importOriginal) => {
  loaded.ai = true;
  const actual = await importOriginal<typeof import("ai")>();
  // vitest throws on reading an export the mock lacks; ai@6 has no uploadFile.
  return {
    ...actual,
    uploadFile: (actual as { uploadFile?: unknown }).uploadFile,
  };
});

describe("ai-sdk entry", () => {
  beforeEach(() => {
    vi.resetModules();
    loaded.ai = false;
  });

  it("keeps `ai` out of the root entry's module graph", async () => {
    await import("../index");

    expect(loaded.ai).toBe(false);
  });

  it("keeps `ai` out of the internal entry's module graph", async () => {
    await import("../internal");

    expect(loaded.ai).toBe(false);
  });

  it("loads `ai` only through the ai-sdk subpath", async () => {
    const entry = await import("./index");

    expect(loaded.ai).toBe(true);
    expect(typeof entry.frontendTools).toBe("function");
  });
});
