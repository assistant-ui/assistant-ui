import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkDuplicateCore } from "../internal/duplicate-detection";

const KEY = Symbol.for("@assistant-ui/core.loaded");

function reset(): void {
  delete (globalThis as unknown as Record<symbol, unknown>)[KEY];
}

describe("checkDuplicateCore", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let prevEnv: string | undefined;

  beforeEach(() => {
    reset();
    prevEnv = process.env.NODE_ENV;
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    process.env.NODE_ENV = prevEnv;
    reset();
  });

  it("does not warn on the first load", () => {
    process.env.NODE_ENV = "development";
    checkDuplicateCore();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when a second copy registers in the same runtime", () => {
    process.env.NODE_ENV = "development";
    checkDuplicateCore();
    checkDuplicateCore();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/npx assistant-ui doctor/);
  });

  it("is a no-op in production", () => {
    process.env.NODE_ENV = "production";
    checkDuplicateCore();
    checkDuplicateCore();
    expect(warn).not.toHaveBeenCalled();
    expect(
      (globalThis as unknown as Record<symbol, boolean | undefined>)[KEY],
    ).toBeUndefined();
  });
});
