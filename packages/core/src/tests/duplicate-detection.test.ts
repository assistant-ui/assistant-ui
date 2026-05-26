import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkDuplicateCore } from "../internal/duplicate-detection";

const KEY = Symbol.for("@assistant-ui/core.loaded");

function reset(): void {
  delete (globalThis as unknown as Record<symbol, unknown>)[KEY];
}

describe("checkDuplicateCore", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reset();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    reset();
  });

  it("does not warn on the first load", () => {
    checkDuplicateCore();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when a second copy registers in the same runtime", () => {
    checkDuplicateCore();
    checkDuplicateCore();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/npx assistant-ui doctor/);
  });
});
