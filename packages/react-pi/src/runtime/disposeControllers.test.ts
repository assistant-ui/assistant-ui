import { describe, expect, it, vi } from "vitest";
import { disposeControllers } from "./disposeControllers";

describe("disposeControllers", () => {
  it("disposes every controller before rethrowing the first error", () => {
    const cleanupError = new Error("first cleanup failed");
    const first = {
      dispose: vi.fn(() => {
        throw cleanupError;
      }),
    };
    const second = { dispose: vi.fn() };

    expect(() => disposeControllers([first, second])).toThrow(cleanupError);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
  });
});
