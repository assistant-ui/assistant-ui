import { afterEach, describe, expect, it, vi } from "vitest";
import { createAssistantStream } from "./assistant-stream";
import { createTextStreamController, type TextStreamController } from "./text";

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

describe("TextStreamController after consumer cancel", () => {
  it("closes without throwing", async () => {
    const [stream, controller] = createTextStreamController();
    await stream.cancel();
    expect(() => controller.close()).not.toThrow();
  });

  it("closes without throwing with strict: false", async () => {
    const [stream, controller] = createTextStreamController({ strict: false });
    await stream.cancel();
    expect(() => controller.close()).not.toThrow();
  });

  it("closes a text part without throwing after the reader cancels", async () => {
    let part!: TextStreamController;
    const stream = createAssistantStream((controller) => {
      part = controller.addTextPart();
      part.append("hello");
    });
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel("consumer stopped");
    expect(() => part.close()).not.toThrow();
  });
});
