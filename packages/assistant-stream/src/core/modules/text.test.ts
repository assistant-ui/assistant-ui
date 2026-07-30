import { describe, expect, it } from "vitest";
import { createTextStreamController } from "./text";

describe("TextStreamController", () => {
  it("enqueues text-replace chunks", async () => {
    const [stream, controller] = createTextStreamController();
    const chunks: unknown[] = [];
    const drain = stream.pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );

    controller.replace("replacement");
    controller.close();

    await drain;
    expect(chunks).toEqual([
      { type: "text-replace", path: [], text: "replacement" },
      { type: "part-finish", path: [] },
    ]);
  });
});
