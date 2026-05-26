import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GLOBAL_KEY = Symbol.for("@assistant-ui/core.versions");

function clearRegistry(): void {
  delete (globalThis as unknown as Record<symbol, unknown>)[GLOBAL_KEY];
}

async function loadFreshModule(): Promise<
  typeof import("../internal/duplicate-detection")
> {
  vi.resetModules();
  return await import("../internal/duplicate-detection");
}

describe("duplicate-detection", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    clearRegistry();
    originalNodeEnv = process.env.NODE_ENV;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
    clearRegistry();
  });

  it("registers the local PACKAGE_VERSION on first call", async () => {
    process.env.NODE_ENV = "development";
    const mod = await loadFreshModule();
    const { PACKAGE_VERSION } = await import("../internal/version");

    mod.registerCoreVersion();

    const registry = (
      globalThis as unknown as Record<symbol, Set<string> | undefined>
    )[GLOBAL_KEY];
    expect(registry).toBeDefined();
    expect(registry?.has(PACKAGE_VERSION)).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns when a second, different version registers into the same runtime", async () => {
    process.env.NODE_ENV = "development";

    (globalThis as unknown as Record<symbol, Set<string>>)[GLOBAL_KEY] =
      new Set<string>(["0.0.0-foreign"]);

    const mod = await loadFreshModule();
    mod.registerCoreVersion();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0]![0] as string;
    expect(msg).toContain("Multiple versions of @assistant-ui/core");
    expect(msg).toContain("0.0.0-foreign");
    expect(msg).toContain("npx assistant-ui doctor");
  });

  it("warns only once per process even if registerCoreVersion is called repeatedly", async () => {
    process.env.NODE_ENV = "development";

    (globalThis as unknown as Record<symbol, Set<string>>)[GLOBAL_KEY] =
      new Set<string>(["0.0.0-foreign"]);

    const mod = await loadFreshModule();
    mod.registerCoreVersion();
    mod.registerCoreVersion();
    mod.registerCoreVersion();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("does not warn when only the local version is registered", async () => {
    process.env.NODE_ENV = "development";
    const mod = await loadFreshModule();
    mod.registerCoreVersion();
    mod.registerCoreVersion();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does nothing in production mode", async () => {
    process.env.NODE_ENV = "production";

    const registry = new Set<string>(["0.0.0-foreign"]);
    (globalThis as unknown as Record<symbol, Set<string>>)[GLOBAL_KEY] =
      registry;

    const mod = await loadFreshModule();
    mod.registerCoreVersion();

    expect(warnSpy).not.toHaveBeenCalled();
    // The current version should NOT have been added either.
    expect(registry.has("0.0.0-foreign")).toBe(true);
    expect(registry.size).toBe(1);
  });
});

describe("version constant", () => {
  it("matches package.json#version", async () => {
    const { PACKAGE_VERSION } = await import("../internal/version");
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, "../../package.json"), "utf8"),
    );
    expect(PACKAGE_VERSION).toBe(pkg.version);
  });
});
