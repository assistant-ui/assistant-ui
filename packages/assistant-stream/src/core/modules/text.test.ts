import { afterEach, describe, expect, it, vi } from "vitest";
import { createTextStreamController } from "./text";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TextStreamController", () => {
  it("throws when appending after close", () => {
    const [stream, controller] = createTextStreamController();
    void stream;
    controller.close();
    expect(() => controller.append("late")).toThrow();
  });

  it("drops appends after close with strict: false", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const [stream, controller] = createTextStreamController({ strict: false });
    void stream;
    controller.close();
    expect(() => controller.append("late")).not.toThrow();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
