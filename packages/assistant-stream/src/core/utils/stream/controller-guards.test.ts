import { describe, expect, it } from "vitest";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { closeIfOpen, enqueueIfOpen } from "./controller-guards";

const chunk: AssistantStreamChunk = { type: "part-finish", path: [] };

const cancelledController = () => {
  let controller!: ReadableStreamDefaultController<AssistantStreamChunk>;
  void new ReadableStream<AssistantStreamChunk>({
    start(c) {
      controller = c;
    },
  }).cancel();
  return controller;
};

describe("controller guards", () => {
  it("swallows enqueue on a cancelled controller", () => {
    expect(() => cancelledController().enqueue(chunk)).toThrow(TypeError);
    expect(() => enqueueIfOpen(cancelledController(), chunk)).not.toThrow();
  });

  it("swallows close on a cancelled controller", () => {
    expect(() => cancelledController().close()).toThrow(TypeError);
    expect(() => closeIfOpen(cancelledController())).not.toThrow();
  });

  it("rethrows errors that are not the closed-controller signal", () => {
    const boom = new Error("boom");
    expect(() =>
      enqueueIfOpen(
        {
          enqueue() {
            throw boom;
          },
        },
        chunk,
      ),
    ).toThrow(boom);
    expect(() =>
      closeIfOpen({
        close() {
          throw boom;
        },
      }),
    ).toThrow(boom);
  });
});
